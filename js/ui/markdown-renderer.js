/**
 * Markdown 渲染入口。marked 和 DOMPurify 由 index.html 作为本地脚本加载。
 */

const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderMarkdown = (source) => {
  const markedApi = globalThis.marked;
  const purifier = globalThis.DOMPurify;

  if (!markedApi?.parse || !purifier?.sanitize) {
    return escapeHtml(source).replace(/\n/g, "<br>");
  }

  const html = markedApi.parse(source || "", {
    gfm: true,
    breaks: false,
  });

  return purifier.sanitize(html, {
    USE_PROFILES: { html: true },
  });
};
