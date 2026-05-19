/**
 * 存档条目列表渲染
 */

import { clamp, resolveItemTitle, wordCount } from "../lib/text-utils.js";
import { itemHasTag, normalizeTags } from "../lib/item-utils.js";
import { excerptAroundSearch, filterItemsBySearch, getSearchTokens } from "../lib/search-utils.js";
import { formatTime } from "../lib/time-utils.js";
import { appendHighlightedText } from "./search-highlight.js";

export const getItemMenuActions = (item) =>
  item?.encrypted === true
    ? ["decrypt", "editTags", "generateTags"]
    : ["exportTxt", "exportMd", "editTags", "generateTags", "encrypt"];

export class ItemListView {
  constructor(domManager, handlers) {
    this.dom = domManager;
    this.handlers = handlers;
  }

  render(items) {
    const searchQuery = this.dom.getSearchValue();
    const searchTokens = getSearchTokens(searchQuery);
    const favoriteOnly = this.dom.getFavoriteFilterEnabled();
    const activeTag = this.dom.getActiveTagFilter();
    const baseItems = items
      .filter((item) => !favoriteOnly || item.favorite === true)
      .filter((item) => !activeTag || itemHasTag(item, activeTag));
    const filtered =
      searchTokens.length === 0 ? baseItems : filterItemsBySearch(baseItems, searchTokens);

    this.dom.clearListContent();

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.style.padding = "8px 6px";
      empty.textContent = searchQuery
        ? "未找到匹配条目。"
        : "暂无存档条目。把草稿存档后会出现在这里。";
      this.dom.appendListItem(empty);
      return;
    }

    if (searchTokens.length > 0 || favoriteOnly || activeTag) {
      const summary = document.createElement("div");
      summary.className = "search-summary muted small";
      summary.textContent = `找到 ${filtered.length} / ${items.length} 个匹配条目`;
      this.dom.appendListItem(summary);
    }

    for (const it of filtered) {
      this.dom.appendListItem(this.createItemCard(it, searchTokens));
    }
  }

  createItemCard(item, searchTokens = []) {
    const card = document.createElement("div");
    card.className = "item";

    const isEncrypted = item.encrypted === true;
    if (!isEncrypted) {
      card.title = "点击加载到草稿区";
    }

    const header = document.createElement("div");
    header.className = "item-header";

    const title = document.createElement("div");
    title.className = "titleline";
    if (isEncrypted) {
      title.appendChild(document.createTextNode("🔒 "));
    }
    const titleText = document.createElement("span");
    appendHighlightedText(titleText, resolveItemTitle(item), searchTokens);
    title.appendChild(titleText);
    title.title = "点击修改标题";
    title.tabIndex = 0;
    title.onclick = (e) => {
      e.stopPropagation();
      this.startTitleEdit(title, item);
    };
    title.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        this.startTitleEdit(title, item);
      }
    };

    const menuBtn = document.createElement("button");
    menuBtn.className = "item-menu-btn";
    menuBtn.innerHTML = "⋯";
    menuBtn.title = "操作菜单";
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      this.showItemMenu(item, menuBtn);
    };

    const headerActions = document.createElement("div");
    headerActions.className = "item-header-actions";

    const pinBtn = document.createElement("button");
    pinBtn.className = `item-icon-btn item-pin-btn${item.pinned ? " active" : ""}`;
    pinBtn.type = "button";
    pinBtn.textContent = "📌";
    pinBtn.title = item.pinned ? "取消置顶" : "置顶条目";
    pinBtn.onclick = (e) => {
      e.stopPropagation();
      this.handlers.onItemPinToggle(item.id);
    };

    const favoriteBtn = document.createElement("button");
    favoriteBtn.className = `item-icon-btn item-favorite-btn${item.favorite ? " active" : ""}`;
    favoriteBtn.type = "button";
    favoriteBtn.textContent = "★";
    favoriteBtn.title = item.favorite ? "取消收藏" : "收藏条目";
    favoriteBtn.onclick = (e) => {
      e.stopPropagation();
      this.handlers.onItemFavoriteToggle(item.id);
    };

    headerActions.append(pinBtn, favoriteBtn, menuBtn);
    header.append(title, headerActions);

    const meta = document.createElement("div");
    meta.className = "meta";

    if (isEncrypted) {
      meta.innerHTML = `<span>更新：${formatTime(item.updatedAt)}</span><span class="tag">已加密</span>`;
    } else {
      meta.innerHTML = `<span>更新：${formatTime(item.updatedAt)}</span><span class="tag">字数 ${wordCount(item.content)}</span>`;
    }

    const preview = document.createElement("div");
    preview.className = "preview";

    if (isEncrypted) {
      preview.innerHTML = `<div class="muted small">加密条目，解密后才能预览/加载</div><div class="muted" style="font-style: italic;">提示：${item.encryptionHint || "无提示"}</div>`;
    } else {
      const previewText =
        searchTokens.length > 0
          ? excerptAroundSearch(item.content, searchTokens, 240)
          : clamp(item.content.trim() || "（空）", 240);
      appendHighlightedText(preview, previewText, searchTokens);
    }

    const tagList = document.createElement("div");
    tagList.className = "item-tags";
    const tags = isEncrypted ? [] : normalizeTags(item.tags);
    tags.forEach((tag) => {
      const tagBtn = document.createElement("button");
      tagBtn.className = "note-tag";
      tagBtn.type = "button";
      tagBtn.textContent = `#${tag}`;
      tagBtn.title = `筛选标签：${tag}`;
      tagBtn.onclick = (e) => {
        e.stopPropagation();
        this.handlers.onTagFilterClick(tag);
      };
      tagList.appendChild(tagBtn);
    });

    const row = document.createElement("div");
    row.className = "row";

    if (isEncrypted) {
      const btnDecrypt = document.createElement("button");
      btnDecrypt.className = "primary";
      btnDecrypt.textContent = "🔓 解密";
      btnDecrypt.onclick = (e) => {
        e.stopPropagation();
        this.handlers.onItemDecryptClick(item.id);
      };

      const btnDel = document.createElement("button");
      btnDel.className = "danger";
      btnDel.textContent = "删除";
      btnDel.onclick = (e) => {
        e.stopPropagation();
        this.handlers.onItemDeleteClick(item.id);
      };

      row.append(btnDecrypt, btnDel);
    } else {
      const btnLoad = document.createElement("button");
      btnLoad.textContent = "加载到草稿";
      btnLoad.onclick = (e) => {
        e.stopPropagation();
        this.handlers.onItemLoadClick(item.id);
      };

      const btnCopyItem = document.createElement("button");
      btnCopyItem.textContent = "复制";
      btnCopyItem.onclick = async (e) => {
        e.stopPropagation();
        await this.handlers.copyText(item.content);
      };

      const btnDel = document.createElement("button");
      btnDel.className = "danger";
      btnDel.textContent = "删除";
      btnDel.onclick = (e) => {
        e.stopPropagation();
        this.handlers.onItemDeleteClick(item.id);
      };

      row.append(btnLoad, btnCopyItem, btnDel);
    }

    card.append(header, meta);
    if (tagList.children.length > 0) {
      card.appendChild(tagList);
    }
    card.append(preview, row);

    if (!isEncrypted) {
      card.onclick = () => this.handlers.onItemLoadClick(item.id);
    }

    return card;
  }

  startTitleEdit(titleElement, item) {
    if (titleElement.querySelector("input")) {
      return;
    }

    const originalDisplay = titleElement.textContent;
    const input = document.createElement("input");
    input.className = "titleline-input";
    input.type = "text";
    input.value = resolveItemTitle(item);
    input.placeholder = "输入标题，留空则使用第一行";
    input.setAttribute("aria-label", "条目标题");

    titleElement.classList.add("editing");
    titleElement.replaceChildren(input);

    let handled = false;
    const restore = () => {
      titleElement.classList.remove("editing");
      titleElement.textContent = originalDisplay;
    };

    const commit = () => {
      if (handled) return;
      handled = true;
      restore();
      this.handlers.onItemTitleEdit(item.id, input.value);
    };

    const cancel = () => {
      if (handled) return;
      handled = true;
      restore();
    };

    input.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    });
    input.addEventListener("blur", commit);

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  showItemMenu(item, buttonElement) {
    const existingMenu = document.querySelector(".item-context-menu");
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement("div");
    menu.className = "item-context-menu";

    const actions = getItemMenuActions(item);

    if (actions.includes("decrypt")) {
      const decryptOption = document.createElement("div");
      decryptOption.className = "menu-item";
      decryptOption.textContent = "🔓 解密";
      decryptOption.onclick = () => {
        menu.remove();
        this.handlers.onItemDecryptClick(item.id);
      };
      menu.appendChild(decryptOption);
    }

    if (actions.includes("exportTxt")) {
      const exportTxtOption = document.createElement("div");
      exportTxtOption.className = "menu-item";
      exportTxtOption.textContent = "导出 TXT";
      exportTxtOption.onclick = () => {
        menu.remove();
        this.handlers.onItemExportClick(item.id, "txt");
      };
      menu.appendChild(exportTxtOption);
    }

    if (actions.includes("exportMd")) {
      const exportMdOption = document.createElement("div");
      exportMdOption.className = "menu-item";
      exportMdOption.textContent = "导出 MD";
      exportMdOption.onclick = () => {
        menu.remove();
        this.handlers.onItemExportClick(item.id, "md");
      };
      menu.appendChild(exportMdOption);
    }

    if (actions.includes("editTags")) {
      const editTagsOption = document.createElement("div");
      editTagsOption.className = "menu-item";
      editTagsOption.textContent = "编辑标签";
      editTagsOption.onclick = () => {
        menu.remove();
        this.handlers.onItemTagsEdit(item.id);
      };
      menu.appendChild(editTagsOption);
    }

    if (actions.includes("generateTags")) {
      const generateTagsOption = document.createElement("div");
      generateTagsOption.className = "menu-item";
      generateTagsOption.textContent = "AI 生成标签";
      generateTagsOption.onclick = () => {
        menu.remove();
        this.handlers.onItemGenerateTags(item.id);
      };
      menu.appendChild(generateTagsOption);
    }

    if (actions.includes("encrypt")) {
      const encryptOption = document.createElement("div");
      encryptOption.className = "menu-item";
      encryptOption.textContent = "🔒 加密";
      encryptOption.onclick = () => {
        menu.remove();
        this.handlers.onItemEncryptClick(item.id);
      };
      menu.appendChild(encryptOption);
    }

    const rect = buttonElement.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;

    document.body.appendChild(menu);

    const closeMenu = (e) => {
      if (!menu.contains(e.target) && e.target !== buttonElement) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener("click", closeMenu);
    }, 0);
  }
}
