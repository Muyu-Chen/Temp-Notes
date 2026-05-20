/**
 * 回收站操作协调
 */

import { saveItem } from "../storage/item-storage.js";
import {
  getRecycleEntryAttachmentIds,
  isRecordingRecycleEntry,
} from "../lib/recycle-utils.js";
import { resolveItemTitle } from "../lib/text-utils.js";
import { uid } from "../lib/id-utils.js";
import { normalizeItem } from "../lib/item-utils.js";
import { now } from "../lib/time-utils.js";
import { saveDraftAttachments } from "../storage/draft-attachments-storage.js";
import { clearDraftItemId, saveDraft } from "../storage/draft-storage.js";

export class RecycleActionsService {
  constructor(app) {
    this.app = app;
  }

  onRecycleSearch() {
    const { app } = this;
    const searchQuery = app.dom.getRecycleSearchValue();
    const items = app.recycleService.getRecycleItems();
    app.recycleListView.render(items, searchQuery);
  }

  async restoreFromRecycle(index) {
    const { app } = this;
    const items = app.recycleService.getRecycleItems();
    if (index < 0 || index >= items.length) return;

    const item = items[index];
    if (isRecordingRecycleEntry(item)) {
      return this.restoreRecordingFromRecycle(index, item);
    }

    const result = await app.modal.show({
      title: "恢复条目？",
      message: `标题：${resolveItemTitle(item)}`,
      okText: "确认恢复",
      cancelText: "取消",
    });

    if (!result.ok) return;

    const restoredItem = await app.recycleService.restoreItem(index);
    if (restoredItem) {
      delete restoredItem.deletedAt;
      app.items.unshift(restoredItem);
      await saveItem(restoredItem);
      app.render();
      app.ui.showToast("条目已恢复");
      app.recycleListView.render(app.recycleService.getRecycleItems());
    }
  }

  getRecordingSourceLabel(entry) {
    const { app } = this;
    if (!entry.sourceItemId) {
      return entry.sourceItemTitle || "草稿";
    }
    const item = app.items.find((x) => x.id === entry.sourceItemId);
    return item ? resolveItemTitle(item) : "条目已删除";
  }

  async restoreRecordingFromRecycle(index, entry) {
    const { app } = this;
    const result = await app.modal.show({
      title: "恢复录音？",
      message: `录音：${entry.attachment.name}\n关联条目：${this.getRecordingSourceLabel(entry)}`,
      okText: "确认恢复",
      cancelText: "取消",
    });

    if (!result.ok) return;

    const recycleItems = app.recycleService.getRecycleItems();
    const sourceRecycleIndex = entry.sourceItemId
      ? recycleItems.findIndex(
          (item) => !isRecordingRecycleEntry(item) && item.id === entry.sourceItemId
        )
      : -1;

    if (sourceRecycleIndex >= 0) {
      const restoreTogether = await app.modal.show({
        title: "关联条目也在回收站",
        message:
          "是否把原条目和录音一起恢复？\n\n如果只恢复录音，它会进入一个新的条目，之后无法自动绑定回原有条目。",
        okText: "一起恢复",
        cancelText: "只恢复录音",
      });

      if (restoreTogether.ok) {
        return this.restoreRecordingWithSourceItem(index, sourceRecycleIndex);
      }
    }

    const restoredEntry = await app.recycleService.restoreItem(index);
    if (!restoredEntry?.attachment) return;

    const attachment = restoredEntry.attachment;
    const targetIndex = app.items.findIndex((item) => item.id === restoredEntry.sourceItemId);

    if (targetIndex >= 0) {
      const target = app.items[targetIndex];
      const exists = target.attachments?.some((item) => item.id === attachment.id);
      if (!exists) {
        app.items[targetIndex] = normalizeItem({
          ...target,
          attachments: [...(target.attachments || []), attachment],
          updatedAt: now(),
        });
        await saveItem(app.items[targetIndex]);
      }

      if (app.currentLoadedItemId === target.id) {
        const draftExists = app.currentDraftAttachments.some((item) => item.id === attachment.id);
        if (!draftExists) {
          app.currentDraftAttachments = [...app.currentDraftAttachments, attachment];
          await saveDraftAttachments(app.currentDraftAttachments);
        }
      }

      app.render();
      app.ui.showToast(exists ? "录音已在原条目中" : "录音已恢复到原条目");
      app.recycleListView.render(app.recycleService.getRecycleItems());
      return;
    }

    if (!restoredEntry.sourceItemId) {
      const currentDraft = app.dom.getDraftValue();
      const canRestoreToDraft =
        !currentDraft.trim() && app.currentDraftAttachments.length === 0;

      if (canRestoreToDraft) {
        const draftContent = restoredEntry.sourceDraftContent || "";
        app.dom.setDraftValue(draftContent);
        app.currentDraftAttachments = [attachment];
        app.currentLoadedItemId = null;
        await saveDraft(draftContent);
        await saveDraftAttachments(app.currentDraftAttachments);
        await clearDraftItemId();
        app.dom.setAutosaveState("已保存");
        app.render();
        app.ui.showToast("草稿和录音已恢复");
        app.recycleListView.render(app.recycleService.getRecycleItems());
        return;
      }
    }

    const fallbackTitle = restoredEntry.sourceItemTitle || attachment.name || "录音";
    const newItem = normalizeItem({
      id: uid(),
      title: fallbackTitle,
      content: restoredEntry.sourceDraftContent || "",
      attachments: [attachment],
      createdAt: now(),
      updatedAt: now(),
    });

    app.items.unshift(newItem);
    await saveItem(newItem);
    app.render();
    app.ui.showToast(
      restoredEntry.sourceItemId
        ? "原条目已删除，录音已恢复为新条目"
        : "当前草稿非空，录音已恢复为新条目"
    );
    app.recycleListView.render(app.recycleService.getRecycleItems());
  }

  async restoreRecordingWithSourceItem(recordingIndex, sourceItemIndex) {
    const { app } = this;
    const removals = [
      { index: recordingIndex, type: "recording" },
      { index: sourceItemIndex, type: "item" },
    ].sort((a, b) => b.index - a.index);
    let restoredEntry = null;
    let restoredItem = null;

    for (const removal of removals) {
      const removed = await app.recycleService.restoreItem(removal.index);
      if (removal.type === "recording") restoredEntry = removed;
      if (removal.type === "item") restoredItem = removed;
    }

    if (!restoredEntry?.attachment || !restoredItem) return;

    const attachment = restoredEntry.attachment;
    const hasAttachment = restoredItem.attachments?.some((item) => item.id === attachment.id);
    const item = normalizeItem({
      ...restoredItem,
      deletedAt: undefined,
      attachments: hasAttachment
        ? restoredItem.attachments
        : [...(restoredItem.attachments || []), attachment],
      updatedAt: now(),
    });

    app.items.unshift(item);
    await saveItem(item);
    app.render();
    app.ui.showToast("条目和录音已恢复");
    app.recycleListView.render(app.recycleService.getRecycleItems());
  }

  async deleteFromRecycle(index) {
    const { app } = this;
    const items = app.recycleService.getRecycleItems();
    if (index < 0 || index >= items.length) return;

    const item = items[index];
    const recordingEntry = isRecordingRecycleEntry(item);
    const result = await app.modal.show({
      title: recordingEntry ? "永久删除录音？" : "永久删除条目？",
      message: recordingEntry
        ? `此操作不可恢复。\n\n录音：${item.attachment.name}`
        : `此操作不可恢复。\n\n标题：${resolveItemTitle(item)}`,
      okText: "永久删除",
      cancelText: "取消",
    });

    if (!result.ok) return;

    const removedItem = await app.recycleService.deleteFromRecycle(index);
    if (removedItem) {
      await app.cleanupUnreferencedRecordings(getRecycleEntryAttachmentIds(removedItem));
    }
    app.ui.showToast(recordingEntry ? "录音已永久删除" : "条目已永久删除");
    app.recycleListView.render(app.recycleService.getRecycleItems());
  }

  async clearRecycleBin() {
    const { app } = this;
    const items = app.recycleService.getRecycleItems();
    if (items.length === 0) {
      app.ui.showToast("回收站已为空");
      return;
    }

    const result = await app.modal.show({
      title: "清空回收站",
      message: `将永久删除所有 ${items.length} 个已删除内容，此操作不可恢复。`,
      okText: "清空",
      cancelText: "取消",
    });

    if (!result.ok) return;

    const removedItems = await app.recycleService.clearRecycle();
    const removedAttachmentIds = removedItems.flatMap(getRecycleEntryAttachmentIds);
    await app.cleanupUnreferencedRecordings(removedAttachmentIds);
    app.ui.showToast("回收站已清空");
    app.recycleListView.render(app.recycleService.getRecycleItems());
  }
}
