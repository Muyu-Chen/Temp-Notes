/**
 * IndexedDB 连接与 object store 基础能力
 */

export const DB_NAME = "tempnotes_db";
export const DB_VERSION = 3;
export const STORE_SETTINGS = "settings";
export const STORE_ITEMS = "items";
export const STORE_RECYCLE = "recycle";
export const STORE_RECORDINGS = "recordings";

let dbInstance = null;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const itemStore = db.createObjectStore(STORE_ITEMS, { keyPath: "id" });
        itemStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_RECYCLE)) {
        const recycleStore = db.createObjectStore(STORE_RECYCLE, { keyPath: "id" });
        recycleStore.createIndex("deletedAt", "deletedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_RECORDINGS)) {
        db.createObjectStore(STORE_RECORDINGS, { keyPath: "id" });
      }
    };
  });
};

export const getDB = async () => {
  if (!dbInstance) {
    dbInstance = await initDB();
  }
  return dbInstance;
};

export const clearObjectStores = async (storeNames) => {
  const db = await getDB();
  const transaction = db.transaction(storeNames, "readwrite");

  storeNames.forEach((storeName) => {
    transaction.objectStore(storeName).clear();
  });

  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
};
