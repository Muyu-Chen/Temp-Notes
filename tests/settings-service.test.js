import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "../js/constants.js";
import {
  clearLLMDebugLog,
  getColumnLayoutPreference,
  getDraftMode,
  getLayoutWidthPreference,
  getLLMDebugLog,
  getLLMProfilesSettings,
  getLLMSettings,
  getRecordingFormatPreference,
  getRecycleRetentionDays,
  getRecycleRetentionText,
  getTranscriptionSettings,
  saveLLMProfilesSettings,
  saveLLMSettings,
  saveLLMDebugLog,
  saveTranscriptionSettings,
  setColumnLayoutPreference,
  setDraftMode,
  setLayoutWidthPreference,
  setRecordingFormatPreference,
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

  it("persists recording format preference with m4a as the default", () => {
    expect(getRecordingFormatPreference()).toBe("m4a");

    expect(setRecordingFormatPreference("webm")).toBe("webm");
    expect(getRecordingFormatPreference()).toBe("webm");

    expect(setRecordingFormatPreference("mp3")).toBe("mp3");
    expect(getRecordingFormatPreference()).toBe("mp3");

    expect(setRecordingFormatPreference("wav")).toBe("m4a");
    expect(getRecordingFormatPreference()).toBe("m4a");
  });

  it("persists layout width and column layout preferences", () => {
    expect(getLayoutWidthPreference()).toBe("standard");
    expect(getColumnLayoutPreference()).toBe("default");

    expect(setLayoutWidthPreference("wide")).toBe("wide");
    expect(setColumnLayoutPreference("archive")).toBe("archive");
    expect(getLayoutWidthPreference()).toBe("wide");
    expect(getColumnLayoutPreference()).toBe("archive");

    expect(setLayoutWidthPreference("tiny")).toBe("standard");
    expect(setColumnLayoutPreference("sideways")).toBe("default");
    expect(getLayoutWidthPreference()).toBe("standard");
    expect(getColumnLayoutPreference()).toBe("default");
  });

  it("persists LLM settings with disabled as the default", () => {
    expect(getLLMSettings()).toEqual({
      id: "default",
      name: "默认模型",
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
      id: "default",
      name: "默认模型",
      enabled: true,
      baseUrl: "https://api.example.com/v1",
      apiKey: "test-key",
      model: "model-a",
    });
  });

  it("persists multiple LLM profiles and the selected default", () => {
    saveLLMProfilesSettings({
      profiles: [
        { id: "a", name: "Model A", enabled: true, baseUrl: " https://a.test/v1 ", apiKey: " a ", model: " ma " },
        { id: "b", name: "Model B", enabled: true, baseUrl: "https://b.test/v1", apiKey: "b", model: "mb" },
      ],
      defaultProfileId: "b",
    });

    expect(getLLMProfilesSettings()).toEqual({
      defaultProfileId: "b",
      profiles: [
        { id: "a", name: "Model A", enabled: true, baseUrl: "https://a.test/v1", apiKey: "a", model: "ma" },
        { id: "b", name: "Model B", enabled: true, baseUrl: "https://b.test/v1", apiKey: "b", model: "mb" },
      ],
    });
    expect(getLLMSettings()).toMatchObject({ id: "b", model: "mb" });
  });

  it("persists transcription settings with local whisper as the default", () => {
    expect(getTranscriptionSettings()).toMatchObject({
      provider: "local-whisper",
      localWhisperModel: "Xenova/whisper-base",
      openaiFileModel: "gpt-4o-mini-transcribe",
      language: "zh",
      realtimeCaptionsEnabled: false,
      realtimeDraftEnabled: false,
    });

    saveTranscriptionSettings({
      provider: "openai",
      localWhisperModel: "Xenova/whisper-small",
      openaiApiKey: " sk-test ",
      openaiFileModel: "whisper-1",
      language: " zh ",
      realtimeCaptionsEnabled: true,
      realtimeDraftEnabled: true,
    });

    expect(getTranscriptionSettings()).toMatchObject({
      provider: "openai",
      localWhisperModel: "Xenova/whisper-small",
      openaiApiKey: "sk-test",
      openaiFileModel: "whisper-1",
      language: "zh",
      realtimeCaptionsEnabled: true,
      realtimeDraftEnabled: true,
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
