/**
 * 条目持久化
 */

import { normalizeItem, sortItemsForDisplay, toStoredItem } from "../lib/item-utils.js";
import { getDB, STORE_ITEMS } from "./idb.js";

export const loadItems = async () => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ITEMS, "readonly");
      const store = transaction.objectStore(STORE_ITEMS);
      const index = store.index("updatedAt");
      const request = index.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const items = request.result || [];
        resolve(
          sortItemsForDisplay(items.filter((x) => x && typeof x === "object").map(normalizeItem))
        );
      };
    });
  } catch (err) {
    console.error("Failed to load items:", err);
    return [];
  }
};

export const saveItems = async (items) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_ITEMS, "readwrite");
    const store = transaction.objectStore(STORE_ITEMS);

    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    });

    return new Promise((resolve, reject) => {
      items.forEach((item) => {
        store.add(toStoredItem(item));
      });

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error("Failed to save items:", err);
  }
};

export const saveItem = async (item) => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ITEMS, "readwrite");
      const store = transaction.objectStore(STORE_ITEMS);
      store.put(toStoredItem(item));

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error("Failed to save item:", err);
  }
};

export const deleteItemById = async (id) => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ITEMS, "readwrite");
      const store = transaction.objectStore(STORE_ITEMS);
      store.delete(id);

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error("Failed to delete item:", err);
  }
};
