/**
 * 设置读写与清空数据
 */

import { STORAGE_KEYS } from "../constants.js";
import {
  clearObjectStores,
  STORE_ITEMS,
  STORE_RECORDINGS,
  STORE_RECYCLE,
  STORE_SETTINGS,
} from "../storage/idb.js";

const FONT_SIZE_KEY = "font_size";
const VALID_DRAFT_MODES = new Set(["edit", "preview"]);
export const RECYCLE_RETENTION_OPTIONS = [0, 7, 30, 90];

export const getFontSize = () => {
  try {
    const size = localStorage.getItem(FONT_SIZE_KEY);
    return size ? parseInt(size, 10) : 16;
  } catch {
    return 16;
  }
};

export const applyFontSize = (size) => {
  document.documentElement.style.setProperty("--font-size", `${size}px`);
};

export const setFontSize = (size) => {
  try {
    const nextSize = parseInt(size, 10);
    if (nextSize >= 12 && nextSize <= 20) {
      localStorage.setItem(FONT_SIZE_KEY, nextSize);
      applyFontSize(nextSize);
      return nextSize;
    }
  } catch (err) {
    console.error("Failed to set font size:", err);
  }

  return null;
};

export const getDraftMode = () => {
  try {
    const mode = localStorage.getItem(STORAGE_KEYS.DRAFT_MODE);
    return VALID_DRAFT_MODES.has(mode) ? mode : "edit";
  } catch {
    return "edit";
  }
};

export const setDraftMode = (mode) => {
  const nextMode = VALID_DRAFT_MODES.has(mode) ? mode : "edit";
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFT_MODE, nextMode);
  } catch (err) {
    console.error("Failed to save draft mode:", err);
  }
  return nextMode;
};

export const getRecycleRetentionDays = () => {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEYS.RECYCLE_RETENTION_DAYS));
    return RECYCLE_RETENTION_OPTIONS.includes(value) ? value : 0;
  } catch {
    return 0;
  }
};

export const setRecycleRetentionDays = (days) => {
  const value = Number(days);
  if (!RECYCLE_RETENTION_OPTIONS.includes(value)) {
    return null;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.RECYCLE_RETENTION_DAYS, String(value));
  } catch (err) {
    console.error("Failed to save recycle retention:", err);
  }

  return value;
};

export const getRecycleRetentionText = (days) =>
  Number(days) > 0 ? `超过 ${days} 天自动清理` : "自动清理：永不";

export const getLLMSettings = () => {
  try {
    const enabled = localStorage.getItem(STORAGE_KEYS.LLM_ENABLED) === "true";
    const baseUrl = localStorage.getItem(STORAGE_KEYS.LLM_BASE_URL) || "";
    const apiKey = localStorage.getItem(STORAGE_KEYS.LLM_API_KEY) || "";
    const model = localStorage.getItem(STORAGE_KEYS.LLM_MODEL) || "";
    return { enabled, baseUrl, apiKey, model };
  } catch {
    return { enabled: false, baseUrl: "", apiKey: "", model: "" };
  }
};

export const saveLLMSettings = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LLM_ENABLED, settings.enabled ? "true" : "false");
    localStorage.setItem(STORAGE_KEYS.LLM_BASE_URL, String(settings.baseUrl || "").trim());
    localStorage.setItem(STORAGE_KEYS.LLM_API_KEY, String(settings.apiKey || "").trim());
    localStorage.setItem(STORAGE_KEYS.LLM_MODEL, String(settings.model || "").trim());
  } catch (err) {
    console.error("Failed to save LLM settings:", err);
  }
};

export const getLLMDebugLog = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.LLM_DEBUG_LOG) || "";
  } catch {
    return "";
  }
};

export const saveLLMDebugLog = (logText) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LLM_DEBUG_LOG, String(logText || ""));
  } catch (err) {
    console.error("Failed to save LLM debug log:", err);
  }
};

export const clearLLMDebugLog = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.LLM_DEBUG_LOG);
  } catch (err) {
    console.error("Failed to clear LLM debug log:", err);
  }
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
    "draft",
    STORAGE_KEYS.THEME,
    STORAGE_KEYS.FIRST_OPEN,
  ].forEach((key) => {
    localStorage.removeItem(key);
  });
};
