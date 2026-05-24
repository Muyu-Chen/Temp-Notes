/**
 * 应用总协调器
 */

import { clearDraftItemId, loadDraft, loadDraftItemId } from "./storage/draft-storage.js";
import {
  loadDraftAttachments,
  saveDraftAttachments,
} from "./storage/draft-attachments-storage.js";
import { loadItems } from "./storage/item-storage.js";
import {
  deleteUnreferencedRecordings,
  loadRecording,
  updateRecordingTranscription,
} from "./storage/recording-storage.js";
import { normalizeAttachments } from "./lib/attachment-utils.js";
import { buildWaveformBuckets, cyclePlaybackRate } from "./lib/audio-waveform-utils.js";
import { downloadBlobFile, getRecordingExportFilename } from "./lib/download-utils.js";
import { sortItemsForDisplay } from "./lib/item-utils.js";
import { getRecycleEntryAttachmentIds, isRecordingRecycleEntry } from "./lib/recycle-utils.js";
import { resolveItemTitle } from "./lib/text-utils.js";
import { isMac } from "./lib/platform-utils.js";
import { Modal } from "./ui/modal.js";
import { RecycleListView } from "./ui/recycle-list-view.js";
import { DraftService } from "./services/draft-service.js";
import { EncryptionService } from "./services/encryption-service.js";
import { ImportExportService } from "./services/import-export-service.js";
import { ItemService } from "./services/item-service.js";
import { RecycleActionsService } from "./services/recycle-actions-service.js";
import { RecycleService } from "./services/recycle-service.js";
import { LLMService } from "./services/llm-service.js";
import { RecordingService } from "./services/recording-service.js";
import { TranscriptionService } from "./services/transcription-service.js";
import { TRANSCRIPTION_STATUS } from "./lib/transcription-utils.js";
import {
  applyFontSize,
  applyColumnLayoutPreference,
  applyLayoutWidthPreference,
  clearPersistentData,
  getColumnLayoutPreference as readColumnLayoutPreference,
  getDraftMode as readDraftMode,
  getFontSize as readFontSize,
  getLayoutWidthPreference as readLayoutWidthPreference,
  getLLMDebugLog as readLLMDebugLog,
  getLLMProfilesSettings as readLLMProfilesSettings,
  getLLMSettings as readLLMSettings,
  getRecycleRetentionDays as readRecycleRetentionDays,
  getRecordingFormatPreference as readRecordingFormatPreference,
  getTranscriptionSettings as readTranscriptionSettings,
  getRecycleRetentionText,
  clearLLMDebugLog as removeLLMDebugLog,
  createLLMProfile,
  saveLLMProfilesSettings as persistLLMProfilesSettings,
  saveTranscriptionSettings as persistTranscriptionSettings,
  setColumnLayoutPreference as persistColumnLayoutPreference,
  setDraftMode as persistDraftMode,
  setFontSize as persistFontSize,
  setLayoutWidthPreference as persistLayoutWidthPreference,
  setRecordingFormatPreference as persistRecordingFormatPreference,
  setRecycleRetentionDays as persistRecycleRetentionDays,
} from "./services/settings-service.js";
import { toggleTheme } from "./services/theme-manager.js";

const formatRecordingTimer = (durationMs = 0) => {
  const totalSeconds = Math.max(0, Math.floor(Number(durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export class AppController {
  constructor(uiController, domManager) {
    this.ui = uiController;
    this.dom = domManager;
    this.items = [];
    this.saveTimer = null;
    this.currentLoadedItemId = null;
    this.currentDraftAttachments = [];
    this.draftMode = "edit";
    this.recordingUi = {
      active: false,
      paused: false,
      stopping: false,
      startedAt: 0,
      pausedAt: 0,
      pausedMs: 0,
      timerId: null,
    };
    this.recordingDrag = null;
    this.attachmentPlayerDrag = null;
    this.draftAttachmentPlayback = null;
    this.playingDraftAttachmentId = null;
    this.expandedDraftAttachmentId = null;
    this.draftAttachmentPlaybackRate = 1;
    this.draftAttachmentPlaybackProgress = { id: null, currentTime: 0, duration: 0 };
    this.draftAttachmentPlaybackFrame = null;
    this.draftAttachmentWaveforms = new Map();
    this.liveTranscription = {
      enabled: false,
      insertToDraft: false,
      text: "",
      queue: Promise.resolve(),
    };
    this.modal = new Modal();

    this.recycleService = new RecycleService();
    this.recycleListView = new RecycleListView(domManager, {
      onItemRestore: (index) => this.restoreFromRecycle(index),
      onItemDelete: (index) => this.deleteFromRecycle(index),
      getRecordingSourceLabel: (entry) => this.getRecordingRecycleSourceLabel(entry),
    });

    this.draftService = new DraftService(this);
    this.itemService = new ItemService(this);
    this.importExportService = new ImportExportService(this);
    this.encryptionService = new EncryptionService(this);
    this.recycleActionsService = new RecycleActionsService(this);
    this.llmService = new LLMService();
    this.recordingService = new RecordingService();
    this.transcriptionService = new TranscriptionService();
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
      applyLayoutWidthPreference(this.getLayoutWidthPreference());
      applyColumnLayoutPreference(this.getColumnLayoutPreference());
      this.draftMode = this.getDraftMode();

      const draft = await loadDraft();
      const draftItemId = await loadDraftItemId();
      this.currentDraftAttachments = await loadDraftAttachments();
      this.dom.setDraftValue(draft);

      this.items = await loadItems();

      this.currentLoadedItemId = draftItemId || null;
      if (!draft.trim() && this.currentDraftAttachments.length === 0) {
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
      await this.applyRecycleRetentionPolicy();
      this.dom.setDraftMode(this.draftMode);
      this.ui.updateMeta(
        draft,
        this.items,
        this.getDraftUsageBytes(draft),
        this.getStorageUsageBytes(draft)
      );
      this.render();
      if (this.draftMode === "edit") {
        this.dom.focusDraft();
      }
    } catch (e) {
      console.error("初始化失败", e);
      this.ui.showToast("初始化失败：可能是 IndexedDB 被禁用");
    }
  }

  render() {
    this.items = sortItemsForDisplay(this.items);
    this.ui.renderItemsList(this.items);
    this.ui.renderDraftAttachments(this.currentDraftAttachments, {
      playingId: this.playingDraftAttachmentId,
    });
    const expandedAttachment = this.getExpandedDraftAttachment();
    this.ui.renderDraftAttachmentPlayer?.(
      expandedAttachment,
      this.getDraftAttachmentPlayerState(expandedAttachment?.id)
    );
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
    this.render();
  }

  archiveDraft() {
    return this.draftService.archiveDraft();
  }

  async clearDraft() {
    const cleared = await this.draftService.clearDraft();
    if (cleared) {
      this.ui.updateDraftPreview();
      this.render();
    }
  }

  async newDraft() {
    await this.draftService.newDraft();
    this.ui.updateDraftPreview();
    this.render();
  }

  onDraftInput() {
    this.draftService.onDraftInput();
    this.ui.updateDraftPreview();
  }

  renameItemTitle(id, title) {
    return this.itemService.renameItemTitle(id, title);
  }

  toggleItemPinned(id) {
    return this.itemService.togglePinned(id);
  }

  toggleItemFavorite(id) {
    return this.itemService.toggleFavorite(id);
  }

  editItemTags(id) {
    return this.itemService.editTags(id);
  }

  generateItemTags(id) {
    return this.itemService.generateTags(id);
  }

  generateDraftTags() {
    return this.itemService.generateTagsForDraft();
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
      this.updateRecycleRetentionUI();
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
    this.dom.setLLMProfilesSettings(this.getLLMProfilesSettings());
    this.dom.setLLMStatus("未测试", "pending");
    this.dom.setLLMDebugLog(this.getLLMDebugLog());
    this.dom.setTranscriptionSettings(this.getTranscriptionSettings());
    this.dom.setRecordingFormatPreference(this.getRecordingFormatPreference());
    this.dom.setLayoutPreferences({
      layoutWidth: this.getLayoutWidthPreference(),
      columnLayout: this.getColumnLayoutPreference(),
    });
    this.updateRecycleRetentionUI();
  }

  getFontSize() {
    return readFontSize();
  }

  getDraftMode() {
    return readDraftMode();
  }

  getRecycleRetentionDays() {
    return readRecycleRetentionDays();
  }

  getRecordingFormatPreference() {
    return readRecordingFormatPreference();
  }

  getLayoutWidthPreference() {
    return readLayoutWidthPreference();
  }

  getColumnLayoutPreference() {
    return readColumnLayoutPreference();
  }

  setLayoutWidthPreference(value) {
    const nextValue = persistLayoutWidthPreference(value);
    this.dom.setLayoutPreferences({
      layoutWidth: nextValue,
      columnLayout: this.getColumnLayoutPreference(),
    });
    this.ui.showToast("界面宽度已更新");
  }

  setColumnLayoutPreference(value) {
    const nextValue = persistColumnLayoutPreference(value);
    this.dom.setLayoutPreferences({
      layoutWidth: this.getLayoutWidthPreference(),
      columnLayout: nextValue,
    });
    this.ui.showToast("左右分栏已更新");
  }

  setRecordingFormatPreference(format) {
    const nextFormat = persistRecordingFormatPreference(format);
    this.dom.setRecordingFormatPreference(nextFormat);
    const label = nextFormat === "mp3" ? "MP3" : nextFormat === "webm" ? "WebM" : "M4A";
    this.ui.showToast(`新录音将优先使用 ${label}`);
  }

  updateRecycleRetentionUI() {
    const days = this.getRecycleRetentionDays();
    this.dom.setRecycleRetention(days, getRecycleRetentionText(days));
  }

  async applyRecycleRetentionPolicy({ showToast = false } = {}) {
    const removedCount = await this.recycleService.cleanupExpired(this.getRecycleRetentionDays());
    const removedItems = this.recycleService.getLastCleanedItems?.() || [];
    const removedAttachmentIds = removedItems.flatMap(getRecycleEntryAttachmentIds);
    await this.cleanupUnreferencedRecordings(removedAttachmentIds);
    this.updateRecycleRetentionUI();

    if (removedCount > 0) {
      this.recycleListView.render(this.recycleService.getRecycleItems());
      if (showToast) {
        this.ui.showToast(`已自动清理 ${removedCount} 个回收站条目`);
      }
    }

    return removedCount;
  }

  async setRecycleRetentionDays(days) {
    const nextDays = persistRecycleRetentionDays(days);
    if (nextDays === null) return;

    this.updateRecycleRetentionUI();
    const removedCount = await this.applyRecycleRetentionPolicy({ showToast: true });
    if (removedCount === 0) {
      this.ui.showToast(getRecycleRetentionText(nextDays));
    }
  }

  getLLMSettings() {
    return readLLMSettings();
  }

  getLLMProfilesSettings() {
    return readLLMProfilesSettings();
  }

  getTranscriptionSettings() {
    return readTranscriptionSettings();
  }

  getLLMDebugLog() {
    return readLLMDebugLog();
  }

  saveLLMSettings(settings) {
    const current = this.getLLMProfilesSettings();
    const activeId = settings.id || this.dom.llmProfileSelect.value || current.defaultProfileId;
    const profile = createLLMProfile({ ...settings, id: activeId });
    const profiles = current.profiles.some((item) => item.id === activeId)
      ? current.profiles.map((item) => (item.id === activeId ? profile : item))
      : [...current.profiles, profile];
    const normalized = persistLLMProfilesSettings({
      profiles,
      defaultProfileId: current.defaultProfileId || profile.id,
    });
    this.dom.setLLMProfilesSettings(normalized);
    this.dom.llmProfileSelect.value = profile.id;
    this.dom.setLLMSettings(profile);
    this.dom.setLLMInputsEnabled(settings.enabled);
    this.dom.setLLMStatus(settings.enabled ? "未测试" : "已关闭", "pending");
  }

  saveLLMProfilesSettings(settings) {
    const normalized = persistLLMProfilesSettings(settings);
    this.dom.setLLMProfilesSettings(normalized);
    this.dom.setLLMStatus("未测试", "pending");
    return normalized;
  }

  selectLLMProfile(id) {
    const settings = this.getLLMProfilesSettings();
    this.dom.setLLMProfilesSettings({ ...settings, defaultProfileId: settings.defaultProfileId });
    this.dom.llmProfileSelect.value = id;
    const profile = settings.profiles.find((item) => item.id === id) || settings.profiles[0];
    this.dom.setLLMSettings(profile || {});
    this.dom.llmSetDefaultBtn.disabled = profile?.id === settings.defaultProfileId;
    this.dom.llmDeleteProfileBtn.disabled = settings.profiles.length <= 1;
    this.dom.setLLMStatus("未测试", "pending");
  }

  addLLMProfile() {
    const settings = this.getLLMProfilesSettings();
    const profile = createLLMProfile({ name: `模型 ${settings.profiles.length + 1}` });
    const normalized = this.saveLLMProfilesSettings({
      profiles: [...settings.profiles, profile],
      defaultProfileId: settings.defaultProfileId,
    });
    this.dom.llmProfileSelect.value = profile.id;
    this.dom.setLLMSettings(profile);
    this.dom.setLLMProfilesSettings(normalized);
    this.dom.llmProfileSelect.value = profile.id;
    this.ui.showToast("已新增模型配置");
  }

  deleteActiveLLMProfile() {
    const settings = this.getLLMProfilesSettings();
    const activeId = this.dom.llmProfileSelect.value;
    if (settings.profiles.length <= 1) {
      this.ui.showToast("至少保留一个模型配置");
      return;
    }

    const profiles = settings.profiles.filter((profile) => profile.id !== activeId);
    const defaultProfileId =
      settings.defaultProfileId === activeId ? profiles[0].id : settings.defaultProfileId;
    this.saveLLMProfilesSettings({ profiles, defaultProfileId });
    this.ui.showToast("已删除模型配置");
  }

  setActiveLLMProfileDefault() {
    const settings = this.getLLMProfilesSettings();
    const activeId = this.dom.llmProfileSelect.value;
    if (!settings.profiles.some((profile) => profile.id === activeId)) return;
    this.saveLLMProfilesSettings({ ...settings, defaultProfileId: activeId });
    this.ui.showToast("已设为默认模型");
  }

  saveTranscriptionSettings(settings) {
    const nextSettings = persistTranscriptionSettings(settings);
    this.dom.setTranscriptionSettings(nextSettings);
  }

  async testLLMConnection() {
    const settings = this.dom.getLLMSettings();
    this.dom.setLLMStatus("测试中...", "pending");
    this.dom.llmTestBtn.disabled = true;

    const result = await this.llmService.testConnection(settings);
    this.dom.setLLMStatus(result.message, result.ok ? "ok" : "error");
    this.dom.llmTestBtn.disabled = !settings.enabled;
  }

  async copyLLMDebugLog() {
    const logText = this.dom.getLLMDebugLog();
    if (!logText.trim()) {
      this.ui.showToast("暂无 AI 失败日志");
      return;
    }
    await this.ui.copyText(logText);
  }

  clearLLMDebugLog() {
    removeLLMDebugLog();
    this.dom.setLLMDebugLog("");
    this.ui.showToast("AI 失败日志已清除");
  }

  forceRefresh() {
    location.reload();
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
      this.stopDraftAttachmentPlayback();
      await clearPersistentData();

      this.items = [];
      this.currentLoadedItemId = null;
      this.currentDraftAttachments = [];
      this.recycleService.deletedItems = [];

      this.dom.setDraftValue("");
      this.dom.setAutosaveState("已保存");
      this.ui.updateMeta("", [], 0, 0);

      this.dom.fontSizeSlider.value = "16";
      this.dom.fontSizeValue.textContent = "16px";
      applyLayoutWidthPreference("standard");
      applyColumnLayoutPreference("default");
      this.dom.setLayoutPreferences({ layoutWidth: "standard", columnLayout: "default" });
      this.dom.setRecycleRetention(0, getRecycleRetentionText(0));
      this.dom.setLLMProfilesSettings(this.getLLMProfilesSettings());
      this.dom.setLLMStatus("未测试", "pending");
      this.dom.setLLMDebugLog("");
      this.dom.setTranscriptionSettings(this.getTranscriptionSettings());

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

  async exportAll() {
    await this.importExportService.exportAll();
  }

  exportItem(id, format) {
    this.importExportService.exportItem(id, format);
  }

  importAll() {
    this.importExportService.importAll();
  }

  async cleanupUnreferencedRecordings(ids) {
    await deleteUnreferencedRecordings(ids, [
      this.items,
      this.recycleService.getRecycleItems(),
      this.currentDraftAttachments,
    ]);
  }

  getRecordingRecycleSourceLabel(entry) {
    if (!isRecordingRecycleEntry(entry)) return "";
    if (!entry.sourceItemId) return entry.sourceItemTitle || "草稿";
    const item = this.items.find((x) => x.id === entry.sourceItemId);
    return item ? resolveItemTitle(item) : "条目已删除";
  }

  async startRecording() {
    const transcriptionSettings = this.getTranscriptionSettings();
    const realtimeEnabled =
      transcriptionSettings.realtimeCaptionsEnabled || transcriptionSettings.realtimeDraftEnabled;
    return this.recordingService.start({
      preferredFormat: this.getRecordingFormatPreference(),
      timesliceMs: realtimeEnabled ? 15000 : 0,
      onChunk: realtimeEnabled ? (chunk) => this.handleRecordingChunk(chunk) : null,
    });
  }

  pauseRecording() {
    return this.recordingService.pause();
  }

  resumeRecording() {
    return this.recordingService.resume();
  }

  async stopRecording() {
    const attachment = await this.recordingService.stop();
    if (!attachment) return null;
    this.currentDraftAttachments = normalizeAttachments([
      ...this.currentDraftAttachments,
      attachment,
    ]);
    await saveDraftAttachments(this.currentDraftAttachments);
    return attachment;
  }

  getExpandedDraftAttachment() {
    if (!this.expandedDraftAttachmentId) return null;
    const attachment = this.currentDraftAttachments.find(
      (item) => item.id === this.expandedDraftAttachmentId
    );
    if (!attachment) {
      this.expandedDraftAttachmentId = null;
      return null;
    }
    return attachment;
  }

  getDraftAttachmentPlayerState(id) {
    if (!id) {
      return {
        playing: false,
        currentTime: 0,
        duration: 0,
        playbackRate: this.draftAttachmentPlaybackRate,
      };
    }

    const playback = this.draftAttachmentPlayback?.id === id ? this.draftAttachmentPlayback : null;
    const audio = playback?.audio;
    const attachment = this.currentDraftAttachments.find((item) => item.id === id);
    const duration =
      Number.isFinite(audio?.duration) && audio.duration > 0
        ? audio.duration
        : Number(attachment?.durationMs || 0) / 1000;
    const progress =
      this.draftAttachmentPlaybackProgress.id === id ? this.draftAttachmentPlaybackProgress : {};

    return {
      playing: Boolean(audio && !audio.paused && this.playingDraftAttachmentId === id),
      currentTime: Number.isFinite(audio?.currentTime)
        ? audio.currentTime
        : Number(progress.currentTime || 0),
      duration: duration || Number(progress.duration || 0),
      playbackRate: this.draftAttachmentPlaybackRate,
      waveform: this.draftAttachmentWaveforms.get(id) || [],
    };
  }

  renderExpandedDraftAttachmentPlayer() {
    const attachment = this.getExpandedDraftAttachment();
    this.ui.renderDraftAttachmentPlayer?.(
      attachment,
      this.getDraftAttachmentPlayerState(attachment?.id)
    );
  }

  async expandDraftAttachment(id) {
    const attachment = this.currentDraftAttachments.find((item) => item.id === id);
    if (!attachment) return;

    this.expandedDraftAttachmentId = id;
    this.renderExpandedDraftAttachmentPlayer();
    this.dom.attachmentPlayerPanel.focus?.({ preventScroll: true });
    await this.loadDraftAttachmentWaveform(id);
  }

  closeDraftAttachmentPlayer() {
    this.expandedDraftAttachmentId = null;
    this.attachmentPlayerDrag = null;
    this.renderExpandedDraftAttachmentPlayer();
  }

  startAttachmentPlayerDrag(event) {
    if (event.button !== 0 || this.dom.attachmentPlayerPanel.hidden) return;
    if (event.target?.closest?.("button, input, textarea, select, [contenteditable='true']")) {
      return;
    }

    const rect = this.dom.attachmentPlayerPanel.getBoundingClientRect();
    this.attachmentPlayerDrag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    this.dom.attachmentPlayerDragHandle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  dragAttachmentPlayer(event) {
    if (
      !this.attachmentPlayerDrag ||
      event.pointerId !== this.attachmentPlayerDrag.pointerId
    ) {
      return;
    }

    this.dom.setAttachmentPlayerPosition(
      event.clientX - this.attachmentPlayerDrag.offsetX,
      event.clientY - this.attachmentPlayerDrag.offsetY
    );
  }

  endAttachmentPlayerDrag(event) {
    if (
      !this.attachmentPlayerDrag ||
      event.pointerId !== this.attachmentPlayerDrag.pointerId
    ) {
      return;
    }

    this.dom.attachmentPlayerDragHandle.releasePointerCapture?.(event.pointerId);
    this.attachmentPlayerDrag = null;
  }

  stopDraftAttachmentPlayback(id = null, { render = false } = {}) {
    const playback = this.draftAttachmentPlayback;
    if (!playback || (id && playback.id !== id)) return;

    this.stopDraftAttachmentProgressLoop();
    playback.audio.pause();
    playback.audio.removeAttribute?.("src");
    playback.audio.load?.();
    if (playback.url) {
      URL.revokeObjectURL(playback.url);
    }

    this.draftAttachmentPlayback = null;
    this.playingDraftAttachmentId = null;
    this.draftAttachmentPlaybackProgress = { id: playback.id, currentTime: 0, duration: 0 };
    if (render) this.render();
    else this.renderExpandedDraftAttachmentPlayer();
  }

  stopDraftAttachmentProgressLoop() {
    if (this.draftAttachmentPlaybackFrame && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this.draftAttachmentPlaybackFrame);
    }
    this.draftAttachmentPlaybackFrame = null;
  }

  startDraftAttachmentProgressLoop(id) {
    if (typeof requestAnimationFrame !== "function") return;
    this.stopDraftAttachmentProgressLoop();

    const tick = () => {
      const playback = this.draftAttachmentPlayback;
      if (!playback || playback.id !== id || playback.audio.paused) {
        this.draftAttachmentPlaybackFrame = null;
        return;
      }

      this.updateDraftAttachmentPlaybackProgress(id);
      this.draftAttachmentPlaybackFrame = requestAnimationFrame(tick);
    };

    this.draftAttachmentPlaybackFrame = requestAnimationFrame(tick);
  }

  updateDraftAttachmentPlaybackProgress(id) {
    const playback = this.draftAttachmentPlayback?.id === id ? this.draftAttachmentPlayback : null;
    if (!playback) return;

    const audio = playback.audio;
    const attachment = this.currentDraftAttachments.find((item) => item.id === id);
    const duration =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : Number(attachment?.durationMs || 0) / 1000;

    this.draftAttachmentPlaybackProgress = {
      id,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      duration,
    };
    this.renderExpandedDraftAttachmentPlayer();
  }

  async ensureDraftAttachmentAudio(id) {
    if (this.draftAttachmentPlayback?.id === id) {
      return this.draftAttachmentPlayback.audio;
    }

    this.stopDraftAttachmentPlayback();

    const record = await loadRecording(id);
    if (!record?.blob) {
      this.ui.showToast("录音文件不存在");
      return null;
    }

    const url = URL.createObjectURL(record.blob);
    const audio = new Audio(url);
    audio.playbackRate = this.draftAttachmentPlaybackRate;
    this.draftAttachmentPlayback = { id, audio, url };

    audio.onloadedmetadata = () => {
      this.updateDraftAttachmentPlaybackProgress(id);
    };
    audio.ontimeupdate = () => {
      this.updateDraftAttachmentPlaybackProgress(id);
    };
    audio.onended = () => {
      this.stopDraftAttachmentPlayback(id, { render: true });
    };
    audio.onerror = () => {
      this.stopDraftAttachmentPlayback(id, { render: true });
      this.ui.showToast("播放录音失败");
    };

    return audio;
  }

  async toggleDraftAttachmentPlayback(id) {
    try {
      const playback = this.draftAttachmentPlayback;
      if (playback?.id === id) {
        if (playback.audio.paused) {
          try {
            await playback.audio.play();
            this.playingDraftAttachmentId = id;
            this.updateDraftAttachmentPlaybackProgress(id);
            this.startDraftAttachmentProgressLoop(id);
          } catch (error) {
            console.error("播放录音失败", error);
            this.stopDraftAttachmentPlayback(id);
            this.ui.showToast("播放录音失败");
          }
        } else {
          playback.audio.pause();
          this.playingDraftAttachmentId = null;
          this.stopDraftAttachmentProgressLoop();
          this.updateDraftAttachmentPlaybackProgress(id);
        }
        this.render();
        return;
      }

      const audio = await this.ensureDraftAttachmentAudio(id);
      if (!audio) return;
      await audio.play();
      this.playingDraftAttachmentId = id;
      this.updateDraftAttachmentPlaybackProgress(id);
      this.startDraftAttachmentProgressLoop(id);
      this.render();
    } catch (error) {
      console.error("播放录音失败", error);
      this.stopDraftAttachmentPlayback(id);
      this.ui.showToast("播放录音失败");
    }
  }

  async seekDraftAttachmentPlayback(progress) {
    const id = this.expandedDraftAttachmentId;
    if (!id) return;

    try {
      const audio = await this.ensureDraftAttachmentAudio(id);
      if (!audio) return;
      const attachment = this.currentDraftAttachments.find((item) => item.id === id);
      const duration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : Number(attachment?.durationMs || 0) / 1000;
      if (duration > 0) {
        audio.currentTime = Math.min(Math.max(Number(progress || 0), 0), 1) * duration;
      }
      this.updateDraftAttachmentPlaybackProgress(id);
      this.render();
    } catch (error) {
      console.error("跳转录音失败", error);
      this.ui.showToast("跳转录音失败");
    }
  }

  cycleDraftAttachmentPlaybackRate() {
    this.draftAttachmentPlaybackRate = cyclePlaybackRate(this.draftAttachmentPlaybackRate);
    if (this.draftAttachmentPlayback?.audio) {
      this.draftAttachmentPlayback.audio.playbackRate = this.draftAttachmentPlaybackRate;
    }
    this.renderExpandedDraftAttachmentPlayer();
  }

  onAttachmentPlayerKeyDown(e) {
    if (!this.expandedDraftAttachmentId || (e.key !== " " && e.code !== "Space")) return;
    if (!this.dom.attachmentPlayerPanel.contains?.(e.target)) return;

    e.preventDefault();
    e.stopPropagation();
    this.toggleDraftAttachmentPlayback(this.expandedDraftAttachmentId);
  }

  async loadDraftAttachmentWaveform(id) {
    if (this.draftAttachmentWaveforms.has(id)) {
      this.renderExpandedDraftAttachmentPlayer();
      return this.draftAttachmentWaveforms.get(id);
    }

    try {
      const record = await loadRecording(id);
      const blob = record?.blob;
      const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!blob?.arrayBuffer || typeof AudioContextCtor !== "function") {
        this.draftAttachmentWaveforms.set(id, []);
        this.renderExpandedDraftAttachmentPlayer();
        return [];
      }

      const context = new AudioContextCtor();
      const buffer = await blob.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(buffer.slice(0));
      const channelData = audioBuffer.getChannelData(0);
      const waveform = buildWaveformBuckets(channelData);
      await context.close?.();
      this.draftAttachmentWaveforms.set(id, waveform);
      this.renderExpandedDraftAttachmentPlayer();
      return waveform;
    } catch (error) {
      console.warn("生成录音波形失败", error);
      this.draftAttachmentWaveforms.set(id, []);
      this.renderExpandedDraftAttachmentPlayer();
      return [];
    }
  }

  async renameDraftAttachment(id, name) {
    const nextName = String(name || "").trim() || "录音";
    let changed = false;

    this.currentDraftAttachments = normalizeAttachments(
      this.currentDraftAttachments.map((attachment) => {
        if (attachment.id !== id || attachment.name === nextName) {
          return attachment;
        }
        changed = true;
        return { ...attachment, name: nextName };
      })
    );

    if (!changed) {
      this.render();
      return;
    }

    await saveDraftAttachments(this.currentDraftAttachments);
    this.render();
  }

  async exportDraftAttachment(id) {
    const attachment = this.currentDraftAttachments.find((item) => item.id === id);
    if (!attachment) {
      this.ui.showToast("录音附件不存在");
      return;
    }

    try {
      const record = await loadRecording(id);
      if (!record?.blob) {
        this.ui.showToast("录音文件不存在");
        return;
      }

      const blob =
        record.blob.type || !record.mimeType
          ? record.blob
          : new Blob([record.blob], { type: record.mimeType });
      const filename = getRecordingExportFilename(attachment, Date.now(), {
        record,
        preferredFormat: this.getRecordingFormatPreference(),
      });
      downloadBlobFile(blob, filename);
      const exportedExt = filename.split(".").pop();
      this.ui.showToast(
        exportedExt === this.getRecordingFormatPreference() ? "已导出录音" : "已按原格式导出录音"
      );
    } catch (error) {
      console.error("导出录音失败", error);
      this.ui.showToast("导出录音失败");
    }
  }

  async transcribeDraftAttachment(id, { silent = false } = {}) {
    const attachment = this.currentDraftAttachments.find((item) => item.id === id);
    if (!attachment) {
      this.ui.showToast("录音附件不存在");
      return null;
    }

    const record = await loadRecording(id);
    if (!record?.blob) {
      this.ui.showToast("录音文件不存在");
      return null;
    }

    if (!silent) {
      this.ui.showToast("正在转录录音...");
    }
    await updateRecordingTranscription(id, {
      provider: this.getTranscriptionSettings().provider,
      status: TRANSCRIPTION_STATUS.RUNNING,
      error: "",
    });

    const result = await this.transcriptionService.transcribeRecording(
      record,
      this.getTranscriptionSettings()
    );
    const nextRecord = await updateRecordingTranscription(id, result.transcription);
    this.renderExpandedDraftAttachmentPlayer();
    if (!silent) {
      this.ui.showToast(result.message);
    }
    return nextRecord?.transcription || result.transcription;
  }

  async insertDraftAttachmentTranscription(id) {
    const record = await loadRecording(id);
    const text = record?.transcription?.text || "";
    if (!text.trim()) {
      this.ui.showToast("暂无转录文本");
      return;
    }
    this.insertTextToDraft(text);
    this.ui.showToast("已插入转录文本");
  }

  async generateDraftAttachmentSummary(id) {
    const record = await loadRecording(id);
    const text = record?.transcription?.text || "";
    if (!text.trim()) {
      this.ui.showToast("请先转录录音");
      return;
    }

    this.ui.showToast("正在生成摘要...");
    const result = await this.llmService.generateSummary(this.getLLMSettings(), text);
    if (!result.ok) {
      this.ui.showToast(result.message);
      return;
    }

    await updateRecordingTranscription(id, {
      ...record.transcription,
      summary: result.summary,
      updatedAt: Date.now(),
    });
    this.ui.showToast("摘要已生成");
  }

  async insertDraftAttachmentSummary(id) {
    const record = await loadRecording(id);
    const summary = record?.transcription?.summary || "";
    if (!summary.trim()) {
      this.ui.showToast("暂无摘要文本");
      return;
    }
    this.insertTextToDraft(summary);
    this.ui.showToast("已插入摘要文本");
  }

  insertTextToDraft(text) {
    const value = String(text || "").trim();
    if (!value) return;
    const draft = this.dom.draft;
    const current = this.dom.getDraftValue();
    const start = Number.isFinite(draft.selectionStart) ? draft.selectionStart : current.length;
    const end = Number.isFinite(draft.selectionEnd) ? draft.selectionEnd : start;
    const prefix = start > 0 && !current.slice(0, start).endsWith("\n") ? "\n\n" : "";
    const suffix = end < current.length && !current.slice(end).startsWith("\n") ? "\n\n" : "";
    const nextValue = `${current.slice(0, start)}${prefix}${value}${suffix}${current.slice(end)}`;
    const nextCursor = start + prefix.length + value.length;
    this.dom.setDraftValue(nextValue);
    draft.selectionStart = nextCursor;
    draft.selectionEnd = nextCursor;
    this.onDraftInput();
    this.ui.updateDraftPreview();
    this.render();
  }

  startLiveTranscriptionState() {
    const settings = this.getTranscriptionSettings();
    const enabled = settings.realtimeCaptionsEnabled || settings.realtimeDraftEnabled;
    this.liveTranscription = {
      enabled,
      insertToDraft: settings.realtimeDraftEnabled === true,
      text: "",
      queue: Promise.resolve(),
    };
    this.dom.setDraftInputLocked?.(settings.realtimeDraftEnabled === true);
    this.dom.setRecordingLiveText?.(enabled ? "实时转录准备中..." : "");
  }

  stopLiveTranscriptionState() {
    this.liveTranscription = {
      enabled: false,
      insertToDraft: false,
      text: "",
      queue: Promise.resolve(),
    };
    this.dom.setDraftInputLocked?.(false);
    this.dom.setRecordingLiveText?.("");
  }

  handleRecordingChunk(chunk) {
    if (!this.liveTranscription.enabled || !chunk?.size) return;
    const settings = this.getTranscriptionSettings();
    this.liveTranscription.queue = this.liveTranscription.queue
      .then(async () => {
        const result = await this.transcriptionService.transcribeBlob(chunk, settings);
        const text = result.transcription?.text || "";
        if (!result.ok || !text.trim()) return;

        const nextText = this.liveTranscription.text
          ? `${this.liveTranscription.text}\n${text.trim()}`
          : text.trim();
        this.liveTranscription.text = nextText;
        this.dom.setRecordingLiveText?.(nextText);
        if (this.liveTranscription.insertToDraft) {
          this.insertTextToDraft(text.trim());
        }
      })
      .catch((error) => {
        console.warn("实时转录分段失败", error);
      });
  }

  getRecordingElapsedMs() {
    const state = this.recordingUi;
    if (!state.active) return 0;
    const pausedDuration = state.paused && state.pausedAt ? Date.now() - state.pausedAt : 0;
    return Math.max(0, Date.now() - state.startedAt - state.pausedMs - pausedDuration);
  }

  updateRecordingPanel() {
    this.dom.setRecordingPanelState({
      state: this.recordingUi.paused ? "paused" : "recording",
      timer: formatRecordingTimer(this.getRecordingElapsedMs()),
      stopping: this.recordingUi.stopping,
    });
  }

  startRecordingTimer() {
    this.stopRecordingTimer();
    this.updateRecordingPanel();
    this.recordingUi.timerId = setInterval(() => {
      this.updateRecordingPanel();
    }, 500);
  }

  stopRecordingTimer() {
    if (this.recordingUi.timerId) {
      clearInterval(this.recordingUi.timerId);
      this.recordingUi.timerId = null;
    }
  }

  resetRecordingUi() {
    this.stopRecordingTimer();
    this.recordingUi = {
      active: false,
      paused: false,
      stopping: false,
      startedAt: 0,
      pausedAt: 0,
      pausedMs: 0,
      timerId: null,
    };
    this.recordingDrag = null;
    this.dom.setRecordingPanelVisible(false);
    this.dom.setRecordingLauncherDisabled(false);
    this.dom.setRecordingPanelState({ state: "recording", timer: "00:00", stopping: false });
    this.stopLiveTranscriptionState();
  }

  async beginDraftRecording() {
    if (this.recordingUi.active) return { ok: false, message: "录音已在进行中" };

    this.dom.setRecordingLauncherDisabled(true);
    this.startLiveTranscriptionState();

    try {
      const result = await this.startRecording();
      if (!result?.ok) {
        this.dom.setRecordingLauncherDisabled(false);
        this.stopLiveTranscriptionState();
        this.ui.showToast(result?.message || "录音启动失败");
        return result;
      }

      this.recordingUi = {
        active: true,
        paused: false,
        stopping: false,
        startedAt: Date.now(),
        pausedAt: 0,
        pausedMs: 0,
        timerId: null,
      };
      this.dom.setRecordingPanelVisible(true);
      this.startRecordingTimer();
      return result;
    } catch (error) {
      console.error("录音启动失败", error);
      this.resetRecordingUi();
      this.ui.showToast("录音启动失败");
      return { ok: false, message: "录音启动失败" };
    }
  }

  toggleDraftRecordingPause() {
    if (!this.recordingUi.active || this.recordingUi.stopping) return false;

    if (this.recordingUi.paused) {
      const resumed = this.resumeRecording();
      if (!resumed) return false;
      if (this.recordingUi.pausedAt) {
        this.recordingUi.pausedMs += Date.now() - this.recordingUi.pausedAt;
      }
      this.recordingUi.paused = false;
      this.recordingUi.pausedAt = 0;
    } else {
      const paused = this.pauseRecording();
      if (!paused) return false;
      this.recordingUi.paused = true;
      this.recordingUi.pausedAt = Date.now();
    }

    this.updateRecordingPanel();
    return true;
  }

  async finishDraftRecording() {
    if (!this.recordingUi.active || this.recordingUi.stopping) return null;

    this.recordingUi.stopping = true;
    this.updateRecordingPanel();
    this.stopRecordingTimer();

    try {
      const attachment = await this.stopRecording();
      const liveText = (this.liveTranscription?.text || "").trim();
      if (attachment && this.liveTranscription?.enabled) {
        this.dom.setRecordingLiveText?.(liveText || "正在整理转录...");
        await this.liveTranscription.queue;
        const finalLiveText = (this.liveTranscription?.text || "").trim();
        if (finalLiveText) {
          await updateRecordingTranscription(attachment.id, {
            text: finalLiveText,
            provider: this.getTranscriptionSettings().provider,
            model: this.getTranscriptionSettings().provider === "openai"
              ? this.getTranscriptionSettings().openaiFileModel
              : "Xenova/whisper-tiny",
            status: TRANSCRIPTION_STATUS.DONE,
            updatedAt: Date.now(),
          });
        } else {
          const transcription = await this.transcribeDraftAttachment(attachment.id, { silent: true });
          if (this.liveTranscription.insertToDraft && transcription?.text) {
            this.insertTextToDraft(transcription.text);
          }
        }
      }
      this.resetRecordingUi();
      this.render();

      if (attachment) {
        this.ui.showToast("录音已保存到当前草稿");
      } else {
        this.ui.showToast("录音未保存");
      }

      return attachment;
    } catch (error) {
      console.error("录音保存失败", error);
      this.resetRecordingUi();
      this.render();
      this.ui.showToast("录音保存失败");
      return null;
    }
  }

  startRecordingPanelDrag(event) {
    if (!this.recordingUi.active || event.button !== 0) return;

    const rect = this.dom.recordingFloatingPanel.getBoundingClientRect();
    this.recordingDrag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    this.dom.recordingDragHandle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  dragRecordingPanel(event) {
    if (!this.recordingDrag || event.pointerId !== this.recordingDrag.pointerId) return;

    this.dom.setRecordingPanelPosition(
      event.clientX - this.recordingDrag.offsetX,
      event.clientY - this.recordingDrag.offsetY
    );
  }

  endRecordingPanelDrag(event) {
    if (!this.recordingDrag || event.pointerId !== this.recordingDrag.pointerId) return;

    this.dom.recordingDragHandle.releasePointerCapture?.(event.pointerId);
    this.recordingDrag = null;
  }

  async cancelRecording() {
    return this.recordingService.cancel();
  }

  async deleteDraftAttachment(id) {
    this.stopDraftAttachmentPlayback(id);
    const removedAttachment = this.currentDraftAttachments.find(
      (attachment) => attachment.id === id
    );
    if (!removedAttachment) return;

    const sourceItem = this.currentLoadedItemId
      ? this.items.find((item) => item.id === this.currentLoadedItemId)
      : null;
    await this.recycleService.addRecordingToRecycle({
      attachment: removedAttachment,
      sourceItemId: sourceItem?.id || "",
      sourceItemTitle: sourceItem ? resolveItemTitle(sourceItem) : "草稿",
      sourceDraftContent: this.dom.getDraftValue(),
    });

    this.currentDraftAttachments = this.currentDraftAttachments.filter(
      (attachment) => attachment.id !== id
    );
    if (this.expandedDraftAttachmentId === id) {
      this.expandedDraftAttachmentId = null;
    }
    await saveDraftAttachments(this.currentDraftAttachments);
    this.render();
    this.recycleListView.render(this.recycleService.getRecycleItems());
    this.ui.showToast("录音已移入回收站");
  }

  setDraftMode(mode) {
    const nextMode = persistDraftMode(mode);
    this.draftMode = nextMode;
    this.ui.setDraftMode(nextMode);
  }

  onDraftPreviewClick(e) {
    if (e.target.closest("a")) return;
    this.ui.showToast("预览模式无法编辑，请切换到编辑模式");
  }

  onSearchInput() {
    this.render();
  }

  toggleFavoriteFilter() {
    this.dom.setFavoriteFilterEnabled(!this.dom.getFavoriteFilterEnabled());
    this.render();
  }

  setTagFilter(tag) {
    this.dom.setActiveTagFilter(tag);
    this.render();
  }

  clearArchiveFilters() {
    this.dom.setSearchValue("");
    this.dom.setFavoriteFilterEnabled(false);
    this.dom.setActiveTagFilter("");
    this.dom.setArchiveFilterMenuOpen(false);
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
