/**
 * DOM选择器和管理
 */

export class DOMManager {
  constructor() {
    this.draft = document.getElementById("draft");
    this.draftPreview = document.getElementById("draftPreview");
    this.draftModeToggle = document.getElementById("draftModeToggle");
    this.btnMarkdownEdit = document.getElementById("btnMarkdownEdit");
    this.btnMarkdownPreview = document.getElementById("btnMarkdownPreview");
    this.list = document.getElementById("list");
    this.search = document.getElementById("search");
    this.archiveSearchTools = document.getElementById("archiveSearchTools");
    this.archiveFilterToggleBtn = document.getElementById("archiveFilterToggleBtn");
    this.archiveFilterMenu = document.getElementById("archiveFilterMenu");
    this.favoriteFilterBtn = document.getElementById("favoriteFilterBtn");
    this.activeTagFilterBtn = document.getElementById("activeTagFilterBtn");
    this.activeTagFilterText = document.getElementById("activeTagFilterText");
    this.autosaveState = document.getElementById("autosaveState");
    this.wc = document.getElementById("wc");
    this.countItems = document.getElementById("countItems");
    this.usage = document.getElementById("usage");
    this.draftUsage = document.getElementById("draftUsage");
    this.toast = document.getElementById("toast");

    this.btnArchive = document.getElementById("btnArchive");
    this.btnNew = document.getElementById("btnNew");
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
    this.recycleSearch = document.getElementById("recycleSearch");
    this.recycleRetentionStatus = document.getElementById("recycleRetentionStatus");

    // 导入/导出相关的DOM元素
    this.exportBtn = document.getElementById("exportBtn");
    this.importBtn = document.getElementById("importBtn");

    // 设置相关的DOM元素
    this.fontSizeSlider = document.getElementById("fontSizeSlider");
    this.fontSizeValue = document.getElementById("fontSizeValue");
    this.recycleRetentionSelect = document.getElementById("recycleRetentionSelect");
    this.recycleRetentionDesc = document.getElementById("recycleRetentionDesc");
    this.llmEnabled = document.getElementById("llmEnabled");
    this.llmBaseUrl = document.getElementById("llmBaseUrl");
    this.llmApiKey = document.getElementById("llmApiKey");
    this.llmModel = document.getElementById("llmModel");
    this.llmTestBtn = document.getElementById("llmTestBtn");
    this.llmStatus = document.getElementById("llmStatus");
    this.llmDebugLog = document.getElementById("llmDebugLog");
    this.llmCopyLogBtn = document.getElementById("llmCopyLogBtn");
    this.llmClearLogBtn = document.getElementById("llmClearLogBtn");
    this.btnClearAllData = document.getElementById("btnClearAllData");
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

  setDraftPreview(content) {
    this.draftPreview.innerHTML = content;
  }

  setDraftMode(mode) {
    const previewMode = mode === "preview";
    this.draft.hidden = previewMode;
    this.draftPreview.hidden = !previewMode;
    this.draftModeToggle.dataset.mode = previewMode ? "preview" : "edit";
    this.btnMarkdownEdit.classList.toggle("active", !previewMode);
    this.btnMarkdownPreview.classList.toggle("active", previewMode);
    this.btnMarkdownEdit.setAttribute("aria-pressed", String(!previewMode));
    this.btnMarkdownPreview.setAttribute("aria-pressed", String(previewMode));
  }

  getSearchValue() {
    return (this.search.value || "").trim().toLowerCase();
  }

  getFavoriteFilterEnabled() {
    return this.favoriteFilterBtn.classList.contains("active");
  }

  setFavoriteFilterEnabled(enabled) {
    this.favoriteFilterBtn.classList.toggle("active", Boolean(enabled));
    this.archiveSearchTools.classList.toggle(
      "has-active-filter",
      Boolean(enabled) || Boolean(this.getActiveTagFilter())
    );
  }

  getActiveTagFilter() {
    return this.activeTagFilterBtn.dataset.tag || "";
  }

  setActiveTagFilter(tag) {
    const value = String(tag || "").trim();
    this.activeTagFilterBtn.dataset.tag = value;
    this.activeTagFilterText.textContent = value;
    this.activeTagFilterBtn.hidden = !value;
    this.archiveSearchTools.classList.toggle(
      "has-active-filter",
      Boolean(value) || this.getFavoriteFilterEnabled()
    );
  }

  getArchiveFilterMenuOpen() {
    return this.archiveSearchTools.classList.contains("filter-open");
  }

  setArchiveFilterMenuOpen(open) {
    const value = Boolean(open);
    this.archiveSearchTools.classList.toggle("filter-open", value);
    this.archiveFilterMenu.hidden = !value;
    this.archiveFilterToggleBtn.setAttribute("aria-expanded", String(value));
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

  getRecycleSearchValue() {
    return (this.recycleSearch.value || "").trim().toLowerCase();
  }

  clearListContent() {
    this.list.innerHTML = "";
  }

  appendListItem(element) {
    this.list.appendChild(element);
  }

  getLLMSettings() {
    return {
      enabled: this.llmEnabled.checked,
      baseUrl: this.llmBaseUrl.value || "",
      apiKey: this.llmApiKey.value || "",
      model: this.llmModel.value || "",
    };
  }

  setLLMSettings(settings) {
    this.llmEnabled.checked = settings.enabled === true;
    this.llmBaseUrl.value = settings.baseUrl || "";
    this.llmApiKey.value = settings.apiKey || "";
    this.llmModel.value = settings.model || "";
    this.setLLMInputsEnabled(settings.enabled === true);
  }

  setLLMInputsEnabled(enabled) {
    [this.llmBaseUrl, this.llmApiKey, this.llmModel, this.llmTestBtn].forEach((el) => {
      el.disabled = !enabled;
    });
  }

  setLLMStatus(message, status = "pending") {
    this.llmStatus.textContent = message;
    this.llmStatus.classList.toggle("status-ok", status === "ok");
    this.llmStatus.classList.toggle("status-error", status === "error");
    this.llmStatus.classList.toggle("status-pending", status === "pending");
  }

  setLLMDebugLog(logText) {
    this.llmDebugLog.value = logText || "";
  }

  getLLMDebugLog() {
    return this.llmDebugLog.value || "";
  }

  setRecycleRetention(days, text) {
    this.recycleRetentionSelect.value = String(days);
    this.recycleRetentionDesc.textContent = text;
    this.recycleRetentionStatus.textContent = text;
  }
}
