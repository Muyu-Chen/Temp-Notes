/**
 * 主题读写与应用
 */

import { STORAGE_KEYS } from "../constants.js";
import { getLocalStorageItem, setLocalStorageItem } from "../lib/local-storage-utils.js";

export const THEMES = {
  DARK: "dark",
  LIGHT: "light",
};

export const getDefaultTheme = () => {
  if (typeof document === "undefined") {
    return THEMES.LIGHT;
  }

  const theme = document.documentElement.getAttribute("data-default-theme");
  return theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
};

export const loadTheme = async () => {
  const theme = getLocalStorageItem(STORAGE_KEYS.THEME, null, "Failed to load theme:");
  return theme === THEMES.DARK || theme === THEMES.LIGHT ? theme : getDefaultTheme();
};

export const saveTheme = async (theme) => {
  setLocalStorageItem(STORAGE_KEYS.THEME, theme, "Failed to save theme:");
};

export const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
};

export const getAppliedTheme = () =>
  document.documentElement.getAttribute("data-theme") || getDefaultTheme();

export const toggleTheme = async () => {
  const nextTheme = getAppliedTheme() === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
  applyTheme(nextTheme);
  await saveTheme(nextTheme);
  return nextTheme;
};
