/**
 * 回收站持久化
 */

import { normalizeRecycleEntry, toStoredRecycleEntry } from "../lib/recycle-utils.js";
import { getAllStoreRecords, replaceStoreRecords, STORE_RECYCLE } from "./idb.js";

const isStoredObject = (value) => value && typeof value === "object";
const sortByDeletedAtDescending = (items) =>
  items.sort((a, b) => Number(b.deletedAt || 0) - Number(a.deletedAt || 0));

export const loadRecycleItems = async () => {
  try {
    const items = await getAllStoreRecords(STORE_RECYCLE, "deletedAt");
    return sortByDeletedAtDescending(
      items.filter(isStoredObject).map(normalizeRecycleEntry).filter(Boolean)
    );
  } catch (err) {
    console.error("Failed to load recycle items:", err);
    return [];
  }
};

export const saveRecycleItems = async (items) => {
  try {
    await replaceStoreRecords(
      STORE_RECYCLE,
      (Array.isArray(items) ? items : []).map(toStoredRecycleEntry).filter(Boolean)
    );
  } catch (err) {
    console.error("Failed to save recycle items:", err);
  }
};
