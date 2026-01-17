/**
 * UI操作模块
 */

import { humanBytes, clamp, firstLine, wordCount } from "./utils.js";

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

  updateMeta(draftValue, items, storageBytes) {
    const wc = wordCount(draftValue);
    const itemCount = items.length;
    const usage = humanBytes(storageBytes);

    this.dom.updateWordCount(wc);
    this.dom.updateItemCount(itemCount);
    this.dom.updateUsage(usage);
  }

  renderItemsList(items, items_allItems) {
    const searchQuery = this.dom.getSearchValue();
    const filtered = !searchQuery
      ? items
      : items.filter((it) => it.content.toLowerCase().includes(searchQuery));

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
      card.title = "点击加载到草稿区";

      const title = document.createElement("div");
      title.className = "titleline";
      title.textContent = firstLine(it.content);

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.innerHTML = `<span>更新：${this.formatTime(it.updatedAt)}</span><span class="tag">字数 ${wordCount(it.content)}</span>`;

      const preview = document.createElement("div");
      preview.className = "preview";
      preview.textContent = clamp(it.content.trim() || "（空）", 240);

      const row = document.createElement("div");
      row.className = "row";

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
      card.append(title, meta, preview, row);
      card.onclick = () => this.onItemLoadClick(it.id);

      this.dom.appendListItem(card);
    }
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
}
