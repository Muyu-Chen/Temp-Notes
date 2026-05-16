/**
 * 主题读写与应用
 */

import { STORAGE_KEYS } from "../constants.js";

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
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    return theme === THEMES.DARK || theme === THEMES.LIGHT ? theme : getDefaultTheme();
  } catch (err) {
    console.error("Failed to load theme:", err);
    return getDefaultTheme();
  }
};

export const saveTheme = async (theme) => {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (err) {
    console.error("Failed to save theme:", err);
  }
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
