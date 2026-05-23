/**
 * settings object store 读写
 */

import { getStoreRecord, putStoreRecord, STORE_SETTINGS } from "./idb.js";

export const readSetting = async (key) => (await getStoreRecord(STORE_SETTINGS, key))?.value;

export const writeSetting = async (key, value) =>
  putStoreRecord(STORE_SETTINGS, { key, value });
