/**
 * 回收站列表渲染
 */

import { clamp, resolveItemTitle } from "../lib/text-utils.js";
import { excerptAroundSearch, filterItemsBySearch, getSearchTokens } from "../lib/search-utils.js";
import { formatTime } from "../lib/time-utils.js";
import { appendHighlightedText } from "./search-highlight.js";

export class RecycleListView {
  constructor(domManager, handlers) {
    this.dom = domManager;
    this.handlers = handlers;
  }

  render(items, searchQuery = "") {
    const searchTokens = getSearchTokens(searchQuery);
    const filtered = searchTokens.length === 0 ? items : filterItemsBySearch(items, searchTokens);

    this.dom.recycleList.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.style.padding = "8px 6px";
      empty.textContent = searchTokens.length > 0 ? "没有找到匹配的已删除条目。" : "回收站为空";
      this.dom.recycleList.appendChild(empty);
      this.dom.recycleActions.style.display = "none";
      return;
    }

    this.dom.recycleActions.style.display = "block";

    if (searchTokens.length > 0) {
      const summary = document.createElement("div");
      summary.className = "search-summary muted small";
      summary.textContent = `找到 ${filtered.length} / ${items.length} 个匹配条目`;
      this.dom.recycleList.appendChild(summary);
    }

    filtered.forEach((item) => {
      const actualIndex = items.indexOf(item);
      this.dom.recycleList.appendChild(this.createRecycleCard(item, actualIndex, searchTokens));
    });
  }

  createRecycleCard(item, actualIndex, searchTokens = []) {
    const card = document.createElement("div");
    card.className = "recycle-item";

    const header = document.createElement("div");
    header.className = "recycle-item-header";

    const title = document.createElement("div");
    title.className = "recycle-item-title";
    if (item.encrypted) {
      title.appendChild(document.createTextNode("🔒 "));
    }
    const titleText = document.createElement("span");
    appendHighlightedText(titleText, resolveItemTitle(item), searchTokens);
    title.appendChild(titleText);
    title.style.maxWidth = "calc(100% - 80px)";
    title.style.whiteSpace = "nowrap";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";

    const deleteTime = document.createElement("div");
    deleteTime.className = "recycle-item-time";
    deleteTime.textContent = `删除于: ${formatTime(item.deletedAt)}`;

    header.appendChild(title);
    header.appendChild(deleteTime);

    const preview = document.createElement("div");
    preview.className = "recycle-item-preview";
    if (item.encrypted) {
      preview.textContent = "加密条目，解密后才能查看内容";
    } else {
      const previewText =
        searchTokens.length > 0
          ? excerptAroundSearch(item.content, searchTokens, 100)
          : clamp(item.content.trim() || "（空）", 100);
      appendHighlightedText(preview, previewText, searchTokens);
    }

    const actions = document.createElement("div");
    actions.className = "recycle-item-actions";

    const btnRestore = document.createElement("button");
    btnRestore.className = "primary";
    btnRestore.textContent = "恢复";
    btnRestore.onclick = () => {
      this.handlers.onItemRestore(actualIndex);
    };

    const btnDelete = document.createElement("button");
    btnDelete.className = "danger";
    btnDelete.textContent = "永久删除";
    btnDelete.onclick = () => {
      this.handlers.onItemDelete(actualIndex);
    };

    actions.appendChild(btnRestore);
    actions.appendChild(btnDelete);

    card.appendChild(header);
    card.appendChild(preview);
    card.appendChild(actions);
    return card;
  }
}
