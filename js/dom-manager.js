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
    this.toast = document.getElementById("toast");

    this.btnArchive = document.getElementById("btnArchive");
    this.btnCopy = document.getElementById("btnCopy");
    this.btnClearDraft = document.getElementById("btnClearDraft");
    this.btnClearArchive = document.getElementById("btnClearArchive");
    this.btnExport = document.getElementById("btnExport");
    this.btnImport = document.getElementById("btnImport");
    this.btnTheme = document.getElementById("btnTheme");
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
