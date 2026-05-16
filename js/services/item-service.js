/**
 * 条目增删改服务
 */

import { clearDraftItemId } from "../storage/draft-storage.js";
import { deleteItemById, saveItem } from "../storage/item-storage.js";
import { cleanTitle, firstLine } from "../lib/text-utils.js";
import { now } from "../lib/time-utils.js";

export class ItemService {
  constructor(app) {
    this.app = app;
  }

  async renameItemTitle(id, rawTitle) {
    const { app } = this;
    const itemIndex = app.items.findIndex((x) => x.id === id);
    if (itemIndex === -1) return;

    const item = app.items[itemIndex];
    const autoTitle = item.encrypted ? undefined : firstLine(item.content);
    const currentTitle = cleanTitle(item.title);
    const rawNextTitle = cleanTitle(rawTitle);
    const nextTitle = !item.encrypted && rawNextTitle === autoTitle ? undefined : rawNextTitle;

    if (nextTitle === currentTitle) {
      return;
    }

    app.items[itemIndex] = {
      ...item,
      title: nextTitle,
      encryptedTitle: item.encrypted
        ? nextTitle || cleanTitle(item.encryptedTitle) || "已加密的内容"
        : item.encryptedTitle,
      updatedAt: now(),
    };

    await saveItem(app.items[itemIndex]);
    app.render();

    if (nextTitle) {
      app.ui.showToast("标题已更新");
    } else {
      app.ui.showToast(item.encrypted ? "已恢复为默认标题" : "已恢复为正文第一行标题");
    }
  }

  async deleteItem(id) {
    const { app } = this;
    const item = app.items.find((x) => x.id === id);
    if (!item) return;

    await app.recycleService.addToRecycle(item);

    app.items = app.items.filter((x) => x.id !== id);
    if (app.currentLoadedItemId === id) {
      app.currentLoadedItemId = null;
      clearDraftItemId();
    }
    await deleteItemById(id);
    app.render();
    app.ui.showToast("已删除条目（可在回收站恢复）");
  }
}
