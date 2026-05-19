/**
 * 草稿附件 metadata 持久化
 */

import { STORAGE_KEYS } from "../constants.js";
import { normalizeAttachments } from "../lib/attachment-utils.js";
import { readSetting, writeSetting } from "./settings-storage.js";

export const loadDraftAttachments = async () => {
  try {
    const attachments = await readSetting(STORAGE_KEYS.DRAFT_ATTACHMENTS);
    return normalizeAttachments(attachments);
  } catch (err) {
    console.error("Failed to load draft attachments:", err);
    return [];
  }
};

export const saveDraftAttachments = async (attachments) => {
  try {
    await writeSetting(STORAGE_KEYS.DRAFT_ATTACHMENTS, normalizeAttachments(attachments));
  } catch (err) {
    console.error("Failed to save draft attachments:", err);
  }
};

export const clearDraftAttachments = async () => {
  await saveDraftAttachments([]);
};
