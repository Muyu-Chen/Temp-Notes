/**
 * 草稿与存档服务
 */

import {
  clearDraftItemId,
  saveDraft,
  saveDraftItemId,
} from "../storage/draft-storage.js";
import { saveItems } from "../storage/item-storage.js";
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

  archiveDraft() {
    const { app } = this;
    const content = app.dom.getDraftValue();
    if (!content.trim()) {
      app.ui.showToast("草稿为空：无需存档");
      return;
    }

    if (app.currentLoadedItemId) {
      const itemIndex = app.items.findIndex((x) => x.id === app.currentLoadedItemId);
      if (itemIndex !== -1) {
        app.items[itemIndex] = {
          ...app.items[itemIndex],
          content,
          updatedAt: now(),
        };
        app.ui.showToast("已更新条目");
        saveDraftItemId(app.currentLoadedItemId);
        saveItems(app.items);
        app.render();
        return;
      }
    }

    const item = { id: uid(), content, createdAt: now(), updatedAt: now() };
    app.items.unshift(item);
    app.currentLoadedItemId = item.id;
    saveDraftItemId(item.id);
    app.ui.showToast("已存档为新条目");
    saveItems(app.items);
    app.render();
  }

  clearDraft() {
    const { app } = this;
    const ok = confirm("确认清空草稿？此操作不可恢复。");
    if (!ok) return;

    app.dom.setDraftValue("");
    saveDraft("");
    app.currentLoadedItemId = null;
    clearDraftItemId();
    app.dom.setAutosaveState("已保存");
    app.ui.updateMeta("", app.items, 0, this.getStorageUsageBytes(""));
    app.ui.showToast("草稿已清空");
    app.dom.focusDraft();
  }

  async newDraft() {
    const { app } = this;
    const result = await app.modal.show({
      title: "新建草稿",
      message: "是否把当前草稿保存/更新到条目中？",
      okText: "保存",
      cancelText: "不保存",
    });

    if (result.ok) {
      this.archiveDraft();
    }

    app.dom.setDraftValue("");
    saveDraft("");
    app.currentLoadedItemId = null;
    clearDraftItemId();
    app.dom.setAutosaveState("已保存");
    app.ui.updateMeta("", app.items, 0, this.getStorageUsageBytes(""));
    app.ui.showToast(result.ok ? "已保存并新建草稿" : "已丢弃更改并新建草稿");
    app.dom.focusDraft();
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
