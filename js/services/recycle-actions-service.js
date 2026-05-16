/**
 * 回收站操作协调
 */

import { saveItem } from "../storage/item-storage.js";
import { resolveItemTitle } from "../lib/text-utils.js";

export class RecycleActionsService {
  constructor(app) {
    this.app = app;
  }

  onRecycleSearch() {
    const { app } = this;
    const searchQuery = app.dom.getRecycleSearchValue();
    const items = app.recycleService.getRecycleItems();
    app.recycleListView.render(items, searchQuery);
  }

  async restoreFromRecycle(index) {
    const { app } = this;
    const items = app.recycleService.getRecycleItems();
    if (index < 0 || index >= items.length) return;

    const item = items[index];
    const result = await app.modal.show({
      title: "恢复条目？",
      message: `标题：${resolveItemTitle(item)}`,
      okText: "确认恢复",
      cancelText: "取消",
    });

    if (!result.ok) return;

    const restoredItem = await app.recycleService.restoreItem(index);
    if (restoredItem) {
      delete restoredItem.deletedAt;
      app.items.unshift(restoredItem);
      await saveItem(restoredItem);
      app.render();
      app.ui.showToast("条目已恢复");
      app.recycleListView.render(app.recycleService.getRecycleItems());
    }
  }

  async deleteFromRecycle(index) {
    const { app } = this;
    const items = app.recycleService.getRecycleItems();
    if (index < 0 || index >= items.length) return;

    const item = items[index];
    const result = await app.modal.show({
      title: "永久删除条目？",
      message: `此操作不可恢复。\n\n标题：${resolveItemTitle(item)}`,
      okText: "永久删除",
      cancelText: "取消",
    });

    if (!result.ok) return;

    await app.recycleService.deleteFromRecycle(index);
    app.ui.showToast("条目已永久删除");
    app.recycleListView.render(app.recycleService.getRecycleItems());
  }

  async clearRecycleBin() {
    const { app } = this;
    const items = app.recycleService.getRecycleItems();
    if (items.length === 0) {
      app.ui.showToast("回收站已为空");
      return;
    }

    const result = await app.modal.show({
      title: "清空回收站",
      message: `将永久删除所有 ${items.length} 个已删除的条目，此操作不可恢复。`,
      okText: "清空",
      cancelText: "取消",
    });

    if (!result.ok) return;

    await app.recycleService.clearRecycle();
    app.ui.showToast("回收站已清空");
    app.recycleListView.render(app.recycleService.getRecycleItems());
  }
}
