/**
 * 应用启动编排
 */

import { DOMManager } from "../ui/dom-manager.js";
import { UIController } from "../ui/ui-controller.js";
import { AppController } from "../app-controller.js";
import { initializeFirstRun } from "./first-run.js";
import { bindAppEvents } from "./bind-events.js";
import { applyTheme, loadTheme } from "../services/theme-manager.js";

export const bootstrapApp = async () => {
  const domManager = new DOMManager();
  const uiController = new UIController(domManager);
  const appController = new AppController(uiController, domManager);

  await initializeFirstRun();
  await appController.recycleService.init();

  const theme = await loadTheme();
  applyTheme(theme);

  bindAppEvents({ domManager, uiController, appController });

  await appController.init();
};
