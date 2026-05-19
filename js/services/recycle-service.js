/**
 * 回收站数据服务
 */

import { loadRecycleItems, saveRecycleItems } from "../storage/recycle-storage.js";
import { createRecordingRecycleEntry } from "../lib/recycle-utils.js";

export class RecycleService {
  constructor() {
    this.deletedItems = [];
    this.initialized = false;
    this.lastCleanedItems = [];
  }

  async init() {
    if (!this.initialized) {
      this.deletedItems = await loadRecycleItems();
      this.initialized = true;
    }
  }

  async saveToStorage() {
    try {
      await saveRecycleItems(this.deletedItems);
    } catch (error) {
      console.error("Failed to save recycle items:", error);
    }
  }

  async addToRecycle(item) {
    this.deletedItems.unshift({
      ...item,
      deletedAt: Date.now(),
    });
    await this.saveToStorage();
  }

  async addRecordingToRecycle(entry) {
    const recycleEntry = createRecordingRecycleEntry({
      ...entry,
      deletedAt: Date.now(),
    });
    if (!recycleEntry) return null;

    this.deletedItems.unshift(recycleEntry);
    await this.saveToStorage();
    return recycleEntry;
  }

  getRecycleItems() {
    return this.deletedItems;
  }

  async deleteFromRecycle(index) {
    if (index >= 0 && index < this.deletedItems.length) {
      const [removedItem] = this.deletedItems.splice(index, 1);
      await this.saveToStorage();
      return removedItem || null;
    }
    return null;
  }

  async clearRecycle() {
    const removedItems = this.deletedItems;
    this.deletedItems = [];
    await this.saveToStorage();
    return removedItems;
  }

  async cleanupExpired(retentionDays, now = Date.now()) {
    const days = Number(retentionDays);
    if (!days || days <= 0) {
      this.lastCleanedItems = [];
      return 0;
    }

    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const kept = this.deletedItems.filter((item) => Number(item.deletedAt || 0) >= cutoff);
    const removedItems = this.deletedItems.filter((item) => Number(item.deletedAt || 0) < cutoff);
    const removedCount = this.deletedItems.length - kept.length;

    if (removedCount > 0) {
      this.deletedItems = kept;
      this.lastCleanedItems = removedItems;
      await this.saveToStorage();
    } else {
      this.lastCleanedItems = [];
    }

    return removedCount;
  }

  getLastCleanedItems() {
    return this.lastCleanedItems;
  }

  async restoreItem(index) {
    if (index >= 0 && index < this.deletedItems.length) {
      const item = this.deletedItems[index];
      this.deletedItems.splice(index, 1);
      await this.saveToStorage();
      return item;
    }
    return null;
  }
}
