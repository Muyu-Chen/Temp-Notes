/**
 * 回收站持久化
 */

import { normalizeItem, toStoredItem } from "../lib/item-utils.js";
import { now } from "../lib/time-utils.js";
import { getDB, STORE_RECYCLE } from "./idb.js";

const normalizeRecycleItem = (item) => ({
  ...normalizeItem(item),
  deletedAt: Number(item.deletedAt || now()),
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
          ...toStoredItem(item),
          deletedAt: item.deletedAt,
        });
      });

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error("Failed to save recycle items:", err);
  }
};
