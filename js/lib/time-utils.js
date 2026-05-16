/**
 * 时间工具
 */

export const now = () => Date.now();

export const pad2 = (n) => String(n).padStart(2, "0");

export const formatTime = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const fmt = formatTime;
