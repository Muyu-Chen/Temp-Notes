/**
 * 导入导出数据规范化
 */

import { normalizeAttachments } from "../lib/attachment-utils.js";
import { isRecordingRecycleEntry, normalizeRecycleEntry } from "../lib/recycle-utils.js";
import { normalizeItem, sortItemsForDisplay } from "../lib/item-utils.js";

const isRecord = (value) => value && typeof value === "object";
const hasPersistedItemBody = (item) => item.content.length > 0 || item.attachments.length > 0;

const normalizeCollection = (items, normalize) =>
  (Array.isArray(items) ? items : []).filter(isRecord).map(normalize).filter(Boolean);

const normalizeItemCollection = (items) =>
  normalizeCollection(items, normalizeItem).filter(hasPersistedItemBody);

const normalizeRecycleCollection = (items) => normalizeCollection(items, normalizeRecycleEntry);
const sortByDeletedAtDescending = (items) =>
  [...items].sort((a, b) => Number(b?.deletedAt || 0) - Number(a?.deletedAt || 0));

export const exportData = (
  draft,
  items,
  { recycle = [], draftAttachments = [] } = {}
) => ({
  version: 2,
  exportedAt: new Date().toISOString(),
  draft: String(draft || ""),
  draftAttachments: normalizeAttachments(draftAttachments),
  items: normalizeItemCollection(items),
  recycle: normalizeRecycleCollection(recycle),
});

export const normalizeImportedData = (data) => {
  if (!data || typeof data !== "object") {
    return { draft: "", draftAttachments: [], items: [], recycle: [], valid: false };
  }

  const draft = typeof data.draft === "string" ? data.draft : "";
  const draftAttachments = normalizeAttachments(data.draftAttachments);
  const items = normalizeItemCollection(data.items);
  const recycle = normalizeRecycleCollection(data.recycle);

  return { draft, draftAttachments, items, recycle, valid: true };
};

export const itemSignature = (item) =>
  [
    String(item.createdAt || ""),
    String(item.content || ""),
    normalizeAttachments(item.attachments)
      .map((attachment) => attachment.id)
      .join(","),
  ].join("|");

export const mergeItems = (existing, imported) => {
  const existingSigs = new Set(existing.map(itemSignature));
  const newItems = imported.filter((x) => !existingSigs.has(itemSignature(x)));
  return sortItemsForDisplay([...newItems, ...existing]);
};

export const recycleEntrySignature = (entry) =>
  [
    isRecordingRecycleEntry(entry) ? "recording" : "item",
    String(entry?.id || ""),
    String(entry?.deletedAt || ""),
  ].join("|");

export const mergeRecycleItems = (existing, imported) => {
  const current = Array.isArray(existing) ? existing : [];
  const existingSigs = new Set(current.map(recycleEntrySignature));
  const newEntries = (Array.isArray(imported) ? imported : []).filter((entry) => {
    const signature = recycleEntrySignature(entry);
    if (existingSigs.has(signature)) return false;
    existingSigs.add(signature);
    return true;
  });

  return [...newEntries, ...current]
    .sort((a, b) => Number(b?.deletedAt || 0) - Number(a?.deletedAt || 0));
};

export const collectAttachmentMetadata = (data) => {
  const byId = new Map();
  const add = (attachment) => {
    normalizeAttachments([attachment]).forEach((normalized) => {
      if (!byId.has(normalized.id)) byId.set(normalized.id, normalized);
    });
  };

  normalizeAttachments(data?.draftAttachments).forEach(add);
  (Array.isArray(data?.items) ? data.items : []).forEach((item) => {
    normalizeAttachments(item?.attachments).forEach(add);
  });
  (Array.isArray(data?.recycle) ? data.recycle : []).forEach((entry) => {
    if (isRecordingRecycleEntry(entry)) {
      add(entry.attachment);
      return;
    }
    normalizeAttachments(entry?.attachments).forEach(add);
  });

  return [...byId.values()];
};

const filterAttachmentsByAvailableIds = (attachments, availableIds) =>
  normalizeAttachments(attachments).filter((attachment) => availableIds.has(attachment.id));

export const pruneMissingRecordingReferences = (data, availableRecordingIds) => {
  const availableIds = new Set(
    (Array.isArray(availableRecordingIds) ? availableRecordingIds : []).map(String)
  );
  const itemsWithAvailableAttachments = (Array.isArray(data?.items) ? data.items : []).map((item) => ({
    ...item,
    attachments: filterAttachmentsByAvailableIds(item?.attachments, availableIds),
  }));
  const recycleWithAvailableAttachments = (Array.isArray(data?.recycle) ? data.recycle : []).map(
    (entry) => {
      if (isRecordingRecycleEntry(entry)) {
        return availableIds.has(entry.attachment?.id) ? normalizeRecycleEntry(entry) : null;
      }

      return {
        ...entry,
        attachments: filterAttachmentsByAvailableIds(entry?.attachments, availableIds),
      };
    }
  );

  return {
    ...data,
    draftAttachments: filterAttachmentsByAvailableIds(data?.draftAttachments, availableIds),
    items: normalizeItemCollection(itemsWithAvailableAttachments),
    recycle: sortByDeletedAtDescending(normalizeRecycleCollection(recycleWithAvailableAttachments)),
  };
};
