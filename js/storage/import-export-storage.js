/**
 * 导入导出数据规范化
 */

import { normalizeItem, sortItemsForDisplay } from "../lib/item-utils.js";

export const exportData = (draft, items) => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  draft,
  items,
});

export const normalizeImportedData = (data) => {
  if (!data || typeof data !== "object") {
    return { draft: "", items: [], valid: false };
  }

  const draft = typeof data.draft === "string" ? data.draft : "";
  const importedItems = Array.isArray(data.items) ? data.items : [];

  const items = importedItems
    .filter((x) => x && typeof x === "object")
    .map(normalizeItem)
    .filter((x) => x.content.length > 0 || x.attachments.length > 0);

  return { draft, items, valid: true };
};

export const itemSignature = (item) =>
  `${String(item.createdAt || "")}|${String(item.content || "")}`;

export const mergeItems = (existing, imported) => {
  const existingSigs = new Set(existing.map(itemSignature));
  const newItems = imported.filter((x) => !existingSigs.has(itemSignature(x)));
  return sortItemsForDisplay([...newItems, ...existing]);
};
