/**
 * 设置读写与清空数据
 */

import { STORAGE_KEYS } from "../constants.js";
import {
  clearObjectStores,
  STORE_ITEMS,
  STORE_RECYCLE,
  STORE_SETTINGS,
} from "../storage/idb.js";

const FONT_SIZE_KEY = "font_size";
const LLM_BASE_URL_KEY = "llm_base_url";
const LLM_API_KEY = "llm_api_key";
const LLM_MODEL_KEY = "llm_model";

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

export const getLLMSettings = () => {
  try {
    const baseUrl = localStorage.getItem(LLM_BASE_URL_KEY) || "";
    const apiKey = localStorage.getItem(LLM_API_KEY) || "";
    const model = localStorage.getItem(LLM_MODEL_KEY) || "";
    return { baseUrl, apiKey, model };
  } catch {
    return { baseUrl: "", apiKey: "", model: "" };
  }
};

export const saveLLMSettings = (baseUrl, apiKey, model) => {
  try {
    localStorage.setItem(LLM_BASE_URL_KEY, baseUrl);
    localStorage.setItem(LLM_API_KEY, apiKey);
    localStorage.setItem(LLM_MODEL_KEY, model);
  } catch (err) {
    console.error("Failed to save LLM settings:", err);
  }
};

export const clearPersistentData = async () => {
  await clearObjectStores([STORE_SETTINGS, STORE_ITEMS, STORE_RECYCLE]);

  [
    FONT_SIZE_KEY,
    LLM_BASE_URL_KEY,
    LLM_API_KEY,
    LLM_MODEL_KEY,
    "draft",
    STORAGE_KEYS.THEME,
    STORAGE_KEYS.FIRST_OPEN,
  ].forEach((key) => {
    localStorage.removeItem(key);
  });
};
