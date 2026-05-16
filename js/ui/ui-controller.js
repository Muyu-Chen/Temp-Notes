/**
 * UI操作模块
 */

import { humanBytes } from "../lib/bytes-utils.js";
import { wordCount } from "../lib/text-utils.js";
import { ItemListView } from "./item-list-view.js";

export class UIController {
  constructor(domManager) {
    this.dom = domManager;
    this.toastTimer = null;
    this.itemListView = new ItemListView(domManager, this);
  }

  showToast(msg) {
    this.dom.toast.textContent = msg;
    this.dom.toast.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.dom.toast.classList.remove("show");
    }, 1800);
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

  renderItemsList(items) {
    this.itemListView.render(items);
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
}
