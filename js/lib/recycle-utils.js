/**
 * 回收站条目工具
 */

import { normalizeAttachment, normalizeAttachments } from "./attachment-utils.js";
import { uid } from "./id-utils.js";
import { normalizeItem, toStoredItem } from "./item-utils.js";
import { now } from "./time-utils.js";

export const RECYCLE_TYPES = {
  ITEM: "item",
  RECORDING: "recording",
};

export const isRecordingRecycleEntry = (entry) => entry?.recycleType === RECYCLE_TYPES.RECORDING;

export const getRecycleEntryAttachmentIds = (entry) => {
  if (isRecordingRecycleEntry(entry)) {
    return entry.attachment?.id ? [entry.attachment.id] : [];
  }
  return normalizeAttachments(entry?.attachments).map((attachment) => attachment.id);
};

export const createRecordingRecycleEntry = ({
  attachment,
  sourceItemId = "",
  sourceItemTitle = "",
  sourceDraftContent = "",
  deletedAt = Date.now(),
} = {}) => {
  const normalizedAttachment = normalizeAttachment(attachment);
  if (!normalizedAttachment) return null;

  return {
    id: `recording-${normalizedAttachment.id}-${deletedAt}`,
    recycleType: RECYCLE_TYPES.RECORDING,
    attachment: normalizedAttachment,
    sourceItemId: sourceItemId ? String(sourceItemId) : undefined,
    sourceItemTitle: sourceItemTitle ? String(sourceItemTitle) : undefined,
    sourceDraftContent: String(sourceDraftContent || ""),
    deletedAt: Number(deletedAt || Date.now()),
  };
};

export const normalizeRecycleEntry = (entry) => {
  if (isRecordingRecycleEntry(entry)) {
    const attachment = normalizeAttachment(entry.attachment);
    if (!attachment) return null;
    return {
      id: entry.id ? String(entry.id) : `recording-${attachment.id}-${uid()}`,
      recycleType: RECYCLE_TYPES.RECORDING,
      attachment,
      sourceItemId: entry.sourceItemId ? String(entry.sourceItemId) : undefined,
      sourceItemTitle: entry.sourceItemTitle ? String(entry.sourceItemTitle) : undefined,
      sourceDraftContent: String(entry.sourceDraftContent || ""),
      deletedAt: Number(entry.deletedAt || now()),
    };
  }

  return {
    ...normalizeItem(entry),
    deletedAt: Number(entry?.deletedAt || now()),
  };
};

export const toStoredRecycleEntry = (entry) => {
  if (isRecordingRecycleEntry(entry)) {
    const normalized = normalizeRecycleEntry(entry);
    if (!normalized) return null;
    return normalized;
  }

  return {
    ...toStoredItem(entry),
    deletedAt: entry.deletedAt,
  };
};
