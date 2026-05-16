/**
 * 应用总协调器
 */

import { clearDraftItemId, loadDraft, loadDraftItemId } from "./storage/draft-storage.js";
import { loadItems } from "./storage/item-storage.js";
import { isMac } from "./lib/platform-utils.js";
import { Modal } from "./ui/modal.js";
import { RecycleListView } from "./ui/recycle-list-view.js";
import { DraftService } from "./services/draft-service.js";
import { EncryptionService } from "./services/encryption-service.js";
import { ImportExportService } from "./services/import-export-service.js";
import { ItemService } from "./services/item-service.js";
import { RecycleActionsService } from "./services/recycle-actions-service.js";
import { RecycleService } from "./services/recycle-service.js";
import {
  applyFontSize,
  clearPersistentData,
  getFontSize as readFontSize,
  getLLMSettings as readLLMSettings,
  saveLLMSettings as persistLLMSettings,
  setFontSize as persistFontSize,
} from "./services/settings-service.js";
import { toggleTheme } from "./services/theme-manager.js";

export class AppController {
  constructor(uiController, domManager) {
    this.ui = uiController;
    this.dom = domManager;
    this.items = [];
    this.saveTimer = null;
    this.currentLoadedItemId = null;
    this.draftMode = "edit";
    this.modal = new Modal();

    this.recycleService = new RecycleService();
    this.recycleListView = new RecycleListView(domManager, {
      onItemRestore: (index) => this.restoreFromRecycle(index),
      onItemDelete: (index) => this.deleteFromRecycle(index),
    });

    this.draftService = new DraftService(this);
    this.itemService = new ItemService(this);
    this.importExportService = new ImportExportService(this);
    this.encryptionService = new EncryptionService(this);
    this.recycleActionsService = new RecycleActionsService(this);
  }

  getStorageUsageBytes(draftValue = this.dom.getDraftValue()) {
    return this.draftService.getStorageUsageBytes(draftValue);
  }

  getDraftUsageBytes(draftValue = this.dom.getDraftValue()) {
    return this.draftService.getDraftUsageBytes(draftValue);
  }

  async init() {
    try {
      const fontSize = this.getFontSize();
      applyFontSize(fontSize);

      const draft = await loadDraft();
      const draftItemId = await loadDraftItemId();
      this.dom.setDraftValue(draft);

      this.items = await loadItems();

      this.currentLoadedItemId = draftItemId || null;
      if (!draft.trim()) {
        this.currentLoadedItemId = null;
        clearDraftItemId();
      } else if (this.currentLoadedItemId) {
        const linked = this.items.find((x) => x.id === this.currentLoadedItemId);
        if (!linked || linked.encrypted) {
          this.currentLoadedItemId = null;
          clearDraftItemId();
        }
      }

      this.dom.setAutosaveState("已保存");
      this.ui.updateMeta(
        draft,
        this.items,
        this.getDraftUsageBytes(draft),
        this.getStorageUsageBytes(draft)
      );
      this.render();
      this.dom.focusDraft();
    } catch (e) {
      console.error("初始化失败", e);
      this.ui.showToast("初始化失败：可能是 IndexedDB 被禁用");
    }
  }

  render() {
    this.ui.renderItemsList(this.items);
    this.ui.updateDraftPreview();
    const draft = this.dom.getDraftValue();
    this.ui.updateMeta(
      draft,
      this.items,
      this.getDraftUsageBytes(draft),
      this.getStorageUsageBytes(draft)
    );
  }

  scheduleDraftSave() {
    this.draftService.scheduleDraftSave();
  }

  loadToDraft(id) {
    this.draftService.loadToDraft(id);
    this.ui.updateDraftPreview();
  }

  archiveDraft() {
    return this.draftService.archiveDraft();
  }

  async clearDraft() {
    const cleared = await this.draftService.clearDraft();
    if (cleared) {
      this.ui.updateDraftPreview();
    }
  }

  async newDraft() {
    await this.draftService.newDraft();
    this.ui.updateDraftPreview();
  }

  onDraftInput() {
    this.draftService.onDraftInput();
    this.ui.updateDraftPreview();
  }

  renameItemTitle(id, title) {
    return this.itemService.renameItemTitle(id, title);
  }

  deleteItem(id) {
    return this.itemService.deleteItem(id);
  }

  openMorePanel() {
    this.dom.moreModalOverlay.style.display = "block";
    this.dom.moreModal.style.display = "flex";
    this.switchPanel("recycle");
  }

  closeMorePanel() {
    this.dom.moreModalOverlay.style.display = "none";
    this.dom.moreModal.style.display = "none";
  }

  switchPanel(panelName) {
    this.dom.recyclePanel.classList.remove("active");
    this.dom.importExportPanel.classList.remove("active");
    this.dom.settingsPanel.classList.remove("active");

    this.dom.sidebarRecycle.classList.remove("active");
    this.dom.sidebarImportExport.classList.remove("active");
    this.dom.sidebarSettings.classList.remove("active");

    if (panelName === "recycle") {
      this.dom.recyclePanel.classList.add("active");
      this.dom.sidebarRecycle.classList.add("active");
      this.recycleListView.render(this.recycleService.getRecycleItems());
    } else if (panelName === "importExport") {
      this.dom.importExportPanel.classList.add("active");
      this.dom.sidebarImportExport.classList.add("active");
    } else if (panelName === "settings") {
      this.dom.settingsPanel.classList.add("active");
      this.dom.sidebarSettings.classList.add("active");
      this.loadSettingsUI();
    }
  }

  loadSettingsUI() {
    const fontSize = this.getFontSize();
    this.dom.fontSizeSlider.value = fontSize;
    this.dom.fontSizeValue.textContent = `${fontSize}px`;
    this.dom.setLLMSettings(this.getLLMSettings());
  }

  getFontSize() {
    return readFontSize();
  }

  getLLMSettings() {
    return readLLMSettings();
  }

  saveLLMSettings(baseUrl, apiKey, model) {
    persistLLMSettings(baseUrl, apiKey, model);
  }

  setFontSize(size) {
    const nextSize = persistFontSize(size);
    if (nextSize !== null) {
      this.dom.fontSizeValue.textContent = `${nextSize}px`;
    }
  }

  clearAllData() {
    return this.confirmAndClearAllData();
  }

  async confirmAndClearAllData() {
    const result = await this.modal.show({
      title: "清除所有内容",
      message: "此操作将永久删除所有草稿、条目、回收站和设置数据，无法恢复。\n\n请确认是否继续。",
      okText: "继续清除",
      cancelText: "取消",
    });

    if (!result.ok) return;

    const confirmResult = await this.modal.show({
      title: "最后确认",
      message: "确定要清除所有数据吗？此操作不可逆。",
      okText: "确认清除",
      cancelText: "取消",
    });

    if (!confirmResult.ok) return;

    try {
      await clearPersistentData();

      this.items = [];
      this.currentLoadedItemId = null;
      this.recycleService.deletedItems = [];

      this.dom.setDraftValue("");
      this.dom.setAutosaveState("已保存");
      this.ui.updateMeta("", [], 0, 0);

      this.dom.fontSizeSlider.value = "16";
      this.dom.fontSizeValue.textContent = "16px";
      this.dom.setLLMSettings({ baseUrl: "", apiKey: "", model: "" });

      this.render();
      this.ui.showToast("所有数据已清除");
      this.closeMorePanel();
      location.reload();
    } catch (err) {
      console.error("清除数据失败:", err);
      this.ui.showToast("清除数据失败");
    }
  }

  onRecycleSearch() {
    this.recycleActionsService.onRecycleSearch();
  }

  restoreFromRecycle(index) {
    return this.recycleActionsService.restoreFromRecycle(index);
  }

  deleteFromRecycle(index) {
    return this.recycleActionsService.deleteFromRecycle(index);
  }

  clearRecycleBin() {
    return this.recycleActionsService.clearRecycleBin();
  }

  exportAll() {
    this.importExportService.exportAll();
  }

  importAll() {
    this.importExportService.importAll();
  }

  setDraftMode(mode) {
    this.draftMode = mode;
    this.ui.setDraftMode(mode);
  }

  onDraftPreviewClick(e) {
    if (e.target.closest("a")) return;
    this.ui.showToast("预览模式无法编辑，请切换到编辑模式");
  }

  onSearchInput() {
    this.render();
  }

  async onThemeToggle() {
    const nextTheme = await toggleTheme();
    this.ui.showToast(`主题已切换为：${nextTheme === "dark" ? "暗色" : "亮色"}`);
  }

  onKeyDown(e) {
    const ctrl = isMac() ? e.metaKey : e.ctrlKey;

    if (ctrl && e.key.toLowerCase() === "s") {
      e.preventDefault();
      this.archiveDraft();
    }
    if (ctrl && e.key.toLowerCase() === "k") {
      e.preventDefault();
      this.dom.focusSearch();
    }
    if (ctrl && e.key.toLowerCase() === "l") {
      e.preventDefault();
      this.clearDraft();
    }
  }

  encryptItem(id) {
    return this.encryptionService.encryptItem(id);
  }

  decryptItem(id) {
    return this.encryptionService.decryptItem(id);
  }
}
