/**
 * UI操作模块
 */

import { humanBytes, clamp, resolveItemTitle, wordCount } from "./utils.js";

export class UIController {
  constructor(domManager) {
    this.dom = domManager;
    this.toastTimer = null;
  }

  showToast(msg) {
    this.dom.toast.textContent = msg;
    this.dom.toast.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.dom.toast.classList.remove("show");
    }, 1800);
  }

  updateTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  getTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  updateMeta(draftValue, items, draftUsageBytes, totalUsageBytes) {
    const wc = wordCount(draftValue);
    const itemCount = items.length;
    const draftUsage = humanBytes(draftUsageBytes || 0);
    const totalUsage = humanBytes(totalUsageBytes || 0);

    this.dom.updateWordCount(wc);
    this.dom.updateItemCount(itemCount);
    this.dom.updateDraftUsage(draftUsage);
    this.dom.updateUsage(totalUsage);
  }

  renderItemsList(items, items_allItems) {
    const searchQuery = this.dom.getSearchValue();
    const filtered = !searchQuery
      ? items
      : items.filter((it) => {
          const titleMatch = resolveItemTitle(it).toLowerCase().includes(searchQuery);
          if (it.encrypted) {
            return titleMatch;
          }
          return titleMatch || it.content.toLowerCase().includes(searchQuery);
        });

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

    for (const it of filtered) {
      const card = document.createElement("div");
      card.className = "item";
      
      // 判断是否加密
      const isEncrypted = it.encrypted === true;

      if (!isEncrypted) {
        card.title = "点击加载到草稿区";
      }

      // 头部容器（包含标题和菜单）
      const header = document.createElement("div");
      header.className = "item-header";

      const title = document.createElement("div");
      title.className = "titleline";
      title.textContent = isEncrypted ? `🔒 ${resolveItemTitle(it)}` : resolveItemTitle(it);
      title.title = "点击修改标题";
      title.tabIndex = 0;
      title.onclick = (e) => {
        e.stopPropagation();
        this.startTitleEdit(title, it);
      };
      title.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          this.startTitleEdit(title, it);
        }
      };

      // 三个点菜单按钮
      const menuBtn = document.createElement("button");
      menuBtn.className = "item-menu-btn";
      menuBtn.innerHTML = "⋯";
      menuBtn.title = "操作菜单";
      menuBtn.onclick = (e) => {
        e.stopPropagation();
        this.showItemMenu(it, menuBtn);
      };

      header.append(title, menuBtn);

      const meta = document.createElement("div");
      meta.className = "meta";
      
      if (isEncrypted) {
        meta.innerHTML = `<span>更新：${this.formatTime(it.updatedAt)}</span><span class="tag">已加密</span>`;
      } else {
        meta.innerHTML = `<span>更新：${this.formatTime(it.updatedAt)}</span><span class="tag">字数 ${wordCount(it.content)}</span>`;
      }

      const preview = document.createElement("div");
      preview.className = "preview";
      
      if (isEncrypted) {
        preview.innerHTML = `<div class="muted small">加密条目，解密后才能预览/加载</div><div class="muted" style="font-style: italic;">提示：${it.encryptionHint || "无提示"}</div>`;
      } else {
        preview.textContent = clamp(it.content.trim() || "（空）", 240);
      }

      const row = document.createElement("div");
      row.className = "row";

      // 根据加密状态显示不同按钮
      if (isEncrypted) {
        const btnDecrypt = document.createElement("button");
        btnDecrypt.className = "primary";
        btnDecrypt.textContent = "🔓 解密";
        btnDecrypt.onclick = (e) => {
          e.stopPropagation();
          this.onItemDecryptClick(it.id);
        };

        const btnDel = document.createElement("button");
        btnDel.className = "danger";
        btnDel.textContent = "删除";
        btnDel.onclick = (e) => {
          e.stopPropagation();
          this.onItemDeleteClick(it.id);
        };

        row.append(btnDecrypt, btnDel);
      } else {
        const btnLoad = document.createElement("button");
        btnLoad.textContent = "加载到草稿";
        btnLoad.onclick = (e) => {
          e.stopPropagation();
          this.onItemLoadClick(it.id);
        };

        const btnCopyItem = document.createElement("button");
        btnCopyItem.textContent = "复制";
        btnCopyItem.onclick = async (e) => {
          e.stopPropagation();
          await this.copyText(it.content);
        };

        const btnDel = document.createElement("button");
        btnDel.className = "danger";
        btnDel.textContent = "删除";
        btnDel.onclick = (e) => {
          e.stopPropagation();
          this.onItemDeleteClick(it.id);
        };

        row.append(btnLoad, btnCopyItem, btnDel);
      }

      card.append(header, meta, preview, row);
      
      if (!isEncrypted) {
        card.onclick = () => this.onItemLoadClick(it.id);
      }

      this.dom.appendListItem(card);
    }
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
      this.onItemTitleEdit(item.id, input.value);
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

  /**
   * 显示条目菜单
   */
  showItemMenu(item, buttonElement) {
    // 移除已存在的菜单
    const existingMenu = document.querySelector(".item-context-menu");
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement("div");
    menu.className = "item-context-menu";

    const isEncrypted = item.encrypted === true;

    if (isEncrypted) {
      // 加密条目：显示解密选项
      const decryptOption = document.createElement("div");
      decryptOption.className = "menu-item";
      decryptOption.textContent = "🔓 解密";
      decryptOption.onclick = () => {
        menu.remove();
        this.onItemDecryptClick(item.id);
      };
      menu.appendChild(decryptOption);
    } else {
      // 未加密条目：显示加密选项
      const encryptOption = document.createElement("div");
      encryptOption.className = "menu-item";
      encryptOption.textContent = "🔒 加密";
      encryptOption.onclick = () => {
        menu.remove();
        this.onItemEncryptClick(item.id);
      };
      menu.appendChild(encryptOption);
    }

    // 定位菜单
    const rect = buttonElement.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;

    document.body.appendChild(menu);

    // 点击外部关闭菜单
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

  formatTime(ts) {
    const d = new Date(ts);
    const pad2 = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast("已复制到剪贴板");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      this.showToast("已复制到剪贴板");
    }
  }

  // Event listeners - will be overridden by controller
  onItemLoadClick(id) {}
  onItemDeleteClick(id) {}
  onItemEncryptClick(id) {}
  onItemDecryptClick(id) {}
  onItemTitleEdit(id, title) {}
  onRecycleItemRestore(index) {}
  onRecycleItemDelete(index) {}
}
