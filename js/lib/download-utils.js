/**
 * 文本文件下载工具
 */

import { pad2 } from "./time-utils.js";

export const TEXT_EXPORT_FORMATS = {
  txt: {
    extension: "txt",
    mimeType: "text/plain;charset=utf-8",
  },
  md: {
    extension: "md",
    mimeType: "text/markdown;charset=utf-8",
  },
};

export const sanitizeFilePart = (value) => {
  const cleaned = String(value ?? "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .trim();

  return cleaned.slice(0, 80);
};

export const formatExportTimestamp = (timestamp = Date.now()) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(
    d.getHours()
  )}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
};

export const getTextExportPayload = (item, format, timestamp = Date.now()) => {
  const config = TEXT_EXPORT_FORMATS[format];
  if (!config) {
    return null;
  }

  const titlePart = sanitizeFilePart(item?.title) || sanitizeFilePart(item?.id) || "entry";

  return {
    content: String(item?.content ?? ""),
    filename: `tempnotes-${titlePart}-${formatExportTimestamp(timestamp)}.${config.extension}`,
    mimeType: config.mimeType,
  };
};

export const downloadTextFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
