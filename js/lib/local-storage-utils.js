/**
 * localStorage 安全访问
 */

const logStorageError = (message, error) => {
  if (message) {
    console.error(message, error);
  }
};

export const getLocalStorageItem = (key, fallback = null, errorMessage = "") => {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch (error) {
    logStorageError(errorMessage, error);
    return fallback;
  }
};

export const setLocalStorageItem = (key, value, errorMessage = "") => {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    logStorageError(errorMessage, error);
    return false;
  }
};

export const removeLocalStorageItem = (key, errorMessage = "") => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    logStorageError(errorMessage, error);
    return false;
  }
};

export const getLocalStorageLength = () => {
  try {
    return localStorage.length;
  } catch {
    return 0;
  }
};
