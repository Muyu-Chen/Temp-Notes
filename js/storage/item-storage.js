/**
 * 条目持久化
 */

import { uid } from "../lib/id-utils.js";
import { now } from "../lib/time-utils.js";
import { getDB, STORE_ITEMS } from "./idb.js";

const normalizeItem = (item) => ({
  id: item.id || uid(),
  content: String(item.content ?? ""),
  createdAt: Number(item.createdAt || now()),
  updatedAt: Number(item.updatedAt || item.createdAt || now()),
  title: item.title ? String(item.title) : undefined,
  encrypted: Boolean(item.encrypted),
  encryptedTitle: item.encryptedTitle ? String(item.encryptedTitle) : undefined,
  encryptionHint: item.encryptionHint ? String(item.encryptionHint) : undefined,
  defaultPassword: Boolean(item.defaultPassword),
});

const toStoredItem = (item) => ({
  id: item.id,
  content: item.content,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  title: item.title,
  encrypted: item.encrypted === true,
  encryptedTitle: item.encryptedTitle,
  encryptionHint: item.encryptionHint,
  defaultPassword: item.defaultPassword === true,
});

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
          items
            .filter((x) => x && typeof x === "object")
            .map(normalizeItem)
            .sort((a, b) => b.updatedAt - a.updatedAt)
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
