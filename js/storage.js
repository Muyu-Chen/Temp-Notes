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
export {
  loadDraftAttachments,
  saveDraftAttachments,
  clearDraftAttachments,
} from "./storage/draft-attachments-storage.js";
export { loadItems, saveItems, saveItem, deleteItemById } from "./storage/item-storage.js";
export {
  saveRecording,
  loadRecording,
  deleteRecordings,
  deleteUnreferencedRecordings,
} from "./storage/recording-storage.js";
export {
  collectAttachmentMetadata,
  exportData,
  normalizeImportedData,
  itemSignature,
  mergeRecycleItems,
  mergeItems,
  pruneMissingRecordingReferences,
} from "./storage/import-export-storage.js";
export { loadRecycleItems, saveRecycleItems } from "./storage/recycle-storage.js";
export { loadTheme, saveTheme } from "./services/theme-manager.js";
