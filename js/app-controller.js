/**
 * 应用总协调器
 */

import { clearDraftItemId, loadDraft, loadDraftItemId } from "./storage/draft-storage.js";
import {
  loadDraftAttachments,
  saveDraftAttachments,
} from "./storage/draft-attachments-storage.js";
import { loadItems } from "./storage/item-storage.js";
import { deleteUnreferencedRecordings, loadRecording } from "./storage/recording-storage.js";
import { normalizeAttachments } from "./lib/attachment-utils.js";
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
import {
  applyFontSize,
  clearPersistentData,
  getDraftMode as readDraftMode,
  getFontSize as readFontSize,
  getLLMDebugLog as readLLMDebugLog,
  getLLMSettings as readLLMSettings,
  getRecycleRetentionDays as readRecycleRetentionDays,
  getRecycleRetentionText,
  clearLLMDebugLog as removeLLMDebugLog,
  saveLLMSettings as persistLLMSettings,
  setDraftMode as persistDraftMode,
  setFontSize as persistFontSize,
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
    this.draftAttachmentPlayback = null;
    this.playingDraftAttachmentId = null;
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
    this.dom.setLLMSettings(this.getLLMSettings());
    this.dom.setLLMStatus("未测试", "pending");
    this.dom.setLLMDebugLog(this.getLLMDebugLog());
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

  getLLMDebugLog() {
    return readLLMDebugLog();
  }

  saveLLMSettings(settings) {
    persistLLMSettings(settings);
    this.dom.setLLMInputsEnabled(settings.enabled);
    this.dom.setLLMStatus(settings.enabled ? "未测试" : "已关闭", "pending");
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
      this.dom.setRecycleRetention(0, getRecycleRetentionText(0));
      this.dom.setLLMSettings({ enabled: false, baseUrl: "", apiKey: "", model: "" });
      this.dom.setLLMStatus("未测试", "pending");
      this.dom.setLLMDebugLog("");

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
    return this.recordingService.start();
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

  stopDraftAttachmentPlayback(id = null, { render = false } = {}) {
    const playback = this.draftAttachmentPlayback;
    if (!playback || (id && playback.id !== id)) return;

    playback.audio.pause();
    playback.audio.removeAttribute?.("src");
    playback.audio.load?.();
    if (playback.url) {
      URL.revokeObjectURL(playback.url);
    }

    this.draftAttachmentPlayback = null;
    this.playingDraftAttachmentId = null;
    if (render) this.render();
  }

  async toggleDraftAttachmentPlayback(id) {
    const playback = this.draftAttachmentPlayback;

    if (playback?.id === id) {
      if (playback.audio.paused) {
        try {
          await playback.audio.play();
          this.playingDraftAttachmentId = id;
        } catch (error) {
          console.error("播放录音失败", error);
          this.stopDraftAttachmentPlayback(id);
          this.ui.showToast("播放录音失败");
        }
      } else {
        playback.audio.pause();
        this.playingDraftAttachmentId = null;
      }
      this.render();
      return;
    }

    this.stopDraftAttachmentPlayback();

    try {
      const record = await loadRecording(id);
      if (!record?.blob) {
        this.ui.showToast("录音文件不存在");
        return;
      }

      const url = URL.createObjectURL(record.blob);
      const audio = new Audio(url);
      this.draftAttachmentPlayback = { id, audio, url };

      audio.onended = () => {
        this.stopDraftAttachmentPlayback(id, { render: true });
      };
      audio.onerror = () => {
        this.stopDraftAttachmentPlayback(id, { render: true });
        this.ui.showToast("播放录音失败");
      };

      await audio.play();
      this.playingDraftAttachmentId = id;
      this.render();
    } catch (error) {
      console.error("播放录音失败", error);
      this.stopDraftAttachmentPlayback(id);
      this.ui.showToast("播放录音失败");
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
      downloadBlobFile(blob, getRecordingExportFilename(attachment));
      this.ui.showToast("已导出录音");
    } catch (error) {
      console.error("导出录音失败", error);
      this.ui.showToast("导出录音失败");
    }
  }

  transcribeDraftAttachment() {
    this.ui.showToast("转录功能待接入");
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
  }

  async beginDraftRecording() {
    if (this.recordingUi.active) return { ok: false, message: "录音已在进行中" };

    this.dom.setRecordingLauncherDisabled(true);

    try {
      const result = await this.startRecording();
      if (!result?.ok) {
        this.dom.setRecordingLauncherDisabled(false);
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
