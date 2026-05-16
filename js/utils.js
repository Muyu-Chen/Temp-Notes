/**
 * 兼容旧导入的工具出口。新代码优先从 js/lib/* 按职责导入。
 */

export { now, pad2, fmt, formatTime } from "./lib/time-utils.js";
export { uid } from "./lib/id-utils.js";
export { clamp, firstLine, cleanTitle, resolveItemTitle, wordCount } from "./lib/text-utils.js";
export { estimateStorageBytes, humanBytes } from "./lib/bytes-utils.js";
export { isMac } from "./lib/platform-utils.js";
export {
  excerptAroundSearch,
  filterItemsBySearch,
  getHighlightRanges,
  getItemSearchFields,
  getSearchTokens,
  itemMatchesSearch,
  normalizeSearchText,
} from "./lib/search-utils.js";
export {
  formatExportTimestamp,
  getTextExportPayload,
  sanitizeFilePart,
  TEXT_EXPORT_FORMATS,
} from "./lib/download-utils.js";
