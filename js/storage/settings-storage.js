/**
 * settings object store 读写
 */

import { getDB, STORE_SETTINGS } from "./idb.js";

export const readSetting = async (key) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, "readonly");
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.value);
  });
};

export const writeSetting = async (key, value) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, "readwrite");
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.put({ key, value });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
