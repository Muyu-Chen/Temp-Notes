/**
 * 首次打开与使用说明
 */

import { STORAGE_KEYS } from "../constants.js";
import {
  getLocalStorageItem,
  getLocalStorageLength,
  setLocalStorageItem,
} from "../lib/local-storage-utils.js";
import { loadDraft, saveDraft } from "../storage/draft-storage.js";

const USAGE_NOTICE = `GitHub链接：https://github.com/Muyu-Chen/Temp-Notes\n
使用说明：\n1. 在输入框中输入文本，自动保存草稿。\n
2. 草稿保存在浏览器的INDEXED_DB中，刷新页面后仍然存在。\n
3. 点击“清除草稿”按钮可以删除当前草稿。\n
4. 该应用仅在本地运行，不会将数据发送到服务器。
5. 右侧“更多”有回收站和导入/导出功能，回收站会保存被删除的草稿，导入/导出功能可以备份和恢复草稿数据。\n
6. 其中大模型api功能正在开发中，敬请期待！\n
该应用完全免费，开源在GitHub上，欢迎star、贡献和反馈！`;

const ensureFirstOpenFlag = () => {
  if (getLocalStorageLength() === 0) {
    setLocalStorageItem(STORAGE_KEYS.FIRST_OPEN, "false");
    return false;
  }

  return getLocalStorageItem(STORAGE_KEYS.FIRST_OPEN) === null;
};

const buildUsageNotice = (draft) => {
  if (draft.includes(USAGE_NOTICE)) {
    return draft;
  }

  return draft.trim() ? `${USAGE_NOTICE}\n\n${draft}` : USAGE_NOTICE;
};

const ensureUsageNoticeInserted = async () => {
  const draft = await loadDraft();
  const nextDraft = buildUsageNotice(draft);

  if (nextDraft !== draft) {
    await saveDraft(nextDraft);
  }

  return { noticeInserted: nextDraft !== draft, draft: nextDraft };
};

export const initializeFirstRun = async () => {
  try {
    const shouldInsertNotice = ensureFirstOpenFlag();
    if (!shouldInsertNotice) {
      return { noticeInserted: false };
    }

    const result = await ensureUsageNoticeInserted();
    setLocalStorageItem(STORAGE_KEYS.FIRST_OPEN, "false");
    return result;
  } catch (err) {
    console.error("Failed to initialize first run:", err);
    return { noticeInserted: false };
  }
};
