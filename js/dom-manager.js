/**
 * DOM选择器和管理
 */

export class DOMManager {
  constructor() {
    this.draft = document.getElementById("draft");
    this.list = document.getElementById("list");
    this.search = document.getElementById("search");
    this.autosaveState = document.getElementById("autosaveState");
    this.wc = document.getElementById("wc");
    this.countItems = document.getElementById("countItems");
    this.usage = document.getElementById("usage");
    this.draftUsage = document.getElementById("draftUsage");
    this.toast = document.getElementById("toast");

    this.btnArchive = document.getElementById("btnArchive");
    this.btnCopy = document.getElementById("btnCopy");
    this.btnClearDraft = document.getElementById("btnClearDraft");
    this.btnMore = document.getElementById("btnMore");
    this.btnTheme = document.getElementById("btnTheme");

    // 更多功能面板相关的DOM元素
    this.moreModalOverlay = document.getElementById("moreModalOverlay");
    this.moreModal = document.getElementById("moreModal");
    this.moreModalClose = document.getElementById("moreModalClose");
    this.sidebarRecycle = document.getElementById("sidebarRecycle");
    this.sidebarImportExport = document.getElementById("sidebarImportExport");
    this.sidebarSettings = document.getElementById("sidebarSettings");
    this.recyclePanel = document.getElementById("recyclePanel");
    this.importExportPanel = document.getElementById("importExportPanel");
    this.settingsPanel = document.getElementById("settingsPanel");

    // 回收站相关的DOM元素
    this.recycleList = document.getElementById("recycleList");
    this.recycleActions = document.getElementById("recycleActions");
    this.recycleClearAll = document.getElementById("recycleClearAll");

    // 导入/导出相关的DOM元素
    this.exportBtn = document.getElementById("exportBtn");
    this.importBtn = document.getElementById("importBtn");

    // 设置相关的DOM元素
    this.fontSizeSlider = document.getElementById("fontSizeSlider");
    this.fontSizeValue = document.getElementById("fontSizeValue");
  }

  setAutosaveState(text) {
    this.autosaveState.textContent = text;
  }

  updateWordCount(count) {
    this.wc.textContent = String(count);
  }

  updateItemCount(count) {
    this.countItems.textContent = String(count);
  }

  updateUsage(bytes) {
    this.usage.textContent = bytes;
  }

  updateDraftUsage(bytes) {
    this.draftUsage.textContent = bytes;
  }

  getDraftValue() {
    return this.draft.value;
  }

  setDraftValue(content) {
    this.draft.value = content;
  }

  getSearchValue() {
    return (this.search.value || "").trim().toLowerCase();
  }

  setSearchValue(value) {
    this.search.value = value;
  }

  focusDraft() {
    this.draft.focus();
  }

  focusSearch() {
    this.search.focus();
    this.search.select();
  }

  clearListContent() {
    this.list.innerHTML = "";
  }

  appendListItem(element) {
    this.list.appendChild(element);
  }
}
