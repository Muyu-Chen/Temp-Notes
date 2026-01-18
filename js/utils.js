/**
 * 工具函数库
 */

/**
 * 获取当前时间戳
 */
export const now = () => Date.now();

/**
 * 数字补零
 */
export const pad2 = (n) => String(n).padStart(2, "0");

/**
 * 格式化时间戳为可读格式
 * @param {number} ts - 时间戳
 * @returns {string} 格式化的时间字符串
 */
export const fmt = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/**
 * 生成唯一ID
 */
export const uid = () =>
  Math.random().toString(16).slice(2) + "-" + Math.random().toString(16).slice(2);

/**
 * 安全的JSON解析
 */
export const safeJsonParse = (s, fallback) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};

/**
 * 截断字符串并添加省略号
 */
export const clamp = (s, n) => (s.length <= n ? s : s.slice(0, n) + "…");

/**
 * 获取文本的第一行
 */
export const firstLine = (s) => {
  const t = (s || "").trim();
  if (!t) return "（空条目）";
  return t.split(/\r?\n/)[0].trim() || "（空条目）";
};

/**
 * 计算字数（支持中英混合）
 */
export const wordCount = (s) => {
  const t = (s || "").trim();
  if (!t) return 0;
  const chinese = (t.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinWords = (t.replace(/[\u4e00-\u9fff]/g, " ").match(/[A-Za-z0-9_]+/g) || [])
    .length;
  const other = t.replace(/[\u4e00-\u9fffA-Za-z0-9_\s]/g, "").length;
  return chinese + latinWords + other;
};

/**
 * 估算localStorage使用的字节数
 */
export const storageBytes = () => {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const v = localStorage.getItem(k) || "";
    total += (k.length + v.length) * 2;
  }
  return total;
};

/**
 * 估算 IndexedDB 持久化数据的字节数（基于当前内存数据）
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
    return json.length * 2; // 按 UTF-16 估算
  } catch (err) {
    console.error("Failed to estimate storage size:", err);
    return 0;
  }
};

/**
 * 将字节数转换为可读格式
 */
export const humanBytes = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

/**
 * 检测是否为Mac平台
 */
export const isMac = () => navigator.platform.toLowerCase().includes("mac");
