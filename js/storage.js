/**
 * 存储管理模块 - IndexedDB 实现
 */

import { STORAGE_KEYS, DEFAULT_THEME } from "./constants.js";
import { uid, now, safeJsonParse, wordCount } from "./utils.js";

const DB_NAME = "tempnotes_db";
const DB_VERSION = 2;
const STORE_SETTINGS = "settings";
const STORE_ITEMS = "items";
const STORE_RECYCLE = "recycle"; // 回收站存储

let dbInstance = null;

/**
 * 初始化 IndexedDB 数据库
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 创建 settings 存储
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }
      
      // 创建 items 存储，以 id 为主键
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const itemStore = db.createObjectStore(STORE_ITEMS, { keyPath: "id" });
        itemStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }
      
      // 创建 recycle 存储（v2 新增），以 id 为主键
      if (!db.objectStoreNames.contains(STORE_RECYCLE)) {
        const recycleStore = db.createObjectStore(STORE_RECYCLE, { keyPath: "id" });
        recycleStore.createIndex("deletedAt", "deletedAt", { unique: false });
      }
    };
  });
};

/**
 * 获取数据库连接
 */
const getDB = async () => {
  if (!dbInstance) {
    dbInstance = await initDB();
  }
  return dbInstance;
};

/**
 * 在 settings 存储中读取值
 */
const readSetting = async (key) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, "readonly");
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.value);
  });
};

/**
 * 在 settings 存储中写入值
 */
const writeSetting = async (key, value) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, "readwrite");
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.put({ key, value });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

/**
 * 读取主题设置
 */
export const loadTheme = async () => {
  try {
    const theme = await readSetting(STORAGE_KEYS.THEME);
    return theme || DEFAULT_THEME;
  } catch (err) {
    console.error("Failed to load theme:", err);
    return DEFAULT_THEME;
  }
};

/**
 * 保存主题设置
 */
export const saveTheme = async (theme) => {
  try {
    await writeSetting(STORAGE_KEYS.THEME, theme);
  } catch (err) {
    console.error("Failed to save theme:", err);
  }
};

/**
 * 读取草稿
 */
export const loadDraft = async () => {
  try {
    const draft = await readSetting(STORAGE_KEYS.DRAFT);
    return draft || "";
  } catch (err) {
    console.error("Failed to load draft:", err);
    return "";
  }
};

/**
 * 保存草稿
 */
export const saveDraft = async (content) => {
  try {
    await writeSetting(STORAGE_KEYS.DRAFT, content);
  } catch (err) {
    console.error("Failed to save draft:", err);
  }
};

/**
 * 读取条目列表
 */
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
        
        // 按 updatedAt 倒序排列
        const sorted = items
          .filter((x) => x && typeof x === "object")
          .map((x) => ({
            id: x.id || uid(),
            content: String(x.content ?? ""),
            createdAt: Number(x.createdAt || now()),
            updatedAt: Number(x.updatedAt || x.createdAt || now()),
          }))
          .sort((a, b) => b.updatedAt - a.updatedAt);
        
        resolve(sorted);
      };
    });
  } catch (err) {
    console.error("Failed to load items:", err);
    return [];
  }
};

/**
 * 保存条目列表
 */
export const saveItems = async (items) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_ITEMS, "readwrite");
    const store = transaction.objectStore(STORE_ITEMS);
    
    // 清空所有条目
    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    });
    
    // 批量添加新条目
    return new Promise((resolve, reject) => {
      items.forEach((item) => {
        store.add({
          id: item.id,
          content: item.content,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });
      });
      
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error("Failed to save items:", err);
  }
};

/**
 * 导出所有数据
 */
export const exportData = (draft, items) => {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    draft,
    items,
  };
};

/**
 * 验证和规范导入的数据
 */
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
    }))
    .filter((x) => x.content.length > 0);

  return { draft, items, valid: true };
};

/**
 * 计算条目去重签名
 */
export const itemSignature = (item) => {
  return `${String(item.createdAt || "")}|${String(item.content || "")}`;
};

/**
 * 合并导入的条目，去重处理
 */
export const mergeItems = (existing, imported) => {
  const sig = (x) => itemSignature(x);
  const existingSigs = new Set(existing.map(sig));
  const newItems = imported.filter((x) => !existingSigs.has(sig(x)));
  return [...newItems, ...existing].sort((a, b) => b.updatedAt - a.updatedAt);
};

/**
 * 保存加密提示和加密数据
 */
export const saveEncryptionData = async (hint, encryptedData) => {
  try {
    await writeSetting("encryption_hint", hint);
    await writeSetting("encryption_data", encryptedData);
  } catch (err) {
    console.error("Failed to save encryption data:", err);
  }
};

/**
 * 加载加密提示和加密数据
 */
export const loadEncryptionData = async () => {
  try {
    const hint = await readSetting("encryption_hint");
    const encryptedData = await readSetting("encryption_data");
    
    if (hint && encryptedData) {
      return { hint, encryptedData };
    }
    return null;
  } catch (err) {
    console.error("Failed to load encryption data:", err);
    return null;
  }
};

/**
 * 清除加密数据
 */
export const clearEncryptionData = async () => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SETTINGS, "readwrite");
      const store = transaction.objectStore(STORE_SETTINGS);
      
      store.delete("encryption_hint");
      store.delete("encryption_data");
      
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error("Failed to clear encryption data:", err);
  }
};

/**
 * 加载回收站条目
 */
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
        
        // 按 deletedAt 倒序排列（最新删除的在前）
        const sorted = items
          .filter((x) => x && typeof x === "object")
          .map((x) => ({
            id: x.id || uid(),
            content: String(x.content ?? ""),
            createdAt: Number(x.createdAt || now()),
            updatedAt: Number(x.updatedAt || x.createdAt || now()),
            deletedAt: Number(x.deletedAt || now()),
          }))
          .sort((a, b) => b.deletedAt - a.deletedAt);
        
        resolve(sorted);
      };
    });
  } catch (err) {
    console.error("Failed to load recycle items:", err);
    return [];
  }
};

/**
 * 保存回收站条目
 */
export const saveRecycleItems = async (items) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_RECYCLE, "readwrite");
    const store = transaction.objectStore(STORE_RECYCLE);
    
    // 清空所有条目
    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    });
    
    // 批量添加新条目
    return new Promise((resolve, reject) => {
      items.forEach((item) => {
        store.add({
          id: item.id,
          content: item.content,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
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
