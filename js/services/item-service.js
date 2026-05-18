/**
 * 条目增删改服务
 */

import { clearDraftItemId } from "../storage/draft-storage.js";
import { deleteItemById, saveItem } from "../storage/item-storage.js";
import { normalizeTags, sortItemsForDisplay } from "../lib/item-utils.js";
import { cleanTitle, firstLine } from "../lib/text-utils.js";
import { now } from "../lib/time-utils.js";
import { saveLLMDebugLog } from "./settings-service.js";

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

  async togglePinned(id) {
    const { app } = this;
    const itemIndex = app.items.findIndex((x) => x.id === id);
    if (itemIndex === -1) return;

    const item = app.items[itemIndex];
    const nextPinned = item.pinned !== true;
    app.items[itemIndex] = {
      ...item,
      pinned: nextPinned,
      pinnedAt: nextPinned ? now() : undefined,
    };

    await saveItem(app.items[itemIndex]);
    app.items = sortItemsForDisplay(app.items);
    app.render();
    app.ui.showToast(nextPinned ? "已置顶条目" : "已取消置顶");
  }

  async toggleFavorite(id) {
    const { app } = this;
    const itemIndex = app.items.findIndex((x) => x.id === id);
    if (itemIndex === -1) return;

    const item = app.items[itemIndex];
    const nextFavorite = item.favorite !== true;
    app.items[itemIndex] = {
      ...item,
      favorite: nextFavorite,
    };

    await saveItem(app.items[itemIndex]);
    app.render();
    app.ui.showToast(nextFavorite ? "已收藏条目" : "已取消收藏");
  }

  async editTags(id) {
    const { app } = this;
    const itemIndex = app.items.findIndex((x) => x.id === id);
    if (itemIndex === -1) return;

    const item = app.items[itemIndex];
    if (item.encrypted) {
      const warning = await app.modal.show({
        title: "编辑加密条目标签",
        message: "标签会以明文保存并用于检索，但加密条目的正文仍不会显示。",
        okText: "继续编辑",
        cancelText: "取消",
      });
      if (!warning.ok) return;
    }

    const result = await app.modal.show({
      title: "编辑标签",
      message: "多个标签请用逗号或换行分隔。",
      inputs: [
        {
          type: "text",
          label: "标签",
          placeholder: "例如：灵感, 工作, 稍后处理",
          required: false,
          value: normalizeTags(item.tags).join(", "),
        },
      ],
      okText: "保存",
      cancelText: "取消",
    });

    if (!result.ok) return;

    const nextTags = normalizeTags(result.values[0]);
    const currentTags = normalizeTags(item.tags);
    if (nextTags.join("\n").toLowerCase() === currentTags.join("\n").toLowerCase()) {
      return;
    }

    app.items[itemIndex] = {
      ...item,
      tags: nextTags,
    };

    await saveItem(app.items[itemIndex]);
    app.render();
    app.ui.showToast(nextTags.length ? "标签已更新" : "标签已清空");
  }

  async generateTags(id) {
    const { app } = this;
    const itemIndex = app.items.findIndex((x) => x.id === id);
    if (itemIndex === -1) return;

    const item = app.items[itemIndex];
    if (item.encrypted) {
      app.ui.showToast("请先解密后再生成标签");
      return;
    }

    app.ui.showToast("正在生成标签...");
    const result = await app.llmService.generateTags(app.getLLMSettings(), item);
    if (!result.ok) {
      if (result.debugLog) {
        saveLLMDebugLog(result.debugLog);
        app.dom.setLLMDebugLog(result.debugLog);
        app.ui.showToast(`${result.message}（日志已保存）`);
        return;
      }
      app.ui.showToast(result.message);
      return;
    }

    const currentTags = normalizeTags(item.tags);
    const nextTags = normalizeTags([...currentTags, ...result.tags]);
    if (nextTags.join("\n").toLowerCase() === currentTags.join("\n").toLowerCase()) {
      app.ui.showToast("没有新增标签");
      return;
    }

    app.items[itemIndex] = {
      ...item,
      tags: nextTags,
    };

    await saveItem(app.items[itemIndex]);
    app.render();
    app.ui.showToast(`已添加 ${nextTags.length - currentTags.length} 个标签`);
  }
}
