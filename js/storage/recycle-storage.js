/**
 * 回收站持久化
 */

import { uid } from "../lib/id-utils.js";
import { now } from "../lib/time-utils.js";
import { getDB, STORE_RECYCLE } from "./idb.js";

const normalizeRecycleItem = (item) => ({
  id: item.id || uid(),
  content: String(item.content ?? ""),
  createdAt: Number(item.createdAt || now()),
  updatedAt: Number(item.updatedAt || item.createdAt || now()),
  deletedAt: Number(item.deletedAt || now()),
  title: item.title ? String(item.title) : undefined,
  encrypted: Boolean(item.encrypted),
  encryptedTitle: item.encryptedTitle ? String(item.encryptedTitle) : undefined,
  encryptionHint: item.encryptionHint ? String(item.encryptionHint) : undefined,
  defaultPassword: Boolean(item.defaultPassword),
});

export const loadRecycleItems = async () => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_RECYCLE, "readonly");
      const store = transaction.objectStore(STORE_RECYCLE);
      const index = store.index("deletedAt");
      const request = index.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const items = request.result || [];
        resolve(
          items
            .filter((x) => x && typeof x === "object")
            .map(normalizeRecycleItem)
            .sort((a, b) => b.deletedAt - a.deletedAt)
        );
      };
    });
  } catch (err) {
    console.error("Failed to load recycle items:", err);
    return [];
  }
};

export const saveRecycleItems = async (items) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_RECYCLE, "readwrite");
    const store = transaction.objectStore(STORE_RECYCLE);

    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    });

    return new Promise((resolve, reject) => {
      items.forEach((item) => {
        store.add({
          id: item.id,
          content: item.content,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          deletedAt: item.deletedAt,
          title: item.title,
          encrypted: item.encrypted === true,
          encryptedTitle: item.encryptedTitle,
          encryptionHint: item.encryptionHint,
          defaultPassword: item.defaultPassword === true,
        });
      });

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error("Failed to save recycle items:", err);
  }
};
