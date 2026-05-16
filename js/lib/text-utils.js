/**
 * 文本工具
 */

export const clamp = (s, n) => (s.length <= n ? s : s.slice(0, n) + "…");

export const firstLine = (s) => {
  const t = (s || "").trim();
  if (!t) return "（空条目）";
  return t.split(/\r?\n/)[0].trim() || "（空条目）";
};

export const cleanTitle = (title) => {
  const value = typeof title === "string" ? title.trim() : "";
  return value || undefined;
};

export const resolveItemTitle = (item) => {
  const customTitle = cleanTitle(item?.title);
  if (customTitle) return customTitle;

  if (item?.encrypted) {
    return cleanTitle(item?.encryptedTitle) || "已加密的内容";
  }

  return firstLine(item?.content || "");
};

export const wordCount = (s) => {
  const t = (s || "").trim();
  if (!t) return 0;
  const chinese = (t.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinWords = (t.replace(/[\u4e00-\u9fff]/g, " ").match(/[A-Za-z0-9_]+/g) || [])
    .length;
  const other = t.replace(/[\u4e00-\u9fffA-Za-z0-9_\s]/g, "").length;
  return chinese + latinWords + other;
};
