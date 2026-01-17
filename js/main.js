/**
 * 应用入口和事件绑定
 */

import { DOMManager } from "./dom-manager.js";
import { UIController } from "./ui-controller.js";
import { AppController } from "./app-controller.js";
import { loadTheme } from "./storage.js";

// 初始化应用
async function initApp() {
  // 创建控制器实例
  const domManager = new DOMManager();
  const uiController = new UIController(domManager);
  const appController = new AppController(uiController, domManager);

  // 初始化回收站（从IndexedDB加载数据）
  await appController.recycleManager.init();

  // 加载并设置主题
  const theme = await loadTheme();
  uiController.updateTheme(theme);

  // 绑定事件监听器
  domManager.draft.addEventListener("input", () => {
    appController.onDraftInput();
  });

  domManager.search.addEventListener("input", () => {
    appController.onSearchInput();
  });

  domManager.btnArchive.addEventListener("click", () => {
    appController.archiveDraft();
  });

  domManager.btnCopy.addEventListener("click", () => {
    uiController.copyText(domManager.getDraftValue() || "");
  });

  domManager.btnClearDraft.addEventListener("click", () => {
    appController.clearDraft();
  });

  domManager.btnMore.addEventListener("click", () => {
    appController.openMorePanel();
  });

  // 更多功能面板相关的事件
  domManager.moreModalClose.addEventListener("click", () => {
    appController.closeMorePanel();
  });

  domManager.moreModalOverlay.addEventListener("click", () => {
    appController.closeMorePanel();
  });

  // 侧边栏菜单项
  domManager.sidebarRecycle.addEventListener("click", () => {
    appController.switchPanel("recycle");
  });

  domManager.sidebarImportExport.addEventListener("click", () => {
    appController.switchPanel("importExport");
  });

  domManager.sidebarSettings.addEventListener("click", () => {
    appController.switchPanel("settings");
  });

  // 回收站按钮
  domManager.recycleClearAll.addEventListener("click", () => {
    appController.clearRecycleBin();
  });

  // 设置回收站相关的事件回调
  uiController.onRecycleItemRestore = (index) => {
    appController.restoreFromRecycle(index);
  };

  uiController.onRecycleItemDelete = (index) => {
    appController.deleteFromRecycle(index);
  };

  // 面板内导入导出按钮
  domManager.exportBtn.addEventListener("click", () => {
    appController.exportAll();
  });

  domManager.importBtn.addEventListener("click", () => {
    appController.importAll();
  });

  domManager.btnTheme.addEventListener("click", () => {
    appController.onThemeToggle();
  });

  // 字体大小滑块
  domManager.fontSizeSlider.addEventListener("input", (e) => {
    appController.setFontSize(e.target.value);
  });

  // 设置UI控制器的事件回调
  uiController.onItemLoadClick = (id) => {
    appController.loadToDraft(id);
  };

  uiController.onItemDeleteClick = (id) => {
    appController.deleteItem(id); // 异步，无需等待
  };

  uiController.onItemEncryptClick = (id) => {
    appController.encryptItem(id);
  };

  uiController.onItemDecryptClick = (id) => {
    appController.decryptItem(id);
  };

  // 监听全局快捷键
  document.addEventListener("keydown", (e) => {
    appController.onKeyDown(e);
  });

  // 初始化应用
  await appController.init();
}

// 当DOM加载完成后启动应用
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
