/**
 * 草稿持久化
 */

import { STORAGE_KEYS } from "../constants.js";
import { readSetting, writeSetting } from "./settings-storage.js";

export const loadDraft = async () => {
  try {
    const draft = await readSetting(STORAGE_KEYS.DRAFT);
    return draft || "";
  } catch (err) {
    console.error("Failed to load draft:", err);
    return "";
  }
};

export const saveDraft = async (content) => {
  try {
    await writeSetting(STORAGE_KEYS.DRAFT, content);
  } catch (err) {
    console.error("Failed to save draft:", err);
  }
};

export const loadDraftItemId = async () => {
  try {
    const id = await readSetting(STORAGE_KEYS.DRAFT_ITEM_ID);
    return id || null;
  } catch (err) {
    console.error("Failed to load draft item id:", err);
    return null;
  }
};

export const saveDraftItemId = async (id) => {
  try {
    await writeSetting(STORAGE_KEYS.DRAFT_ITEM_ID, id || null);
  } catch (err) {
    console.error("Failed to save draft item id:", err);
  }
};

export const clearDraftItemId = async () => {
  try {
    await writeSetting(STORAGE_KEYS.DRAFT_ITEM_ID, null);
  } catch (err) {
    console.error("Failed to clear draft item id:", err);
  }
};
