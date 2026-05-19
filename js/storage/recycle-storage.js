/**
 * 回收站持久化
 */

import { normalizeRecycleEntry, toStoredRecycleEntry } from "../lib/recycle-utils.js";
import { getDB, STORE_RECYCLE } from "./idb.js";

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
            .map(normalizeRecycleEntry)
            .filter(Boolean)
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
        const stored = toStoredRecycleEntry(item);
        if (stored) store.add(stored);
      });

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error("Failed to save recycle items:", err);
  }
};
