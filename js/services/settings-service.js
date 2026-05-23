/**
 * 设置读写与清空数据
 */

import { STORAGE_KEYS } from "../constants.js";
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "../lib/local-storage-utils.js";
import {
  clearObjectStores,
  STORE_ITEMS,
  STORE_RECORDINGS,
  STORE_RECYCLE,
  STORE_SETTINGS,
} from "../storage/idb.js";

const FONT_SIZE_KEY = "font_size";
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 20;
const DEFAULT_DRAFT_MODE = "edit";
const DEFAULT_RECORDING_FORMAT = "m4a";
const DEFAULT_LAYOUT_WIDTH = "standard";
const DEFAULT_COLUMN_LAYOUT = "default";
const VALID_DRAFT_MODES = new Set(["edit", "preview"]);
const VALID_RECORDING_FORMATS = new Set(["m4a", "mp3", "webm"]);
const VALID_LAYOUT_WIDTHS = new Set(["auto", "standard", "wide", "ultrawide"]);
const VALID_COLUMN_LAYOUTS = new Set(["default", "editor", "archive"]);
export const RECYCLE_RETENTION_OPTIONS = [0, 7, 30, 90];
const EMPTY_LLM_SETTINGS = {
  enabled: false,
  baseUrl: "",
  apiKey: "",
  model: "",
};

const normalizeFontSize = (size) => {
  const nextSize = parseInt(size, 10);
  return nextSize >= MIN_FONT_SIZE && nextSize <= MAX_FONT_SIZE ? nextSize : null;
};

const readEnumPreference = (key, validValues, fallback) => {
  const value = getLocalStorageItem(key);
  return validValues.has(value) ? value : fallback;
};

const readNumberPreference = (key, validValues, fallback) => {
  const value = Number(getLocalStorageItem(key));
  return validValues.includes(value) ? value : fallback;
};

const readStringPreference = (key) => getLocalStorageItem(key, "") || "";

const trimStoredText = (value) => String(value || "").trim();

export const getFontSize = () => {
  return normalizeFontSize(getLocalStorageItem(FONT_SIZE_KEY)) ?? DEFAULT_FONT_SIZE;
};

export const applyFontSize = (size) => {
  document.documentElement.style.setProperty("--font-size", `${size}px`);
};

export const setFontSize = (size) => {
  const nextSize = normalizeFontSize(size);
  if (nextSize === null) {
    return null;
  }

  setLocalStorageItem(FONT_SIZE_KEY, nextSize, "Failed to set font size:");
  applyFontSize(nextSize);
  return nextSize;
};

export const getDraftMode = () =>
  readEnumPreference(STORAGE_KEYS.DRAFT_MODE, VALID_DRAFT_MODES, DEFAULT_DRAFT_MODE);

export const setDraftMode = (mode) => {
  const nextMode = VALID_DRAFT_MODES.has(mode) ? mode : DEFAULT_DRAFT_MODE;
  setLocalStorageItem(STORAGE_KEYS.DRAFT_MODE, nextMode, "Failed to save draft mode:");
  return nextMode;
};

export const getRecycleRetentionDays = () =>
  readNumberPreference(STORAGE_KEYS.RECYCLE_RETENTION_DAYS, RECYCLE_RETENTION_OPTIONS, 0);

export const setRecycleRetentionDays = (days) => {
  const value = Number(days);
  if (!RECYCLE_RETENTION_OPTIONS.includes(value)) {
    return null;
  }

  setLocalStorageItem(
    STORAGE_KEYS.RECYCLE_RETENTION_DAYS,
    value,
    "Failed to save recycle retention:"
  );
  return value;
};

export const getRecycleRetentionText = (days) =>
  Number(days) > 0 ? `超过 ${days} 天自动清理` : "自动清理：永不";

export const getRecordingFormatPreference = () =>
  readEnumPreference(
    STORAGE_KEYS.RECORDING_FORMAT,
    VALID_RECORDING_FORMATS,
    DEFAULT_RECORDING_FORMAT
  );

export const setRecordingFormatPreference = (format) => {
  const nextFormat = VALID_RECORDING_FORMATS.has(format) ? format : DEFAULT_RECORDING_FORMAT;
  setLocalStorageItem(
    STORAGE_KEYS.RECORDING_FORMAT,
    nextFormat,
    "Failed to save recording format:"
  );
  return nextFormat;
};

const setRootDatasetValue = (name, value) => {
  if (typeof document === "undefined") return;

  document.documentElement.dataset[name] = value;
};

export const getLayoutWidthPreference = () =>
  readEnumPreference(STORAGE_KEYS.LAYOUT_WIDTH, VALID_LAYOUT_WIDTHS, DEFAULT_LAYOUT_WIDTH);

export const applyLayoutWidthPreference = (value) => {
  const nextValue = VALID_LAYOUT_WIDTHS.has(value) ? value : DEFAULT_LAYOUT_WIDTH;
  setRootDatasetValue("layoutWidth", nextValue);
  return nextValue;
};

export const setLayoutWidthPreference = (value) => {
  const nextValue = applyLayoutWidthPreference(value);
  setLocalStorageItem(
    STORAGE_KEYS.LAYOUT_WIDTH,
    nextValue,
    "Failed to save layout width:"
  );
  return nextValue;
};

export const getColumnLayoutPreference = () =>
  readEnumPreference(STORAGE_KEYS.COLUMN_LAYOUT, VALID_COLUMN_LAYOUTS, DEFAULT_COLUMN_LAYOUT);

export const applyColumnLayoutPreference = (value) => {
  const nextValue = VALID_COLUMN_LAYOUTS.has(value) ? value : DEFAULT_COLUMN_LAYOUT;
  setRootDatasetValue("columnLayout", nextValue);
  return nextValue;
};

export const setColumnLayoutPreference = (value) => {
  const nextValue = applyColumnLayoutPreference(value);
  setLocalStorageItem(
    STORAGE_KEYS.COLUMN_LAYOUT,
    nextValue,
    "Failed to save column layout:"
  );
  return nextValue;
};

export const getLLMSettings = () => {
  return {
    ...EMPTY_LLM_SETTINGS,
    enabled: getLocalStorageItem(STORAGE_KEYS.LLM_ENABLED) === "true",
    baseUrl: readStringPreference(STORAGE_KEYS.LLM_BASE_URL),
    apiKey: readStringPreference(STORAGE_KEYS.LLM_API_KEY),
    model: readStringPreference(STORAGE_KEYS.LLM_MODEL),
  };
};

export const saveLLMSettings = (settings) => {
  setLocalStorageItem(
    STORAGE_KEYS.LLM_ENABLED,
    settings.enabled ? "true" : "false",
    "Failed to save LLM settings:"
  );
  setLocalStorageItem(
    STORAGE_KEYS.LLM_BASE_URL,
    trimStoredText(settings.baseUrl),
    "Failed to save LLM settings:"
  );
  setLocalStorageItem(
    STORAGE_KEYS.LLM_API_KEY,
    trimStoredText(settings.apiKey),
    "Failed to save LLM settings:"
  );
  setLocalStorageItem(
    STORAGE_KEYS.LLM_MODEL,
    trimStoredText(settings.model),
    "Failed to save LLM settings:"
  );
};

export const getLLMDebugLog = () => readStringPreference(STORAGE_KEYS.LLM_DEBUG_LOG);

export const saveLLMDebugLog = (logText) => {
  setLocalStorageItem(
    STORAGE_KEYS.LLM_DEBUG_LOG,
    String(logText || ""),
    "Failed to save LLM debug log:"
  );
};

export const clearLLMDebugLog = () => {
  removeLocalStorageItem(STORAGE_KEYS.LLM_DEBUG_LOG, "Failed to clear LLM debug log:");
};

export const clearPersistentData = async () => {
  await clearObjectStores([STORE_SETTINGS, STORE_ITEMS, STORE_RECYCLE, STORE_RECORDINGS]);

  [
    FONT_SIZE_KEY,
    STORAGE_KEYS.DRAFT_MODE,
    STORAGE_KEYS.RECYCLE_RETENTION_DAYS,
    STORAGE_KEYS.LLM_ENABLED,
    STORAGE_KEYS.LLM_BASE_URL,
    STORAGE_KEYS.LLM_API_KEY,
    STORAGE_KEYS.LLM_MODEL,
    STORAGE_KEYS.LLM_DEBUG_LOG,
    STORAGE_KEYS.RECORDING_FORMAT,
    STORAGE_KEYS.LAYOUT_WIDTH,
    STORAGE_KEYS.COLUMN_LAYOUT,
    "draft",
    STORAGE_KEYS.THEME,
    STORAGE_KEYS.FIRST_OPEN,
  ].forEach((key) => {
    removeLocalStorageItem(key);
  });
};
