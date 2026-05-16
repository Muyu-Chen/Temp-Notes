/**
 * 回收站列表渲染
 */

import { clamp, resolveItemTitle } from "../lib/text-utils.js";
import { formatTime } from "../lib/time-utils.js";

export class RecycleListView {
  constructor(domManager, handlers) {
    this.dom = domManager;
    this.handlers = handlers;
  }

  render(items, searchQuery = "") {
    const normalizedSearch = searchQuery.toLowerCase();
    const filtered = !normalizedSearch
      ? items
      : items.filter((it) => resolveItemTitle(it).toLowerCase().includes(normalizedSearch));

    this.dom.recycleList.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.style.padding = "8px 6px";
      empty.textContent = normalizedSearch ? "没有找到匹配的已删除条目。" : "回收站为空";
      this.dom.recycleList.appendChild(empty);
      this.dom.recycleActions.style.display = "none";
      return;
    }

    this.dom.recycleActions.style.display = "block";

    filtered.forEach((item) => {
      const actualIndex = items.indexOf(item);
      this.dom.recycleList.appendChild(this.createRecycleCard(item, actualIndex));
    });
  }

  createRecycleCard(item, actualIndex) {
    const card = document.createElement("div");
    card.className = "recycle-item";

    const header = document.createElement("div");
    header.className = "recycle-item-header";

    const title = document.createElement("div");
    title.className = "recycle-item-title";
    title.textContent = item.encrypted ? `🔒 ${resolveItemTitle(item)}` : resolveItemTitle(item);
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
    preview.textContent = item.encrypted
      ? "加密条目，解密后才能查看内容"
      : clamp(item.content.trim() || "（空）", 100);

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
