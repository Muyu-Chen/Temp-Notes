/**
 * 导入导出数据规范化
 */

import { uid } from "../lib/id-utils.js";
import { now } from "../lib/time-utils.js";

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
    .map((x) => ({
      id: x.id || uid(),
      content: String(x.content ?? ""),
      createdAt: Number(x.createdAt || now()),
      updatedAt: Number(x.updatedAt || x.createdAt || now()),
      title: x.title ? String(x.title) : undefined,
      encrypted: Boolean(x.encrypted),
      encryptedTitle: x.encryptedTitle ? String(x.encryptedTitle) : undefined,
      encryptionHint: x.encryptionHint ? String(x.encryptionHint) : undefined,
      defaultPassword: Boolean(x.defaultPassword),
    }))
    .filter((x) => x.content.length > 0);

  return { draft, items, valid: true };
};

export const itemSignature = (item) =>
  `${String(item.createdAt || "")}|${String(item.content || "")}`;

export const mergeItems = (existing, imported) => {
  const existingSigs = new Set(existing.map(itemSignature));
  const newItems = imported.filter((x) => !existingSigs.has(itemSignature(x)));
  return [...newItems, ...existing].sort((a, b) => b.updatedAt - a.updatedAt);
};
