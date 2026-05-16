/**
 * 导入导出流程服务
 */

import { clearDraftItemId, saveDraft } from "../storage/draft-storage.js";
import { saveItems } from "../storage/item-storage.js";
import { downloadTextFile, getTextExportPayload } from "../lib/download-utils.js";
import {
  exportData,
  mergeItems,
  normalizeImportedData,
} from "../storage/import-export-storage.js";

export class ImportExportService {
  constructor(app) {
    this.app = app;
  }

  exportAll() {
    const { app } = this;
    const payload = exportData(app.dom.getDraftValue(), app.items);
    const json = JSON.stringify(payload, null, 2);

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tempnotes-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    app.ui.showToast("已导出 JSON");
  }

  importAll() {
    const { app } = this;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      const text = await file.text();
      const data = JSON.parse(text);

      if (!data) {
        app.ui.showToast("导入失败：JSON 格式不正确");
        return;
      }

      const { draft: importedDraft, items: importedItems, valid } =
        normalizeImportedData(data);

      if (!valid) {
        app.ui.showToast("导入失败：数据格式不正确");
        return;
      }
      app.items = mergeItems(app.items, importedItems);

      const overwrite = confirm(
        "是否用导入文件中的 draft 覆盖当前草稿？\n\n选择\"取消\"将保留当前草稿，仅导入条目。"
      );
      if (overwrite) {
        app.dom.setDraftValue(importedDraft);
        saveDraft(importedDraft);
        app.dom.setAutosaveState("已保存");
        app.currentLoadedItemId = null;
        clearDraftItemId();
      }

      saveItems(app.items);
      app.render();
      const addedCount = importedItems.filter((x) => app.items.some((it) => it.id === x.id))
        .length;
      app.ui.showToast(`导入完成：新增 ${addedCount} 条`);
    };
    input.click();
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
