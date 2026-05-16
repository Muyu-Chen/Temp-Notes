/**
 * 草稿与存档服务
 */

import {
  clearDraftItemId,
  saveDraft,
  saveDraftItemId,
} from "../storage/draft-storage.js";
import { saveItem } from "../storage/item-storage.js";
import { estimateStorageBytes } from "../lib/bytes-utils.js";
import { uid } from "../lib/id-utils.js";
import { now } from "../lib/time-utils.js";
import { getFontSize } from "./settings-service.js";
import { getAppliedTheme } from "./theme-manager.js";

export class DraftService {
  constructor(app) {
    this.app = app;
  }

  getStorageUsageBytes(draftValue = this.app.dom.getDraftValue()) {
    const recycleItems = this.app.recycleService.getRecycleItems();
    const settings = { theme: getAppliedTheme(), fontSize: getFontSize() };
    return estimateStorageBytes(draftValue, this.app.items, recycleItems, settings);
  }

  getDraftUsageBytes(draftValue = this.app.dom.getDraftValue()) {
    return (draftValue || "").length * 2;
  }

  getLinkedDraftItem() {
    const { app } = this;
    if (!app.currentLoadedItemId) return null;
    return app.items.find((item) => item.id === app.currentLoadedItemId) || null;
  }

  isCurrentDraftArchived(content = this.app.dom.getDraftValue()) {
    const item = this.getLinkedDraftItem();
    return Boolean(item && item.content === content);
  }

  async resetDraft(toastMessage) {
    const { app } = this;
    app.dom.setDraftValue("");
    await saveDraft("");
    app.currentLoadedItemId = null;
    await clearDraftItemId();
    app.dom.setAutosaveState("已保存");
    app.ui.updateMeta("", app.items, 0, this.getStorageUsageBytes(""));
    if (toastMessage) {
      app.ui.showToast(toastMessage);
    }
    app.dom.focusDraft();
  }

  scheduleDraftSave() {
    const { app } = this;
    app.dom.setAutosaveState("保存中");
    clearTimeout(app.saveTimer);
    app.saveTimer = setTimeout(async () => {
      try {
        const draft = app.dom.getDraftValue();
        await saveDraft(draft);
        app.dom.setAutosaveState("已保存");
        app.ui.updateMeta(
          draft,
          app.items,
          this.getDraftUsageBytes(draft),
          this.getStorageUsageBytes(draft)
        );
      } catch (e) {
        app.dom.setAutosaveState("保存失败");
        app.ui.showToast("保存失败：IndexedDB 可能已满或被禁用");
        console.error(e);
      }
    }, 250);
  }

  loadToDraft(id) {
    const { app } = this;
    const item = app.items.find((x) => x.id === id);
    if (!item) return;

    if (item.encrypted) {
      app.ui.showToast("该条目已加密，请先解密");
      return;
    }

    app.dom.setDraftValue(item.content);
    saveDraft(item.content);
    app.currentLoadedItemId = id;
    saveDraftItemId(id);
    app.dom.setAutosaveState("已保存");
    app.ui.updateMeta(
      item.content,
      app.items,
      this.getDraftUsageBytes(item.content),
      this.getStorageUsageBytes(item.content)
    );
    app.ui.showToast("已加载到草稿区");
    app.dom.focusDraft();
  }

  async archiveDraft(options = {}) {
    const { showToast = true } = options;
    const { app } = this;
    const content = app.dom.getDraftValue();
    if (!content.trim()) {
      if (showToast) app.ui.showToast("草稿为空：无需存档");
      return "empty";
    }

    if (this.getLinkedDraftItem()) {
      const itemIndex = app.items.findIndex((x) => x.id === app.currentLoadedItemId);
      if (app.items[itemIndex].content === content) {
        await saveDraftItemId(app.currentLoadedItemId);
        if (showToast) app.ui.showToast("内容未变化");
        app.render();
        return "unchanged";
      }

      app.items[itemIndex] = {
        ...app.items[itemIndex],
        content,
        updatedAt: now(),
      };
      await saveDraftItemId(app.currentLoadedItemId);
      await saveItem(app.items[itemIndex]);
      if (showToast) app.ui.showToast("已更新条目");
      app.render();
      return "updated";
    }

    const item = { id: uid(), content, createdAt: now(), updatedAt: now() };
    app.items.unshift(item);
    app.currentLoadedItemId = item.id;
    await saveDraftItemId(item.id);
    await saveItem(item);
    if (showToast) app.ui.showToast("已存档为新条目");
    app.render();
    return "created";
  }

  async clearDraft() {
    const { app } = this;
    const content = app.dom.getDraftValue();
    const shouldConfirm = content.trim() && !this.isCurrentDraftArchived(content);

    if (shouldConfirm) {
      const ok = confirm("当前草稿尚未存档。确认清空草稿？此操作不可恢复。");
      if (!ok) return false;
    }

    await this.resetDraft("草稿已清空");
    return true;
  }

  async newDraft() {
    const { app } = this;
    const content = app.dom.getDraftValue();

    if (!content.trim() || this.isCurrentDraftArchived(content)) {
      await this.resetDraft("已新建草稿");
      return true;
    }

    const result = await app.modal.show({
      title: "新建草稿",
      message: "是否把当前草稿保存/更新到条目中？",
      okText: "保存",
      cancelText: "不保存",
    });

    if (result.ok) {
      await this.archiveDraft({ showToast: false });
    }

    await this.resetDraft(result.ok ? "已保存并新建草稿" : "已丢弃更改并新建草稿");
    return true;
  }

  onDraftInput() {
    const { app } = this;
    const draft = app.dom.getDraftValue();

    if (!draft.trim()) {
      app.currentLoadedItemId = null;
      clearDraftItemId();
    }

    this.scheduleDraftSave();
    app.ui.updateMeta(
      draft,
      app.items,
      this.getDraftUsageBytes(draft),
      this.getStorageUsageBytes(draft)
    );
  }
}
