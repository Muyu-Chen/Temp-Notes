/**
 * 条目元数据工具
 */

import { uid } from "./id-utils.js";
import { now } from "./time-utils.js";

const TAG_SPLIT_RE = /[,，;；\n]+/;

export const normalizeTags = (value) => {
  const rawTags = Array.isArray(value) ? value : String(value ?? "").split(TAG_SPLIT_RE);
  const seen = new Set();
  const tags = [];

  rawTags.forEach((tag) => {
    const normalized = String(tag ?? "")
      .trim()
      .replace(/^#+/, "")
      .replace(/\s+/g, " ");

    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    tags.push(normalized);
  });

  return tags;
};

export const itemHasTag = (item, tag) => {
  const target = String(tag ?? "").trim().toLowerCase();
  if (!target) return true;
  return normalizeTags(item?.tags).some((itemTag) => itemTag.toLowerCase() === target);
};

export const normalizeItem = (item) => {
  const pinned = item?.pinned === true;
  const pinnedAt = Number(item?.pinnedAt);

  return {
    id: item?.id || uid(),
    content: String(item?.content ?? ""),
    createdAt: Number(item?.createdAt || now()),
    updatedAt: Number(item?.updatedAt || item?.createdAt || now()),
    title: item?.title ? String(item.title) : undefined,
    encrypted: Boolean(item?.encrypted),
    encryptedTitle: item?.encryptedTitle ? String(item.encryptedTitle) : undefined,
    encryptionHint: item?.encryptionHint ? String(item.encryptionHint) : undefined,
    defaultPassword: Boolean(item?.defaultPassword),
    pinned,
    pinnedAt: pinned && Number.isFinite(pinnedAt) ? pinnedAt : undefined,
    favorite: item?.favorite === true,
    tags: normalizeTags(item?.tags),
  };
};

export const toStoredItem = (item) => ({
  id: item.id,
  content: item.content,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  title: item.title,
  encrypted: item.encrypted === true,
  encryptedTitle: item.encryptedTitle,
  encryptionHint: item.encryptionHint,
  defaultPassword: item.defaultPassword === true,
  pinned: item.pinned === true,
  pinnedAt: item.pinned === true ? item.pinnedAt : undefined,
  favorite: item.favorite === true,
  tags: normalizeTags(item.tags),
});

export const compareItemsForDisplay = (a, b) => {
  const aPinned = a?.pinned === true;
  const bPinned = b?.pinned === true;

  if (aPinned !== bPinned) {
    return aPinned ? -1 : 1;
  }

  if (aPinned && bPinned) {
    return Number(b?.pinnedAt || 0) - Number(a?.pinnedAt || 0);
  }

  return Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0);
};

export const sortItemsForDisplay = (items) =>
  [...(Array.isArray(items) ? items : [])].sort(compareItemsForDisplay);
