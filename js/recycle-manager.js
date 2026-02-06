/**
 * 回收站管理模块
 */

import { Modal } from "./modal.js";
import { loadRecycleItems, saveRecycleItems } from "./storage.js";

export class RecycleManager {
  constructor(domManager, uiController) {
    this.dom = domManager;
    this.ui = uiController;
    this.modal = new Modal();
    this.deletedItems = []; // 已删除的条目
    this.initialized = false; // 标记是否已加载
  }

  /**
   * 初始化：从IndexedDB加载回收站数据
   */
  async init() {
    if (!this.initialized) {
      this.deletedItems = await loadRecycleItems();
      this.initialized = true;
    }
  }

  /**
   * 保存回收站数据到IndexedDB
   */
  async saveToStorage() {
    try {
      await saveRecycleItems(this.deletedItems);
    } catch (error) {
      console.error("Failed to save recycle items:", error);
    }
  }

  /**
   * 添加条目到回收站
   */
  async addToRecycle(item) {
    this.deletedItems.unshift({
      ...item,
      deletedAt: Date.now(),
    });
    await this.saveToStorage(); // 立即保存到IndexedDB
  }

  /**
   * 获取回收站中的所有条目
   */
  getRecycleItems() {
    return this.deletedItems;
  }

  /**
   * 删除条目（真正删除，不加入回收站）
   */
  async deleteFromRecycle(index) {
    if (index >= 0 && index < this.deletedItems.length) {
      this.deletedItems.splice(index, 1);
      await this.saveToStorage(); // 立即保存到IndexedDB
    }
  }

  /**
   * 清空回收站
   */
  async clearRecycle() {
    this.deletedItems = [];
    await this.saveToStorage(); // 立即保存到IndexedDB
  }

  /**
   * 恢复条目
   */
  async restoreItem(index) {
    if (index >= 0 && index < this.deletedItems.length) {
      const item = this.deletedItems[index];
      this.deletedItems.splice(index, 1);
      await this.saveToStorage(); // 立即保存到IndexedDB
      return item;
    }
    return null;
  }

  /**
   * 渲染回收站列表
   */
  renderRecycleList(items, searchQuery = "") {
    const filtered = !searchQuery
      ? items
      : items.filter((it) => {
          const title = this.firstLine(it.content);
          return title.toLowerCase().includes(searchQuery.toLowerCase());
        });

    this.dom.recycleList.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.style.padding = "8px 6px";
      empty.textContent = searchQuery ? "没有找到匹配的已删除条目。" : "回收站为空";
      this.dom.recycleList.appendChild(empty);
      this.dom.recycleActions.style.display = "none";
      return;
    }

    this.dom.recycleActions.style.display = "block";

    filtered.forEach((item, filteredIndex) => {
      const actualIndex = items.indexOf(item);
      const card = document.createElement("div");
      card.className = "recycle-item";

      const header = document.createElement("div");
      header.className = "recycle-item-header";

      const title = document.createElement("div");
      title.className = "recycle-item-title";
      
      // 如果是加密条目，显示加密标题
      if (item.encrypted && item.encryptedTitle) {
        title.textContent = `🔒 ${item.encryptedTitle}`;
      } else if (item.encrypted) {
        title.textContent = `🔒 已加密的内容`;
      } else {
        title.textContent = this.firstLine(item.content);
      }
      
      title.style.maxWidth = "calc(100% - 80px)";
      title.style.whiteSpace = "nowrap";
      title.style.overflow = "hidden";
      title.style.textOverflow = "ellipsis";

      const deleteTime = document.createElement("div");
      deleteTime.className = "recycle-item-time";
      deleteTime.textContent = `删除于: ${this.formatTime(item.deletedAt)}`;

      header.appendChild(title);
      header.appendChild(deleteTime);

      const preview = document.createElement("div");
      preview.className = "recycle-item-preview";
      preview.textContent = this.clamp(item.content.trim() || "（空）", 100);

      const actions = document.createElement("div");
      actions.className = "recycle-item-actions";

      const btnRestore = document.createElement("button");
      btnRestore.className = "primary";
      btnRestore.textContent = "恢复";
      btnRestore.onclick = () => {
        this.onItemRestore(actualIndex);
      };

      const btnDelete = document.createElement("button");
      btnDelete.className = "danger";
      btnDelete.textContent = "永久删除";
      btnDelete.onclick = () => {
        this.onItemDelete(actualIndex);
      };

      actions.appendChild(btnRestore);
      actions.appendChild(btnDelete);

      card.appendChild(header);
      card.appendChild(preview);
      card.appendChild(actions);
      this.dom.recycleList.appendChild(card);
    });
  }

  firstLine(text) {
    const lines = text.split("\n");
    return (lines[0] || "").trim() || "（无标题）";
  }

  clamp(text, length) {
    if (text.length <= length) return text;
    return text.substring(0, length) + "...";
  }

  formatTime(ts) {
    const d = new Date(ts);
    const pad2 = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  // 事件回调（由应用控制器设置）
  onItemRestore(index) {}
  onItemDelete(index) {}
  onClearAll() {}
}
