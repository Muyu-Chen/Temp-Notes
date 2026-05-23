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

const openStore = async (storeName, mode = "readonly") => {
  const db = await getDB();
  const transaction = db.transaction(storeName, mode);
  return { transaction, store: transaction.objectStore(storeName) };
};

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

export const requestToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

export const finishTransaction = (transaction) =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

export const getStoreRecord = async (storeName, key) => {
  const { store } = await openStore(storeName, "readonly");
  return requestToPromise(store.get(key));
};

export const getAllStoreRecords = async (storeName, indexName = "") => {
  const { store } = await openStore(storeName, "readonly");
  const source = indexName ? store.index(indexName) : store;
  return (await requestToPromise(source.getAll())) || [];
};

export const putStoreRecord = async (storeName, record) => {
  const { transaction, store } = await openStore(storeName, "readwrite");
  store.put(record);
  await finishTransaction(transaction);
};

export const replaceStoreRecords = async (storeName, records) => {
  const { transaction, store } = await openStore(storeName, "readwrite");
  store.clear();
  (Array.isArray(records) ? records : []).forEach((record) => {
    if (record !== null && record !== undefined) {
      store.add(record);
    }
  });
  await finishTransaction(transaction);
};

export const deleteStoreRecords = async (storeName, keys) => {
  const normalizedKeys = [
    ...new Set((Array.isArray(keys) ? keys : []).filter((key) => key !== null && key !== undefined)),
  ];
  if (!normalizedKeys.length) {
    return 0;
  }

  const { transaction, store } = await openStore(storeName, "readwrite");
  normalizedKeys.forEach((key) => store.delete(key));
  await finishTransaction(transaction);
  return normalizedKeys.length;
};

export const clearObjectStores = async (storeNames) => {
  const db = await getDB();
  const transaction = db.transaction(storeNames, "readwrite");

  storeNames.forEach((storeName) => {
    transaction.objectStore(storeName).clear();
  });

  await finishTransaction(transaction);
};
