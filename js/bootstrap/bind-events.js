/**
 * 应用事件绑定
 */

export const bindAppEvents = ({ domManager, uiController, appController }) => {
  domManager.draft.addEventListener("input", () => {
    appController.onDraftInput();
  });

  domManager.search.addEventListener("input", () => {
    appController.onSearchInput();
  });

  domManager.archiveFilterToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    domManager.setArchiveFilterMenuOpen(!domManager.getArchiveFilterMenuOpen());
  });

  domManager.archiveSearchTools.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    domManager.setArchiveFilterMenuOpen(false);
  });

  domManager.favoriteFilterBtn.addEventListener("click", () => {
    appController.toggleFavoriteFilter();
  });

  domManager.activeTagFilterBtn.addEventListener("click", () => {
    appController.setTagFilter("");
  });

  domManager.btnArchive.addEventListener("click", () => {
    appController.archiveDraft();
  });

  domManager.btnNew.addEventListener("click", () => {
    appController.newDraft();
  });

  domManager.btnCopy.addEventListener("click", () => {
    uiController.copyText(domManager.getDraftValue() || "");
  });

  domManager.btnClearDraft.addEventListener("click", () => {
    appController.clearDraft();
  });

  domManager.btnMarkdownEdit.addEventListener("click", () => {
    appController.setDraftMode("edit");
  });

  domManager.btnMarkdownPreview.addEventListener("click", () => {
    appController.setDraftMode("preview");
  });

  domManager.btnDraftGenerateTags.addEventListener("click", () => {
    appController.generateDraftTags();
  });

  domManager.btnRecordDraft.addEventListener("click", () => {
    appController.beginDraftRecording();
  });

  domManager.btnRecordingPause.addEventListener("click", () => {
    appController.toggleDraftRecordingPause();
  });

  domManager.btnRecordingStop.addEventListener("click", () => {
    appController.finishDraftRecording();
  });

  domManager.recordingDragHandle.addEventListener("pointerdown", (e) => {
    appController.startRecordingPanelDrag(e);
  });

  domManager.attachmentPlayerDragHandle.addEventListener("pointerdown", (e) => {
    appController.startAttachmentPlayerDrag(e);
  });

  document.addEventListener("pointermove", (e) => {
    appController.dragRecordingPanel(e);
    appController.dragAttachmentPlayer(e);
  });

  document.addEventListener("pointerup", (e) => {
    appController.endRecordingPanelDrag(e);
    appController.endAttachmentPlayerDrag(e);
  });

  domManager.draftPreview.addEventListener("click", (e) => {
    appController.onDraftPreviewClick(e);
  });

  domManager.btnMore.addEventListener("click", () => {
    appController.openMorePanel();
  });

  domManager.moreModalClose.addEventListener("click", () => {
    appController.closeMorePanel();
  });

  domManager.moreModalOverlay.addEventListener("click", () => {
    appController.closeMorePanel();
  });

  domManager.sidebarRecycle.addEventListener("click", () => {
    appController.switchPanel("recycle");
  });

  domManager.sidebarImportExport.addEventListener("click", () => {
    appController.switchPanel("importExport");
  });

  domManager.sidebarSettings.addEventListener("click", () => {
    appController.switchPanel("settings");
  });

  domManager.recycleClearAll.addEventListener("click", () => {
    appController.clearRecycleBin();
  });

  domManager.exportBtn.addEventListener("click", () => {
    appController.exportAll();
  });

  domManager.importBtn.addEventListener("click", () => {
    appController.importAll();
  });

  domManager.btnTheme.addEventListener("click", () => {
    appController.onThemeToggle();
  });

  domManager.fontSizeSlider.addEventListener("input", (e) => {
    appController.setFontSize(e.target.value);
  });

  domManager.layoutWidthSelect.addEventListener("change", (e) => {
    appController.setLayoutWidthPreference(e.target.value);
  });

  domManager.columnLayoutSelect.addEventListener("change", (e) => {
    appController.setColumnLayoutPreference(e.target.value);
  });

  domManager.recycleRetentionSelect.addEventListener("change", (e) => {
    appController.setRecycleRetentionDays(e.target.value);
  });

  domManager.recordingFormatSelect.addEventListener("change", (e) => {
    appController.setRecordingFormatPreference(e.target.value);
  });

  domManager.recycleSearch.addEventListener("input", () => {
    appController.onRecycleSearch();
  });

  const saveLLMSettings = () => {
    const settings = domManager.getLLMSettings();
    appController.saveLLMSettings(settings);
  };

  domManager.llmProfileSelect.addEventListener("change", (e) => {
    appController.selectLLMProfile(e.target.value);
  });

  domManager.llmAddProfileBtn.addEventListener("click", () => {
    appController.addLLMProfile();
  });

  domManager.llmSetDefaultBtn.addEventListener("click", () => {
    appController.setActiveLLMProfileDefault();
  });

  domManager.llmDeleteProfileBtn.addEventListener("click", () => {
    appController.deleteActiveLLMProfile();
  });

  domManager.llmEnabled.addEventListener("change", saveLLMSettings);

  [domManager.llmProfileName, domManager.llmBaseUrl, domManager.llmApiKey, domManager.llmModel].forEach((input) => {
    input.addEventListener("input", () => {
      saveLLMSettings();
    });
  });

  domManager.llmTestBtn.addEventListener("click", () => {
    appController.testLLMConnection();
  });

  domManager.llmCopyLogBtn.addEventListener("click", () => {
    appController.copyLLMDebugLog();
  });

  domManager.llmClearLogBtn.addEventListener("click", () => {
    appController.clearLLMDebugLog();
  });

  [
    domManager.transcriptionProviderSelect,
    domManager.localWhisperModelSelect,
    domManager.transcriptionLanguage,
    domManager.openaiSttApiKey,
    domManager.openaiSttFileModel,
    domManager.realtimeDelaySelect,
    domManager.realtimeCaptionsEnabled,
    domManager.realtimeDraftEnabled,
  ].forEach((input) => {
    input.addEventListener("change", () => {
      appController.saveTranscriptionSettings(domManager.getTranscriptionSettings());
    });
    input.addEventListener("input", () => {
      appController.saveTranscriptionSettings(domManager.getTranscriptionSettings());
    });
  });

  domManager.btnForceRefresh.addEventListener("click", () => {
    appController.forceRefresh();
  });

  domManager.btnClearAllData.addEventListener("click", () => {
    appController.clearAllData();
  });

  uiController.onItemLoadClick = (id) => {
    appController.loadToDraft(id);
  };

  uiController.onItemDeleteClick = (id) => {
    appController.deleteItem(id);
  };

  uiController.onItemEncryptClick = (id) => {
    appController.encryptItem(id);
  };

  uiController.onItemDecryptClick = (id) => {
    appController.decryptItem(id);
  };

  uiController.onItemExportClick = (id, format) => {
    appController.exportItem(id, format);
  };

  uiController.onItemTitleEdit = (id, title) => {
    appController.renameItemTitle(id, title);
  };

  uiController.onItemPinToggle = (id) => {
    appController.toggleItemPinned(id);
  };

  uiController.onItemFavoriteToggle = (id) => {
    appController.toggleItemFavorite(id);
  };

  uiController.onItemTagsEdit = (id) => {
    appController.editItemTags(id);
  };

  uiController.onItemGenerateTags = (id) => {
    appController.generateItemTags(id);
  };

  uiController.onTagFilterClick = (tag) => {
    appController.setTagFilter(tag);
  };

  uiController.onDraftAttachmentDelete = (id) => {
    appController.deleteDraftAttachment(id);
  };

  uiController.onDraftAttachmentPlay = (id) => {
    appController.toggleDraftAttachmentPlayback(id);
  };

  uiController.onDraftAttachmentRename = (id, name) => {
    appController.renameDraftAttachment(id, name);
  };

  uiController.onDraftAttachmentExport = (id) => {
    appController.exportDraftAttachment(id);
  };

  uiController.onDraftAttachmentTranscribe = (id) => {
    appController.transcribeDraftAttachment(id);
  };

  uiController.onDraftAttachmentInsertTranscription = (id) => {
    appController.insertDraftAttachmentTranscription(id);
  };

  uiController.onDraftAttachmentGenerateSummary = (id) => {
    appController.generateDraftAttachmentSummary(id);
  };

  uiController.onDraftAttachmentInsertSummary = (id) => {
    appController.insertDraftAttachmentSummary(id);
  };

  uiController.onDraftAttachmentExpand = (id) => {
    appController.expandDraftAttachment(id);
  };

  uiController.onDraftAttachmentSeek = (progress) => {
    appController.seekDraftAttachmentPlayback(progress);
  };

  uiController.onArchiveFiltersClear = () => {
    appController.clearArchiveFilters();
  };

  domManager.attachmentPlayerClose.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });

  domManager.attachmentPlayerClose.addEventListener("click", (e) => {
    e.stopPropagation();
    appController.closeDraftAttachmentPlayer();
  });

  domManager.attachmentPlayerPlay.addEventListener("click", () => {
    if (appController.expandedDraftAttachmentId) {
      appController.toggleDraftAttachmentPlayback(appController.expandedDraftAttachmentId);
    }
  });

  domManager.attachmentPlayerSeek.addEventListener("input", (e) => {
    appController.seekDraftAttachmentPlayback(Number(e.target.value || 0) / 1000);
  });

  domManager.attachmentPlayerSpeed.addEventListener("click", () => {
    appController.cycleDraftAttachmentPlaybackRate();
  });

  domManager.attachmentPlayerTranscribe.addEventListener("click", () => {
    if (appController.expandedDraftAttachmentId) {
      appController.transcribeDraftAttachment(appController.expandedDraftAttachmentId);
    }
  });

  domManager.attachmentPlayerExport.addEventListener("click", () => {
    if (appController.expandedDraftAttachmentId) {
      appController.exportDraftAttachment(appController.expandedDraftAttachmentId);
    }
  });

  domManager.attachmentPlayerMore.addEventListener("click", (e) => {
    e.stopPropagation();
    const attachment = appController.getExpandedDraftAttachment();
    if (attachment) {
      uiController.showAttachmentPlayerMoreMenu(attachment, domManager.attachmentPlayerMore);
    }
  });

  domManager.attachmentPlayerPanel.addEventListener("keydown", (e) => {
    appController.onAttachmentPlayerKeyDown(e);
  });

  document.addEventListener("keydown", (e) => {
    appController.onKeyDown(e);
  });
};
