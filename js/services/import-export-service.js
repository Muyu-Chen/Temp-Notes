/**
 * 导入导出流程服务
 */

import { clearDraftItemId, saveDraft } from "../storage/draft-storage.js";
import { saveDraftAttachments } from "../storage/draft-attachments-storage.js";
import { saveItems } from "../storage/item-storage.js";
import { loadRecording, saveRecording } from "../storage/recording-storage.js";
import {
  downloadBlobFile,
  downloadTextFile,
  formatExportTimestamp,
  getTextExportPayload,
} from "../lib/download-utils.js";
import {
  collectAttachmentMetadata,
  exportData,
  mergeRecycleItems,
  mergeItems,
  normalizeImportedData,
  pruneMissingRecordingReferences,
} from "../storage/import-export-storage.js";
import { createZipBlob, decodeZipTextEntry, readZipEntries } from "../lib/zip-utils.js";

const NOTES_JSON_PATH = "notes.json";

const getRecordingZipPath = (attachment) =>
  `recordings/${encodeURIComponent(attachment.id)}.${attachment.ext || "webm"}`;

const isZipFile = (file) =>
  /\.zip$/i.test(file?.name || "") ||
  ["application/zip", "application/x-zip-compressed"].includes(file?.type);

const getJsonImportLabel = (data) => (Number(data?.version) >= 2 ? "JSON" : "旧版 JSON");

export class ImportExportService {
  constructor(app) {
    this.app = app;
  }

  async exportAll() {
    const { app } = this;
    try {
      const payload = exportData(app.dom.getDraftValue(), app.items, {
        recycle: app.recycleService.getRecycleItems(),
        draftAttachments: app.currentDraftAttachments,
      });
      const entries = [{ name: NOTES_JSON_PATH, data: "" }];
      let missingRecordingCount = 0;
      const recordings = [];

      for (const attachment of collectAttachmentMetadata(payload)) {
        const record = await loadRecording(attachment.id);
        if (!record?.blob) {
          missingRecordingCount += 1;
          continue;
        }
        recordings.push({
          id: attachment.id,
          transcription: record.transcription,
        });

        entries.push({
          name: getRecordingZipPath(attachment),
          data: record.blob,
        });
      }

      payload.recordings = recordings;
      const json = JSON.stringify(payload, null, 2);
      entries[0].data = json;

      const zipBlob = await createZipBlob(entries);
      downloadBlobFile(
        zipBlob,
        `tempnotes-export-${formatExportTimestamp()}.zip`
      );

      app.ui.showToast(
        missingRecordingCount > 0
          ? `已导出 ZIP，${missingRecordingCount} 个录音文件缺失`
          : "已导出 ZIP"
      );
    } catch (error) {
      console.error("导出失败", error);
      app.ui.showToast("导出失败");
    }
  }

  importAll() {
    const { app } = this;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json,application/zip,.zip";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      try {
        if (isZipFile(file)) {
          await this.importZipFile(file);
          return;
        }

        const text = await file.text();
        const data = JSON.parse(text);
        await this.applyImportedData(data, { sourceLabel: getJsonImportLabel(data) });
      } catch (error) {
        console.error("导入失败", error);
        app.ui.showToast(`导入失败：${error.message || "文件格式不正确"}`);
      }
    };
    input.click();
  }

  async importZipFile(file) {
    const zipEntries = await readZipEntries(file);
    const notesEntry = zipEntries.get(NOTES_JSON_PATH);
    if (!notesEntry) {
      throw new Error("ZIP 中缺少 notes.json");
    }

    const data = JSON.parse(decodeZipTextEntry(notesEntry));
    const normalized = normalizeImportedData(data);
    if (!normalized.valid) {
      this.app.ui.showToast("导入失败：数据格式不正确");
      return;
    }

    const importedRecordingIds = await this.importRecordingsFromZip(zipEntries, normalized);
    const missingRecordingCount =
      collectAttachmentMetadata(normalized).length - importedRecordingIds.length;
    const prunedData = pruneMissingRecordingReferences(normalized, importedRecordingIds);

    await this.applyImportedData(prunedData, {
      sourceLabel: "ZIP",
      missingRecordingCount,
      alreadyNormalized: true,
    });
  }

  async importRecordingsFromZip(zipEntries, normalizedData) {
    const importedIds = [];
    const transcriptionById = new Map(
      (Array.isArray(normalizedData.recordings) ? normalizedData.recordings : []).map((recording) => [
        recording.id,
        recording.transcription,
      ])
    );

    for (const attachment of collectAttachmentMetadata(normalizedData)) {
      const entry = zipEntries.get(getRecordingZipPath(attachment));
      if (!entry) continue;

      const blob = new Blob([entry.data], { type: attachment.mimeType });
      await saveRecording({
        id: attachment.id,
        blob,
        mimeType: attachment.mimeType,
        size: blob.size,
        durationMs: attachment.durationMs,
        createdAt: attachment.createdAt,
        transcription: transcriptionById.get(attachment.id),
      });
      importedIds.push(attachment.id);
    }

    return importedIds;
  }

  async applyImportedData(data, { sourceLabel = "JSON", missingRecordingCount = 0, alreadyNormalized = false } = {}) {
    const { app } = this;
    const normalized = alreadyNormalized ? data : normalizeImportedData(data);
    const {
      draft: importedDraft,
      draftAttachments: importedDraftAttachments,
      items: importedItems,
      recycle: importedRecycle,
      valid,
    } = normalized;

    if (!valid) {
      app.ui.showToast("导入失败：数据格式不正确");
      return;
    }

    const previousItemCount = app.items.length;
    const previousRecycleCount = app.recycleService.getRecycleItems().length;
    app.items = mergeItems(app.items, importedItems);
    app.recycleService.deletedItems = mergeRecycleItems(
      app.recycleService.getRecycleItems(),
      importedRecycle
    );

    const hasImportedDraft = importedDraft.trim() || importedDraftAttachments.length > 0;
    const overwrite =
      hasImportedDraft &&
      confirm(
        "是否用导入文件中的 draft 覆盖当前草稿？\n\n选择\"取消\"将保留当前草稿，仅导入条目。"
      );
    if (overwrite) {
      app.stopDraftAttachmentPlayback?.();
      app.dom.setDraftValue(importedDraft);
      await saveDraft(importedDraft);
      app.currentDraftAttachments = importedDraftAttachments;
      await saveDraftAttachments(importedDraftAttachments);
      app.dom.setAutosaveState("已保存");
      app.currentLoadedItemId = null;
      await clearDraftItemId();
    }

    await saveItems(app.items);
    await app.recycleService.saveToStorage();
    app.render();
    app.recycleListView.render(app.recycleService.getRecycleItems());

    const addedCount = Math.max(0, app.items.length - previousItemCount);
    const recycleAddedCount = Math.max(
      0,
      app.recycleService.getRecycleItems().length - previousRecycleCount
    );
    const missingText =
      missingRecordingCount > 0 ? `，跳过 ${missingRecordingCount} 个缺失录音` : "";
    app.ui.showToast(
      `${sourceLabel} 导入完成：新增 ${addedCount} 条，回收站 ${recycleAddedCount} 条${missingText}`
    );
  }

  exportItem(id, format) {
    const { app } = this;
    const item = app.items.find((x) => x.id === id);

    if (!item || item.encrypted) {
      app.ui.showToast("请先解密后再导出");
      return;
    }

    const payload = getTextExportPayload(item, format);
    if (!payload) {
      app.ui.showToast("不支持的导出格式");
      return;
    }

    downloadTextFile(payload.content, payload.filename, payload.mimeType);
    app.ui.showToast(`已导出 ${format.toUpperCase()}`);
  }
}
