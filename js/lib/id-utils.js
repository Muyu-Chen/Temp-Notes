/**
 * ID 工具
 */

export const uid = () =>
  Math.random().toString(16).slice(2) + "-" + Math.random().toString(16).slice(2);
