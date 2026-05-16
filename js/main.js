/**
 * 应用入口
 */

import { bootstrapApp } from "./bootstrap/app-bootstrap.js";

// 当DOM加载完成后启动应用
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapApp);
} else {
  bootstrapApp();
}
