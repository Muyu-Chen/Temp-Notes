/**
 * 兼容旧导入的存储出口。新代码优先从 js/storage/* 按职责导入。
 */

export { initDB, getDB, clearObjectStores } from "./storage/idb.js";
export { readSetting, writeSetting } from "./storage/settings-storage.js";
export {
  loadDraft,
  saveDraft,
  loadDraftItemId,
  saveDraftItemId,
  clearDraftItemId,
} from "./storage/draft-storage.js";
export { loadItems, saveItems } from "./storage/item-storage.js";
export {
  exportData,
  normalizeImportedData,
  itemSignature,
  mergeItems,
} from "./storage/import-export-storage.js";
export { loadRecycleItems, saveRecycleItems } from "./storage/recycle-storage.js";
export { loadTheme, saveTheme } from "./services/theme-manager.js";
