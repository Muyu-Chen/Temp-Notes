import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "../js/constants.js";
import {
  clearLLMDebugLog,
  getDraftMode,
  getLLMDebugLog,
  getLLMSettings,
  getRecycleRetentionDays,
  getRecycleRetentionText,
  saveLLMSettings,
  saveLLMDebugLog,
  setDraftMode,
  setRecycleRetentionDays,
} from "../js/services/settings-service.js";

const createLocalStorage = () => {
  const store = new Map();
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key) => {
      store.delete(key);
    }),
  };
};

beforeEach(() => {
  vi.stubGlobal("localStorage", createLocalStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("settings service", () => {
  it("persists valid draft modes and falls back to edit for invalid values", () => {
    expect(getDraftMode()).toBe("edit");

    expect(setDraftMode("preview")).toBe("preview");
    expect(getDraftMode()).toBe("preview");

    localStorage.setItem(STORAGE_KEYS.DRAFT_MODE, "split");
    expect(getDraftMode()).toBe("edit");
    expect(setDraftMode("split")).toBe("edit");
    expect(getDraftMode()).toBe("edit");
  });

  it("persists recycle retention days with never as the default", () => {
    expect(getRecycleRetentionDays()).toBe(0);
    expect(getRecycleRetentionText(0)).toBe("自动清理：永不");

    expect(setRecycleRetentionDays("30")).toBe(30);
    expect(getRecycleRetentionDays()).toBe(30);
    expect(getRecycleRetentionText(30)).toBe("超过 30 天自动清理");

    expect(setRecycleRetentionDays("14")).toBeNull();
    expect(getRecycleRetentionDays()).toBe(30);
  });

  it("persists LLM settings with disabled as the default", () => {
    expect(getLLMSettings()).toEqual({
      enabled: false,
      baseUrl: "",
      apiKey: "",
      model: "",
    });

    saveLLMSettings({
      enabled: true,
      baseUrl: " https://api.example.com/v1 ",
      apiKey: " test-key ",
      model: " model-a ",
    });

    expect(getLLMSettings()).toEqual({
      enabled: true,
      baseUrl: "https://api.example.com/v1",
      apiKey: "test-key",
      model: "model-a",
    });
  });

  it("stores and clears the local LLM debug log", () => {
    expect(getLLMDebugLog()).toBe("");

    saveLLMDebugLog("debug details");
    expect(getLLMDebugLog()).toBe("debug details");

    clearLLMDebugLog();
    expect(getLLMDebugLog()).toBe("");
  });
});
