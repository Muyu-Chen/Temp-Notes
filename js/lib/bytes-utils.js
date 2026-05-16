/**
 * 字节与存储占用工具
 */

export const estimateStorageBytes = (draft, items, recycleItems, settings = {}) => {
  try {
    const payload = {
      draft: draft || "",
      items: Array.isArray(items) ? items : [],
      recycle: Array.isArray(recycleItems) ? recycleItems : [],
      settings: settings || {},
    };
    const json = JSON.stringify(payload) || "";
    return json.length * 2;
  } catch (err) {
    console.error("Failed to estimate storage size:", err);
    return 0;
  }
};

export const humanBytes = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};
