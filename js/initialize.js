/**
 * 应用初始化辅助逻辑
 */

import { STORAGE_KEYS } from "./constants.js";
import { loadDraft, saveDraft } from "./storage.js";

const USAGE_NOTICE = `GitHub链接：https://github.com/Muyu-Chen/Temp-Notes\N
使用说明：\n1. 在输入框中输入文本，自动保存草稿。\n
2. 草稿保存在浏览器的INDEXED_DB中，刷新页面后仍然存在。\n
3. 点击“清除草稿”按钮可以删除当前草稿。\n
4. 该应用仅在本地运行，不会将数据发送到服务器。
5. 右侧“更多”有回收站和导入/导出功能，回收站会保存被删除的草稿，导入/导出功能可以备份和恢复草稿数据。\n
6. 其中大模型api功能正在开发中，敬请期待！\n
该应用完全免费，开源在GitHub上，欢迎star、贡献和反馈！`;

export const initializeAppState = async () => {
  try {
    if (localStorage.length === 0) {
      localStorage.setItem(STORAGE_KEYS.FIRST_OPEN, "false");
      return { noticeInserted: false };
    }

    const firstOpen = localStorage.getItem(STORAGE_KEYS.FIRST_OPEN);
    if (firstOpen !== null) {
      return { noticeInserted: false };
    }

    const draft = await loadDraft();
    const nextDraft = draft.includes(USAGE_NOTICE)
      ? draft
      : draft.trim()
        ? `${USAGE_NOTICE}\n\n${draft}`
        : USAGE_NOTICE;

    if (nextDraft !== draft) {
      await saveDraft(nextDraft);
    }

    localStorage.setItem(STORAGE_KEYS.FIRST_OPEN, "false");
    return { noticeInserted: nextDraft !== draft, draft: nextDraft };
  } catch (err) {
    console.error("Failed to initialize app state:", err);
    return { noticeInserted: false };
  }
};
