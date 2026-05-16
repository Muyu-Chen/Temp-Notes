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

  domManager.recycleRetentionSelect.addEventListener("change", (e) => {
    appController.setRecycleRetentionDays(e.target.value);
  });

  domManager.recycleSearch.addEventListener("input", () => {
    appController.onRecycleSearch();
  });

  const saveLLMSettings = () => {
    const settings = domManager.getLLMSettings();
    appController.saveLLMSettings(settings);
  };

  domManager.llmEnabled.addEventListener("change", saveLLMSettings);

  [domManager.llmBaseUrl, domManager.llmApiKey, domManager.llmModel].forEach((input) => {
    input.addEventListener("input", () => {
      saveLLMSettings();
    });
  });

  domManager.llmTestBtn.addEventListener("click", () => {
    appController.testLLMConnection();
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

  document.addEventListener("keydown", (e) => {
    appController.onKeyDown(e);
  });
};
