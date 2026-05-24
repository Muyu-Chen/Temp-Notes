/**
 * UI操作模块
 */

import { humanBytes } from "../lib/bytes-utils.js";
import { wordCount } from "../lib/text-utils.js";
import { getPlaybackProgress } from "../lib/audio-waveform-utils.js";
import { ItemListView } from "./item-list-view.js";
import { renderMarkdown } from "./markdown-renderer.js";

const formatDuration = (durationMs = 0) => {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

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

  renderDraftAttachments(attachments = [], { playingId = null } = {}) {
    const root = this.dom.draftAttachments;
    root.replaceChildren();
    root.hidden = attachments.length === 0;

    attachments.forEach((attachment) => {
      const item = document.createElement("div");
      item.className = "draft-attachment";

      const isPlaying = playingId === attachment.id;
      const play = document.createElement("button");
      play.className = `draft-attachment-play${isPlaying ? " playing" : ""}`;
      play.type = "button";
      // use non-breaking space to ensure spacing is preserved in UI
      const nbsp = '\u00A0';
      play.textContent = isPlaying ? "Ⅱ" : nbsp + "▶";
      play.title = isPlaying ? "暂停录音" : "播放录音";
      play.setAttribute("aria-label", play.title);
      play.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onDraftAttachmentPlay(attachment.id);
      });

      const body = document.createElement("div");
      body.className = "draft-attachment-body";

      const name = document.createElement("div");
      name.className = "draft-attachment-name";
      name.textContent = attachment.name || "录音";
      name.title = "点击修改录音名称";
      name.tabIndex = 0;
      name.setAttribute("role", "button");
      name.addEventListener("click", (e) => {
        e.stopPropagation();
        this.startDraftAttachmentNameEdit(name, attachment);
      });
      name.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          this.startDraftAttachmentNameEdit(name, attachment);
        }
      });

      const meta = document.createElement("div");
      meta.className = "draft-attachment-meta";
      meta.textContent = `${formatDuration(attachment.durationMs)} · ${humanBytes(
        attachment.size || 0
      )}`;

      const menuBtn = document.createElement("button");
      menuBtn.className = "draft-attachment-menu-btn";
      menuBtn.type = "button";
      menuBtn.textContent = "⋯";
      menuBtn.title = "录音操作";
      menuBtn.setAttribute("aria-label", "录音操作");
      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showDraftAttachmentMenu(attachment, menuBtn);
      });

      const expandBtn = document.createElement("button");
      expandBtn.className = "draft-attachment-expand-btn";
      expandBtn.type = "button";
      expandBtn.textContent = "";
      expandBtn.title = "展开播放器";
      expandBtn.setAttribute("aria-label", "展开播放器");
      expandBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onDraftAttachmentExpand(attachment.id);
      });

      const footer = document.createElement("div");
      footer.className = "draft-attachment-footer";
      const footerActions = document.createElement("div");
      footerActions.className = "draft-attachment-footer-actions";
      footerActions.append(menuBtn, expandBtn);
      footer.append(meta, footerActions);

      body.append(name, footer);

      item.append(play, body);
      root.appendChild(item);
    });
  }

  renderDraftAttachmentPlayer(attachment, state = {}) {
    const panel = this.dom.attachmentPlayerPanel;
    if (!attachment) {
      panel.hidden = true;
      panel.dataset.waveformKey = "";
      return;
    }

    const currentTime = Number(state.currentTime || 0);
    const duration = Number(state.duration || attachment.durationMs / 1000 || 0);
    const progress = getPlaybackProgress(currentTime, duration);
    const waveform = Array.isArray(state.waveform) && state.waveform.length > 0
      ? state.waveform
      : Array.from({ length: 56 }, () => 0);

    panel.hidden = false;
    panel.dataset.attachmentId = attachment.id;
    this.dom.attachmentPlayerName.textContent = attachment.name || "录音";
    this.dom.attachmentPlayerName.title = attachment.name || "录音";
    this.dom.attachmentPlayerMeta.textContent = `${formatDuration(attachment.durationMs)} · ${humanBytes(
      attachment.size || 0
    )}`;
    this.dom.attachmentPlayerPlay.textContent = state.playing ? "Ⅱ" : "▶";
    this.dom.attachmentPlayerPlay.title = state.playing ? "暂停录音" : "播放录音";
    this.dom.attachmentPlayerPlay.setAttribute("aria-label", this.dom.attachmentPlayerPlay.title);
    this.dom.attachmentPlayerSpeed.textContent = `${state.playbackRate || 1}x`;
    this.dom.attachmentPlayerSeek.value = String(Math.round(progress * 1000));
    this.dom.attachmentPlayerSeek.style.setProperty("--progress", `${Math.round(progress * 100)}%`);
    this.dom.attachmentPlayerCurrentTime.textContent = formatDuration(currentTime * 1000);
    this.dom.attachmentPlayerDuration.textContent = formatDuration(duration * 1000);

    const waveformKey = `${attachment.id}:${waveform.map((value) => Math.round(value * 100)).join(",")}`;
    if (panel.dataset.waveformKey !== waveformKey) {
      panel.dataset.waveformKey = waveformKey;
      this.renderAttachmentWaveform(waveform);
    }
    this.updateAttachmentWaveformProgress(progress);
  }

  renderAttachmentWaveform(waveform) {
    const root = this.dom.attachmentPlayerWaveform;
    root.replaceChildren();
    waveform.forEach((value, index) => {
      const bar = document.createElement("button");
      bar.type = "button";
      bar.className = "attachment-player-waveform-bar";
      bar.style.height = `${Math.max(14, Math.round(12 + Number(value || 0) * 40))}px`;
      bar.title = "跳转到此处";
      bar.addEventListener("click", (e) => {
        e.stopPropagation();
        const nextProgress = index / Math.max(1, waveform.length - 1);
        this.onDraftAttachmentSeek(nextProgress);
      });
      root.appendChild(bar);
    });
  }

  updateAttachmentWaveformProgress(progress) {
    const bars = Array.from(this.dom.attachmentPlayerWaveform.children);
    if (!bars.length) return;

    const playedCount = Math.floor(Math.min(Math.max(progress, 0), 1) * bars.length);
    bars.forEach((bar, index) => {
      bar.classList.toggle("played", index < playedCount);
    });
  }

  closeDraftAttachmentMenu() {
    document.querySelector(".draft-attachment-menu")?.remove();
  }

  showAttachmentPlayerMoreMenu(attachment, buttonElement) {
    this.closeDraftAttachmentMenu();

    const menu = document.createElement("div");
    menu.className = "draft-attachment-menu";

    const actions = [
      { label: "插入转录文本", handler: () => this.onDraftAttachmentInsertTranscription(attachment.id) },
      { label: "生成摘要", handler: () => this.onDraftAttachmentGenerateSummary(attachment.id) },
      { label: "插入摘要文本", handler: () => this.onDraftAttachmentInsertSummary(attachment.id) },
    ];

    actions.forEach((action) => {
      const item = document.createElement("button");
      item.className = "draft-attachment-menu-item";
      item.type = "button";
      item.textContent = action.label;
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.remove();
        action.handler();
      });
      menu.appendChild(item);
    });

    const deleteItem = document.createElement("button");
    deleteItem.className = "draft-attachment-menu-item menu-danger";
    deleteItem.type = "button";
    deleteItem.textContent = "删除";
    deleteItem.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.remove();
      this.onDraftAttachmentDelete(attachment.id);
    });
    menu.appendChild(deleteItem);

    document.body.appendChild(menu);

    const rect = buttonElement.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(rect.right - menuRect.width, window.innerWidth - menuRect.width - 8)}px`;
    menu.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - menuRect.height - 8)}px`;

    setTimeout(() => {
      const closeOnOutside = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", closeOnOutside);
        }
      };
      document.addEventListener("click", closeOnOutside);
    }, 0);
  }

  showDraftAttachmentMenu(attachment, buttonElement) {
    this.closeDraftAttachmentMenu();

    const menu = document.createElement("div");
    menu.className = "draft-attachment-menu";

    const actions = [
      { label: "转录", handler: () => this.onDraftAttachmentTranscribe(attachment.id) },
      { label: "插入转录文本", handler: () => this.onDraftAttachmentInsertTranscription(attachment.id) },
      { label: "生成摘要", handler: () => this.onDraftAttachmentGenerateSummary(attachment.id) },
      { label: "插入摘要文本", handler: () => this.onDraftAttachmentInsertSummary(attachment.id) },
      { label: "导出", handler: () => this.onDraftAttachmentExport(attachment.id) },
      {
        label: "删除",
        className: "menu-danger",
        handler: () => this.onDraftAttachmentDelete(attachment.id),
      },
    ];

    actions.forEach((action) => {
      const item = document.createElement("button");
      item.className = `draft-attachment-menu-item${action.className ? ` ${action.className}` : ""}`;
      item.type = "button";
      item.textContent = action.label;
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.remove();
        action.handler();
      });
      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    const rect = buttonElement.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(rect.right - menuRect.width, window.innerWidth - menuRect.width - 8)}px`;
    menu.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - menuRect.height - 8)}px`;

    setTimeout(() => {
      const closeOnOutside = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", closeOnOutside);
        }
      };
      document.addEventListener("click", closeOnOutside);
    }, 0);
  }

  startDraftAttachmentNameEdit(nameElement, attachment) {
    if (nameElement.querySelector("input")) {
      return;
    }

    const originalName = attachment.name || "录音";
    const input = document.createElement("input");
    input.className = "draft-attachment-name-input";
    input.type = "text";
    input.value = originalName;
    input.placeholder = "录音名称";
    input.setAttribute("aria-label", "录音名称");

    nameElement.classList.add("editing");
    nameElement.replaceChildren(input);

    let handled = false;
    const restore = () => {
      nameElement.classList.remove("editing");
      nameElement.textContent = originalName;
    };

    const commit = () => {
      if (handled) return;
      handled = true;
      restore();
      this.onDraftAttachmentRename(attachment.id, input.value);
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

  updateDraftPreview() {
    this.dom.setDraftPreview(renderMarkdown(this.dom.getDraftValue()));
    this.dom.draftPreview.querySelectorAll("a[href]").forEach((link) => {
      link.target = "_blank";
      link.rel = "noreferrer";
    });
  }

  setDraftMode(mode) {
    this.dom.setDraftMode(mode);
    if (mode === "preview") {
      this.updateDraftPreview();
    } else {
      this.dom.focusDraft();
    }
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
  onItemExportClick(id, format) {}
  onItemTitleEdit(id, title) {}
  onItemPinToggle(id) {}
  onItemFavoriteToggle(id) {}
  onItemTagsEdit(id) {}
  onItemGenerateTags(id) {}
  onTagFilterClick(tag) {}
  onDraftAttachmentDelete(id) {}
  onDraftAttachmentPlay(id) {}
  onDraftAttachmentRename(id, name) {}
  onDraftAttachmentExport(id) {}
  onDraftAttachmentTranscribe(id) {}
  onDraftAttachmentInsertTranscription(id) {}
  onDraftAttachmentGenerateSummary(id) {}
  onDraftAttachmentInsertSummary(id) {}
  onDraftAttachmentExpand(id) {}
  onDraftAttachmentSeek(progress) {}
  onArchiveFiltersClear() {}
}
