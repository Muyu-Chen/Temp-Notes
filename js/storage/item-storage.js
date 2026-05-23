/**
 * 条目持久化
 */

import { normalizeItem, sortItemsForDisplay, toStoredItem } from "../lib/item-utils.js";
import {
  deleteStoreRecords,
  getAllStoreRecords,
  putStoreRecord,
  replaceStoreRecords,
  STORE_ITEMS,
} from "./idb.js";

const isStoredObject = (value) => value && typeof value === "object";

export const loadItems = async () => {
  try {
    const items = await getAllStoreRecords(STORE_ITEMS, "updatedAt");
    return sortItemsForDisplay(items.filter(isStoredObject).map(normalizeItem));
  } catch (err) {
    console.error("Failed to load items:", err);
    return [];
  }
};

export const saveItems = async (items) => {
  try {
    await replaceStoreRecords(
      STORE_ITEMS,
      (Array.isArray(items) ? items : []).map(toStoredItem)
    );
  } catch (err) {
    console.error("Failed to save items:", err);
  }
};

export const saveItem = async (item) => {
  try {
    await putStoreRecord(STORE_ITEMS, toStoredItem(item));
  } catch (err) {
    console.error("Failed to save item:", err);
  }
};

export const deleteItemById = async (id) => {
  try {
    await deleteStoreRecords(STORE_ITEMS, [id]);
  } catch (err) {
    console.error("Failed to delete item:", err);
  }
};
