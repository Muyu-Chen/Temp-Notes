/**
 * 设置读写与清空数据
 */

import { STORAGE_KEYS } from "../constants.js";
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "../lib/local-storage-utils.js";
import {
  clearObjectStores,
  STORE_ITEMS,
  STORE_RECORDINGS,
  STORE_RECYCLE,
  STORE_SETTINGS,
} from "../storage/idb.js";

const FONT_SIZE_KEY = "font_size";
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 20;
const DEFAULT_DRAFT_MODE = "edit";
const DEFAULT_RECORDING_FORMAT = "m4a";
const DEFAULT_LAYOUT_WIDTH = "standard";
const DEFAULT_COLUMN_LAYOUT = "default";
const DEFAULT_LLM_PROFILE_ID = "default";
const DEFAULT_TRANSCRIPTION_PROVIDER = "local-whisper";
const DEFAULT_OPENAI_STT_FILE_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_OPENAI_STT_REALTIME_MODEL = "gpt-realtime-whisper";
const DEFAULT_REALTIME_TRANSCRIPTION_DELAY = "medium";
const VALID_DRAFT_MODES = new Set(["edit", "preview"]);
const VALID_RECORDING_FORMATS = new Set(["m4a", "mp3", "webm"]);
const VALID_LAYOUT_WIDTHS = new Set(["auto", "standard", "wide", "ultrawide"]);
const VALID_COLUMN_LAYOUTS = new Set(["default", "editor", "archive"]);
const VALID_TRANSCRIPTION_PROVIDERS = new Set(["local-whisper", "openai"]);
const VALID_OPENAI_STT_FILE_MODELS = new Set([
  "gpt-4o-mini-transcribe",
  "gpt-4o-transcribe",
  "whisper-1",
]);
const VALID_OPENAI_STT_REALTIME_MODELS = new Set(["gpt-realtime-whisper"]);
const VALID_REALTIME_TRANSCRIPTION_DELAYS = new Set([
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
]);
export const RECYCLE_RETENTION_OPTIONS = [0, 7, 30, 90];
const EMPTY_LLM_SETTINGS = {
  id: DEFAULT_LLM_PROFILE_ID,
  name: "默认模型",
  enabled: false,
  baseUrl: "",
  apiKey: "",
  model: "",
};
const EMPTY_TRANSCRIPTION_SETTINGS = {
  provider: DEFAULT_TRANSCRIPTION_PROVIDER,
  openaiApiKey: "",
  openaiFileModel: DEFAULT_OPENAI_STT_FILE_MODEL,
  openaiRealtimeModel: DEFAULT_OPENAI_STT_REALTIME_MODEL,
  language: "",
  realtimeDelay: DEFAULT_REALTIME_TRANSCRIPTION_DELAY,
  realtimeCaptionsEnabled: false,
  realtimeDraftEnabled: false,
};

const normalizeFontSize = (size) => {
  const nextSize = parseInt(size, 10);
  return nextSize >= MIN_FONT_SIZE && nextSize <= MAX_FONT_SIZE ? nextSize : null;
};

const readEnumPreference = (key, validValues, fallback) => {
  const value = getLocalStorageItem(key);
  return validValues.has(value) ? value : fallback;
};

const readNumberPreference = (key, validValues, fallback) => {
  const value = Number(getLocalStorageItem(key));
  return validValues.includes(value) ? value : fallback;
};

const readStringPreference = (key) => getLocalStorageItem(key, "") || "";

const trimStoredText = (value) => String(value || "").trim();

const readBooleanPreference = (key, fallback = false) => {
  const value = getLocalStorageItem(key);
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

const readJsonPreference = (key) => {
  const value = getLocalStorageItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const makeProfileId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const createLLMProfile = (profile = {}) => ({
  ...EMPTY_LLM_SETTINGS,
  id: profile.id ? String(profile.id) : makeProfileId(),
  name: trimStoredText(profile.name) || "未命名模型",
  enabled: profile.enabled === true,
  baseUrl: trimStoredText(profile.baseUrl),
  apiKey: trimStoredText(profile.apiKey),
  model: trimStoredText(profile.model),
});

export const normalizeLLMProfilesSettings = (settings = {}) => {
  const profiles = (Array.isArray(settings.profiles) ? settings.profiles : [])
    .map(createLLMProfile)
    .filter((profile) => profile.id);
  const normalizedProfiles = profiles.length
    ? profiles
    : [{ ...EMPTY_LLM_SETTINGS, id: DEFAULT_LLM_PROFILE_ID }];
  const defaultProfileId = normalizedProfiles.some(
    (profile) => profile.id === settings.defaultProfileId
  )
    ? String(settings.defaultProfileId)
    : normalizedProfiles[0].id;

  return { profiles: normalizedProfiles, defaultProfileId };
};

export const getFontSize = () => {
  return normalizeFontSize(getLocalStorageItem(FONT_SIZE_KEY)) ?? DEFAULT_FONT_SIZE;
};

export const applyFontSize = (size) => {
  document.documentElement.style.setProperty("--font-size", `${size}px`);
};

export const setFontSize = (size) => {
  const nextSize = normalizeFontSize(size);
  if (nextSize === null) {
    return null;
  }

  setLocalStorageItem(FONT_SIZE_KEY, nextSize, "Failed to set font size:");
  applyFontSize(nextSize);
  return nextSize;
};

export const getDraftMode = () =>
  readEnumPreference(STORAGE_KEYS.DRAFT_MODE, VALID_DRAFT_MODES, DEFAULT_DRAFT_MODE);

export const setDraftMode = (mode) => {
  const nextMode = VALID_DRAFT_MODES.has(mode) ? mode : DEFAULT_DRAFT_MODE;
  setLocalStorageItem(STORAGE_KEYS.DRAFT_MODE, nextMode, "Failed to save draft mode:");
  return nextMode;
};

export const getRecycleRetentionDays = () =>
  readNumberPreference(STORAGE_KEYS.RECYCLE_RETENTION_DAYS, RECYCLE_RETENTION_OPTIONS, 0);

export const setRecycleRetentionDays = (days) => {
  const value = Number(days);
  if (!RECYCLE_RETENTION_OPTIONS.includes(value)) {
    return null;
  }

  setLocalStorageItem(
    STORAGE_KEYS.RECYCLE_RETENTION_DAYS,
    value,
    "Failed to save recycle retention:"
  );
  return value;
};

export const getRecycleRetentionText = (days) =>
  Number(days) > 0 ? `超过 ${days} 天自动清理` : "自动清理：永不";

export const getRecordingFormatPreference = () =>
  readEnumPreference(
    STORAGE_KEYS.RECORDING_FORMAT,
    VALID_RECORDING_FORMATS,
    DEFAULT_RECORDING_FORMAT
  );

export const setRecordingFormatPreference = (format) => {
  const nextFormat = VALID_RECORDING_FORMATS.has(format) ? format : DEFAULT_RECORDING_FORMAT;
  setLocalStorageItem(
    STORAGE_KEYS.RECORDING_FORMAT,
    nextFormat,
    "Failed to save recording format:"
  );
  return nextFormat;
};

const setRootDatasetValue = (name, value) => {
  if (typeof document === "undefined") return;

  document.documentElement.dataset[name] = value;
};

export const getLayoutWidthPreference = () =>
  readEnumPreference(STORAGE_KEYS.LAYOUT_WIDTH, VALID_LAYOUT_WIDTHS, DEFAULT_LAYOUT_WIDTH);

export const applyLayoutWidthPreference = (value) => {
  const nextValue = VALID_LAYOUT_WIDTHS.has(value) ? value : DEFAULT_LAYOUT_WIDTH;
  setRootDatasetValue("layoutWidth", nextValue);
  return nextValue;
};

export const setLayoutWidthPreference = (value) => {
  const nextValue = applyLayoutWidthPreference(value);
  setLocalStorageItem(
    STORAGE_KEYS.LAYOUT_WIDTH,
    nextValue,
    "Failed to save layout width:"
  );
  return nextValue;
};

export const getColumnLayoutPreference = () =>
  readEnumPreference(STORAGE_KEYS.COLUMN_LAYOUT, VALID_COLUMN_LAYOUTS, DEFAULT_COLUMN_LAYOUT);

export const applyColumnLayoutPreference = (value) => {
  const nextValue = VALID_COLUMN_LAYOUTS.has(value) ? value : DEFAULT_COLUMN_LAYOUT;
  setRootDatasetValue("columnLayout", nextValue);
  return nextValue;
};

export const setColumnLayoutPreference = (value) => {
  const nextValue = applyColumnLayoutPreference(value);
  setLocalStorageItem(
    STORAGE_KEYS.COLUMN_LAYOUT,
    nextValue,
    "Failed to save column layout:"
  );
  return nextValue;
};

export const getLLMProfilesSettings = () => {
  const stored = readJsonPreference(STORAGE_KEYS.LLM_PROFILES);
  if (stored) {
    return normalizeLLMProfilesSettings({
      profiles: stored.profiles,
      defaultProfileId:
        stored.defaultProfileId || getLocalStorageItem(STORAGE_KEYS.LLM_DEFAULT_PROFILE_ID),
    });
  }

  return normalizeLLMProfilesSettings({
    profiles: [{ ...EMPTY_LLM_SETTINGS }],
    defaultProfileId: DEFAULT_LLM_PROFILE_ID,
  });
};

export const saveLLMProfilesSettings = (settings) => {
  const normalized = normalizeLLMProfilesSettings(settings);
  setLocalStorageItem(
    STORAGE_KEYS.LLM_PROFILES,
    JSON.stringify(normalized),
    "Failed to save LLM profiles:"
  );
  setLocalStorageItem(
    STORAGE_KEYS.LLM_DEFAULT_PROFILE_ID,
    normalized.defaultProfileId,
    "Failed to save LLM profiles:"
  );
  return normalized;
};

export const getDefaultLLMProfile = () => {
  const settings = getLLMProfilesSettings();
  return (
    settings.profiles.find((profile) => profile.id === settings.defaultProfileId) ||
    settings.profiles[0] ||
    EMPTY_LLM_SETTINGS
  );
};

export const getLLMSettings = () => getDefaultLLMProfile();

export const saveLLMSettings = (settings) => {
  const current = getLLMProfilesSettings();
  const defaultId = current.defaultProfileId || DEFAULT_LLM_PROFILE_ID;
  const nextProfile = createLLMProfile({
    ...settings,
    id: defaultId,
    name: settings.name || getDefaultLLMProfile().name || "默认模型",
  });
  const profiles = current.profiles.some((profile) => profile.id === defaultId)
    ? current.profiles.map((profile) => (profile.id === defaultId ? nextProfile : profile))
    : [nextProfile, ...current.profiles];
  return saveLLMProfilesSettings({ profiles, defaultProfileId: defaultId });
};

export const getTranscriptionSettings = () => ({
  ...EMPTY_TRANSCRIPTION_SETTINGS,
  provider: readEnumPreference(
    STORAGE_KEYS.TRANSCRIPTION_PROVIDER,
    VALID_TRANSCRIPTION_PROVIDERS,
    DEFAULT_TRANSCRIPTION_PROVIDER
  ),
  openaiApiKey: readStringPreference(STORAGE_KEYS.OPENAI_STT_API_KEY),
  openaiFileModel: readEnumPreference(
    STORAGE_KEYS.OPENAI_STT_FILE_MODEL,
    VALID_OPENAI_STT_FILE_MODELS,
    DEFAULT_OPENAI_STT_FILE_MODEL
  ),
  openaiRealtimeModel: readEnumPreference(
    STORAGE_KEYS.OPENAI_STT_REALTIME_MODEL,
    VALID_OPENAI_STT_REALTIME_MODELS,
    DEFAULT_OPENAI_STT_REALTIME_MODEL
  ),
  language: readStringPreference(STORAGE_KEYS.TRANSCRIPTION_LANGUAGE),
  realtimeDelay: readEnumPreference(
    STORAGE_KEYS.REALTIME_TRANSCRIPTION_DELAY,
    VALID_REALTIME_TRANSCRIPTION_DELAYS,
    DEFAULT_REALTIME_TRANSCRIPTION_DELAY
  ),
  realtimeCaptionsEnabled: readBooleanPreference(
    STORAGE_KEYS.REALTIME_CAPTIONS_ENABLED,
    false
  ),
  realtimeDraftEnabled: readBooleanPreference(STORAGE_KEYS.REALTIME_DRAFT_ENABLED, false),
});

export const saveTranscriptionSettings = (settings = {}) => {
  const nextSettings = {
    ...EMPTY_TRANSCRIPTION_SETTINGS,
    provider: VALID_TRANSCRIPTION_PROVIDERS.has(settings.provider)
      ? settings.provider
      : DEFAULT_TRANSCRIPTION_PROVIDER,
    openaiApiKey: trimStoredText(settings.openaiApiKey),
    openaiFileModel: VALID_OPENAI_STT_FILE_MODELS.has(settings.openaiFileModel)
      ? settings.openaiFileModel
      : DEFAULT_OPENAI_STT_FILE_MODEL,
    openaiRealtimeModel: VALID_OPENAI_STT_REALTIME_MODELS.has(settings.openaiRealtimeModel)
      ? settings.openaiRealtimeModel
      : DEFAULT_OPENAI_STT_REALTIME_MODEL,
    language: trimStoredText(settings.language),
    realtimeDelay: VALID_REALTIME_TRANSCRIPTION_DELAYS.has(settings.realtimeDelay)
      ? settings.realtimeDelay
      : DEFAULT_REALTIME_TRANSCRIPTION_DELAY,
    realtimeCaptionsEnabled: settings.realtimeCaptionsEnabled === true,
    realtimeDraftEnabled: settings.realtimeDraftEnabled === true,
  };

  setLocalStorageItem(
    STORAGE_KEYS.TRANSCRIPTION_PROVIDER,
    nextSettings.provider,
    "Failed to save transcription settings:"
  );
  setLocalStorageItem(
    STORAGE_KEYS.OPENAI_STT_API_KEY,
    nextSettings.openaiApiKey,
    "Failed to save transcription settings:"
  );
  setLocalStorageItem(
    STORAGE_KEYS.OPENAI_STT_FILE_MODEL,
    nextSettings.openaiFileModel,
    "Failed to save transcription settings:"
  );
  setLocalStorageItem(
    STORAGE_KEYS.OPENAI_STT_REALTIME_MODEL,
    nextSettings.openaiRealtimeModel,
    "Failed to save transcription settings:"
  );
  setLocalStorageItem(
    STORAGE_KEYS.TRANSCRIPTION_LANGUAGE,
    nextSettings.language,
    "Failed to save transcription settings:"
  );
  setLocalStorageItem(
    STORAGE_KEYS.REALTIME_TRANSCRIPTION_DELAY,
    nextSettings.realtimeDelay,
    "Failed to save transcription settings:"
  );
  setLocalStorageItem(
    STORAGE_KEYS.REALTIME_CAPTIONS_ENABLED,
    String(nextSettings.realtimeCaptionsEnabled),
    "Failed to save transcription settings:"
  );
  setLocalStorageItem(
    STORAGE_KEYS.REALTIME_DRAFT_ENABLED,
    String(nextSettings.realtimeDraftEnabled),
    "Failed to save transcription settings:"
  );
  return nextSettings;
};

export const getLLMDebugLog = () => readStringPreference(STORAGE_KEYS.LLM_DEBUG_LOG);

export const saveLLMDebugLog = (logText) => {
  setLocalStorageItem(
    STORAGE_KEYS.LLM_DEBUG_LOG,
    String(logText || ""),
    "Failed to save LLM debug log:"
  );
};

export const clearLLMDebugLog = () => {
  removeLocalStorageItem(STORAGE_KEYS.LLM_DEBUG_LOG, "Failed to clear LLM debug log:");
};

export const clearPersistentData = async () => {
  await clearObjectStores([STORE_SETTINGS, STORE_ITEMS, STORE_RECYCLE, STORE_RECORDINGS]);

  [
    FONT_SIZE_KEY,
    STORAGE_KEYS.DRAFT_MODE,
    STORAGE_KEYS.RECYCLE_RETENTION_DAYS,
    STORAGE_KEYS.LLM_PROFILES,
    STORAGE_KEYS.LLM_DEFAULT_PROFILE_ID,
    STORAGE_KEYS.LLM_DEBUG_LOG,
    STORAGE_KEYS.RECORDING_FORMAT,
    STORAGE_KEYS.TRANSCRIPTION_PROVIDER,
    STORAGE_KEYS.OPENAI_STT_API_KEY,
    STORAGE_KEYS.OPENAI_STT_FILE_MODEL,
    STORAGE_KEYS.OPENAI_STT_REALTIME_MODEL,
    STORAGE_KEYS.TRANSCRIPTION_LANGUAGE,
    STORAGE_KEYS.REALTIME_TRANSCRIPTION_DELAY,
    STORAGE_KEYS.REALTIME_CAPTIONS_ENABLED,
    STORAGE_KEYS.REALTIME_DRAFT_ENABLED,
    STORAGE_KEYS.LAYOUT_WIDTH,
    STORAGE_KEYS.COLUMN_LAYOUT,
    "draft",
    STORAGE_KEYS.THEME,
    STORAGE_KEYS.FIRST_OPEN,
  ].forEach((key) => {
    removeLocalStorageItem(key);
  });
};
