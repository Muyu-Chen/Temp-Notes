/**
 * DOM选择器和管理
 */

export class DOMManager {
  constructor() {
    this.draft = document.getElementById("draft");
    this.draftPreview = document.getElementById("draftPreview");
    this.draftAttachments = document.getElementById("draftAttachments");
    this.draftModeToggle = document.getElementById("draftModeToggle");
    this.btnMarkdownEdit = document.getElementById("btnMarkdownEdit");
    this.btnMarkdownPreview = document.getElementById("btnMarkdownPreview");
    this.btnDraftGenerateTags = document.getElementById("btnDraftGenerateTags");
    this.btnRecordDraft = document.getElementById("btnRecordDraft");
    this.recordingFloatingPanel = document.getElementById("recordingFloatingPanel");
    this.recordingDragHandle = document.getElementById("recordingDragHandle");
    this.recordingStatusText = document.getElementById("recordingStatusText");
    this.recordingTimer = document.getElementById("recordingTimer");
    this.recordingLiveText = document.getElementById("recordingLiveText");
    this.btnRecordingPause = document.getElementById("btnRecordingPause");
    this.btnRecordingStop = document.getElementById("btnRecordingStop");
    this.attachmentPlayerPanel = document.getElementById("attachmentPlayerPanel");
    this.attachmentPlayerDragHandle = document.getElementById("attachmentPlayerDragHandle");
    this.attachmentPlayerName = document.getElementById("attachmentPlayerName");
    this.attachmentPlayerMeta = document.getElementById("attachmentPlayerMeta");
    this.attachmentPlayerWaveform = document.getElementById("attachmentPlayerWaveform");
    this.attachmentPlayerSeek = document.getElementById("attachmentPlayerSeek");
    this.attachmentPlayerCurrentTime = document.getElementById("attachmentPlayerCurrentTime");
    this.attachmentPlayerDuration = document.getElementById("attachmentPlayerDuration");
    this.attachmentPlayerPlay = document.getElementById("attachmentPlayerPlay");
    this.attachmentPlayerSpeed = document.getElementById("attachmentPlayerSpeed");
    this.attachmentPlayerTranscribe = document.getElementById("attachmentPlayerTranscribe");
    this.attachmentPlayerExport = document.getElementById("attachmentPlayerExport");
    this.attachmentPlayerMore = document.getElementById("attachmentPlayerMore");
    this.attachmentPlayerClose = document.getElementById("attachmentPlayerClose");
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
    this.layoutWidthSelect = document.getElementById("layoutWidthSelect");
    this.columnLayoutSelect = document.getElementById("columnLayoutSelect");
    this.recycleRetentionSelect = document.getElementById("recycleRetentionSelect");
    this.recycleRetentionDesc = document.getElementById("recycleRetentionDesc");
    this.recordingFormatSelect = document.getElementById("recordingFormatSelect");
    this.llmProfileSelect = document.getElementById("llmProfileSelect");
    this.llmAddProfileBtn = document.getElementById("llmAddProfileBtn");
    this.llmSetDefaultBtn = document.getElementById("llmSetDefaultBtn");
    this.llmDeleteProfileBtn = document.getElementById("llmDeleteProfileBtn");
    this.llmProfileName = document.getElementById("llmProfileName");
    this.llmEnabled = document.getElementById("llmEnabled");
    this.llmBaseUrl = document.getElementById("llmBaseUrl");
    this.llmApiKey = document.getElementById("llmApiKey");
    this.llmModel = document.getElementById("llmModel");
    this.llmTestBtn = document.getElementById("llmTestBtn");
    this.llmStatus = document.getElementById("llmStatus");
    this.llmDebugLog = document.getElementById("llmDebugLog");
    this.llmCopyLogBtn = document.getElementById("llmCopyLogBtn");
    this.llmClearLogBtn = document.getElementById("llmClearLogBtn");
    this.transcriptionProviderSelect = document.getElementById("transcriptionProviderSelect");
    this.transcriptionLanguage = document.getElementById("transcriptionLanguage");
    this.openaiSttApiKey = document.getElementById("openaiSttApiKey");
    this.openaiSttFileModel = document.getElementById("openaiSttFileModel");
    this.realtimeCaptionsEnabled = document.getElementById("realtimeCaptionsEnabled");
    this.realtimeDraftEnabled = document.getElementById("realtimeDraftEnabled");
    this.btnForceRefresh = document.getElementById("btnForceRefresh");
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

  setDraftInputLocked(locked) {
    this.draft.readOnly = Boolean(locked);
    this.draft.classList.toggle("draft-locked", Boolean(locked));
  }

  setDraftPreview(content) {
    this.draftPreview.innerHTML = content;
  }

  setRecordingLauncherDisabled(disabled) {
    this.btnRecordDraft.disabled = Boolean(disabled);
    this.btnRecordDraft.classList.toggle("disabled", Boolean(disabled));
  }

  setRecordingPanelVisible(visible) {
    this.recordingFloatingPanel.hidden = !visible;
  }

  setRecordingPanelState({ state = "recording", timer = "00:00", stopping = false } = {}) {
    const paused = state === "paused";
    this.recordingFloatingPanel.dataset.state = paused ? "paused" : "recording";
    this.recordingStatusText.textContent = paused ? "已暂停" : "录音中";
    this.recordingTimer.textContent = timer;
    this.btnRecordingPause.textContent = paused ? "继续" : "暂停";
    this.btnRecordingPause.disabled = Boolean(stopping);
    this.btnRecordingStop.disabled = Boolean(stopping);
  }

  setRecordingLiveText(text) {
    if (!this.recordingLiveText) return;
    const value = String(text || "").trim();
    this.recordingLiveText.hidden = !value;
    this.recordingLiveText.textContent = value;
  }

  setRecordingPanelPosition(left, top) {
    const panel = this.recordingFloatingPanel;
    const rect = panel.getBoundingClientRect();
    const margin = 12;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    const nextLeft = Math.min(Math.max(left, margin), maxLeft);
    const nextTop = Math.min(Math.max(top, margin), maxTop);

    panel.style.left = `${nextLeft}px`;
    panel.style.top = `${nextTop}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  setAttachmentPlayerVisible(visible) {
    this.attachmentPlayerPanel.hidden = !visible;
  }

  setAttachmentPlayerPosition(left, top) {
    const panel = this.attachmentPlayerPanel;
    const rect = panel.getBoundingClientRect();
    const margin = 12;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    const nextLeft = Math.min(Math.max(left, margin), maxLeft);
    const nextTop = Math.min(Math.max(top, margin), maxTop);

    panel.style.left = `${nextLeft}px`;
    panel.style.top = `${nextTop}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
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
      id: this.llmProfileSelect.value || "default",
      name: this.llmProfileName.value || "",
      enabled: this.llmEnabled.checked,
      baseUrl: this.llmBaseUrl.value || "",
      apiKey: this.llmApiKey.value || "",
      model: this.llmModel.value || "",
    };
  }

  setLLMSettings(settings) {
    this.llmProfileName.value = settings.name || "";
    this.llmEnabled.checked = settings.enabled === true;
    this.llmBaseUrl.value = settings.baseUrl || "";
    this.llmApiKey.value = settings.apiKey || "";
    this.llmModel.value = settings.model || "";
    this.setLLMInputsEnabled(settings.enabled === true);
  }

  setLLMProfilesSettings({ profiles = [], defaultProfileId = "" } = {}) {
    const activeId = this.llmProfileSelect.value || defaultProfileId || profiles[0]?.id || "";
    this.llmProfileSelect.replaceChildren();
    profiles.forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.id === defaultProfileId
        ? `${profile.name || "未命名模型"}（默认）`
        : profile.name || "未命名模型";
      this.llmProfileSelect.appendChild(option);
    });

    const nextActiveId = profiles.some((profile) => profile.id === activeId)
      ? activeId
      : defaultProfileId || profiles[0]?.id || "";
    this.llmProfileSelect.value = nextActiveId;
    const activeProfile =
      profiles.find((profile) => profile.id === nextActiveId) || profiles[0] || {};
    this.setLLMSettings(activeProfile);
    this.llmSetDefaultBtn.disabled = activeProfile.id === defaultProfileId;
    this.llmDeleteProfileBtn.disabled = profiles.length <= 1;
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

  setRecordingFormatPreference(format) {
    this.recordingFormatSelect.value = ["m4a", "mp3", "webm"].includes(format) ? format : "m4a";
  }

  getTranscriptionSettings() {
    return {
      provider: this.transcriptionProviderSelect.value || "local-whisper",
      language: this.transcriptionLanguage.value || "",
      openaiApiKey: this.openaiSttApiKey.value || "",
      openaiFileModel: this.openaiSttFileModel.value || "gpt-4o-mini-transcribe",
      openaiRealtimeModel: "gpt-realtime-whisper",
      realtimeDelay: "medium",
      realtimeCaptionsEnabled: this.realtimeCaptionsEnabled.checked,
      realtimeDraftEnabled: this.realtimeDraftEnabled.checked,
    };
  }

  setTranscriptionSettings(settings = {}) {
    this.transcriptionProviderSelect.value = ["local-whisper", "openai"].includes(settings.provider)
      ? settings.provider
      : "local-whisper";
    this.transcriptionLanguage.value = settings.language || "";
    this.openaiSttApiKey.value = settings.openaiApiKey || "";
    this.openaiSttFileModel.value = [
      "gpt-4o-mini-transcribe",
      "gpt-4o-transcribe",
      "whisper-1",
    ].includes(settings.openaiFileModel)
      ? settings.openaiFileModel
      : "gpt-4o-mini-transcribe";
    this.realtimeCaptionsEnabled.checked = settings.realtimeCaptionsEnabled === true;
    this.realtimeDraftEnabled.checked = settings.realtimeDraftEnabled === true;
  }

  setLayoutPreferences({ layoutWidth, columnLayout }) {
    this.layoutWidthSelect.value = ["auto", "standard", "wide", "ultrawide"].includes(layoutWidth)
      ? layoutWidth
      : "standard";
    this.columnLayoutSelect.value = ["default", "editor", "archive"].includes(columnLayout)
      ? columnLayout
      : "default";
  }
}
