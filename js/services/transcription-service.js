/**
 * 录音转文字服务：默认浏览器本地 Whisper Base，OpenAI 作为备用 provider。
 */

import { normalizeTranscription, TRANSCRIPTION_STATUS } from "../lib/transcription-utils.js";

const TRANSFORMERS_CDN =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const LOCAL_WHISPER_MODEL = "Xenova/whisper-base";
const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const LOCAL_WHISPER_MODELS = new Set([
  "Xenova/whisper-tiny",
  "Xenova/whisper-base",
  "Xenova/whisper-small",
]);
const DEFAULT_LOCAL_TRANSCRIPTION_LANGUAGE = "zh";
const LOCAL_WHISPER_LANGUAGE_ALIASES = new Map([
  ["zh", "chinese"],
  ["zh-cn", "chinese"],
  ["zh-hans", "chinese"],
  ["zh-hant", "chinese"],
  ["cn", "chinese"],
  ["chinese", "chinese"],
  ["中文", "chinese"],
  ["en", "english"],
  ["en-us", "english"],
  ["en-gb", "english"],
  ["english", "english"],
  ["ja", "japanese"],
  ["jp", "japanese"],
  ["japanese", "japanese"],
  ["日本語", "japanese"],
  ["ko", "korean"],
  ["kr", "korean"],
  ["korean", "korean"],
  ["한국어", "korean"],
  ["fr", "french"],
  ["de", "german"],
  ["es", "spanish"],
  ["it", "italian"],
  ["pt", "portuguese"],
  ["ru", "russian"],
]);
const OPENAI_LANGUAGE_ALIASES = new Map([
  ["zh-hans", "zh"],
  ["zh-hant", "zh"],
  ["zh-cn", "zh"],
  ["zh-tw", "zh"],
  ["zh-hk", "zh"],
  ["chinese", "zh"],
]);

const getBlobUrl = (blob) => {
  if (typeof URL?.createObjectURL !== "function") return "";
  return URL.createObjectURL(blob);
};

const revokeBlobUrl = (url) => {
  if (url && typeof URL?.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
};

const getResultText = (result) => {
  if (typeof result === "string") return result.trim();
  return String(result?.text || "").trim();
};

const getResultSegments = (result) => {
  const chunks = Array.isArray(result?.chunks) ? result.chunks : [];
  return chunks
    .map((chunk) => {
      const timestamp = Array.isArray(chunk.timestamp) ? chunk.timestamp : [];
      return {
        text: String(chunk.text || "").trim(),
        startMs: Math.max(0, Number(timestamp[0] || 0) * 1000),
        endMs: Math.max(0, Number(timestamp[1] || 0) * 1000),
      };
    })
    .filter((segment) => segment.text);
};

const getLocalWhisperLanguage = (language) => {
  const value = String(language || DEFAULT_LOCAL_TRANSCRIPTION_LANGUAGE).trim().toLowerCase();
  return LOCAL_WHISPER_LANGUAGE_ALIASES.get(value) || value || "chinese";
};

const getOpenAITranscriptionLanguage = (language) => {
  const value = String(language || DEFAULT_LOCAL_TRANSCRIPTION_LANGUAGE).trim().toLowerCase();
  return OPENAI_LANGUAGE_ALIASES.get(value) || value || DEFAULT_LOCAL_TRANSCRIPTION_LANGUAGE;
};

export class TranscriptionService {
  constructor({
    fetchImpl = globalThis.fetch,
    importModule = (url) => import(url),
    localModel = LOCAL_WHISPER_MODEL,
  } = {}) {
    this.fetchImpl = fetchImpl;
    this.importModule = importModule;
    this.localModel = localModel;
    this.localPipelinePromises = new Map();
  }

  async transcribeRecording(record, settings = {}, options = {}) {
    if (!record?.blob) {
      return { ok: false, message: "录音文件不存在", transcription: normalizeTranscription() };
    }

    return this.transcribeBlob(record.blob, {
      ...settings,
      mimeType: record.mimeType || record.blob.type,
      filename: `${record.id || "recording"}.${this.getFileExtension(record)}`,
      ...options,
    });
  }

  async transcribeBlob(blob, settings = {}) {
    const provider = settings.provider === "openai" ? "openai" : "local-whisper";
    if (provider === "openai") {
      return this.transcribeWithOpenAI(blob, settings);
    }
    return this.transcribeWithLocalWhisper(blob, settings);
  }

  getFileExtension(record) {
    const mimeType = String(record?.mimeType || record?.blob?.type || "").toLowerCase();
    if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
    if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
    if (mimeType.includes("wav")) return "wav";
    return "webm";
  }

  getLocalModel(settings = {}) {
    return LOCAL_WHISPER_MODELS.has(settings.localWhisperModel)
      ? settings.localWhisperModel
      : this.localModel;
  }

  async getLocalPipeline(model = this.localModel) {
    if (!this.localPipelinePromises.has(model)) {
      this.localPipelinePromises.set(model, this.loadLocalPipeline(model));
    }
    return this.localPipelinePromises.get(model);
  }

  async loadLocalPipeline(model = this.localModel) {
    const module = await this.importModule(TRANSFORMERS_CDN);
    const { env, pipeline } = module;
    if (env) {
      env.allowLocalModels = false;
      env.allowRemoteModels = true;
    }

    try {
      return await pipeline("automatic-speech-recognition", model, {
        device: "webgpu",
      });
    } catch (error) {
      console.warn("WebGPU Whisper 加载失败，回退到 WASM", error);
      return pipeline("automatic-speech-recognition", model);
    }
  }

  async transcribeWithLocalWhisper(blob, settings = {}) {
    if (!blob?.size) {
      return { ok: false, message: "录音为空", transcription: normalizeTranscription() };
    }

    const url = getBlobUrl(blob);
    if (!url) {
      return { ok: false, message: "当前浏览器不支持本地转录", transcription: normalizeTranscription() };
    }

    try {
      const localModel = this.getLocalModel(settings);
      const transcriber = await this.getLocalPipeline(localModel);
      const result = await transcriber(url, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        task: "transcribe",
        language: getLocalWhisperLanguage(settings.language),
      });
      const text = getResultText(result);
      return {
        ok: Boolean(text),
        message: text ? "转录完成" : "未识别到文字",
        transcription: normalizeTranscription({
          text,
          segments: getResultSegments(result),
          provider: "local-whisper",
          model: localModel,
          status: text ? TRANSCRIPTION_STATUS.DONE : TRANSCRIPTION_STATUS.FAILED,
          error: text ? "" : "未识别到文字",
          updatedAt: Date.now(),
        }),
      };
    } catch (error) {
      return {
        ok: false,
        message: `本地转录失败：${error?.message || "模型加载或识别异常"}`,
        transcription: normalizeTranscription({
          provider: "local-whisper",
          model: this.getLocalModel(settings),
          status: TRANSCRIPTION_STATUS.FAILED,
          error: error?.message || "模型加载或识别异常",
          updatedAt: Date.now(),
        }),
      };
    } finally {
      revokeBlobUrl(url);
    }
  }

  async transcribeWithOpenAI(blob, settings = {}) {
    if (typeof this.fetchImpl !== "function") {
      return { ok: false, message: "当前浏览器不支持 fetch", transcription: normalizeTranscription() };
    }
    if (!String(settings.openaiApiKey || "").trim()) {
      return { ok: false, message: "请先填写 OpenAI Key", transcription: normalizeTranscription() };
    }

    const formData = new FormData();
    formData.append(
      "file",
      blob,
      settings.filename || `recording.${settings.mimeType?.includes("mp4") ? "m4a" : "webm"}`
    );
    formData.append("model", settings.openaiFileModel || "gpt-4o-mini-transcribe");
    if (settings.language) {
      formData.append("language", getOpenAITranscriptionLanguage(settings.language));
    }

    try {
      const response = await this.fetchImpl(OPENAI_TRANSCRIPTION_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${String(settings.openaiApiKey || "").trim()}`,
        },
        body: formData,
      });
      const responseText = await response.text();
      if (!response.ok) {
        return {
          ok: false,
          message: `OpenAI 转录失败：HTTP ${response.status}`,
          transcription: normalizeTranscription({
            provider: "openai",
            model: settings.openaiFileModel,
            status: TRANSCRIPTION_STATUS.FAILED,
            error: responseText,
            updatedAt: Date.now(),
          }),
        };
      }

      let text = responseText.trim();
      try {
        text = JSON.parse(responseText)?.text || text;
      } catch {}
      text = String(text || "").trim();
      return {
        ok: Boolean(text),
        message: text ? "转录完成" : "未识别到文字",
        transcription: normalizeTranscription({
          text,
          provider: "openai",
          model: settings.openaiFileModel,
          status: text ? TRANSCRIPTION_STATUS.DONE : TRANSCRIPTION_STATUS.FAILED,
          error: text ? "" : "未识别到文字",
          updatedAt: Date.now(),
        }),
      };
    } catch (error) {
      return {
        ok: false,
        message: `OpenAI 转录失败：${error?.message || "请求异常"}`,
        transcription: normalizeTranscription({
          provider: "openai",
          model: settings.openaiFileModel,
          status: TRANSCRIPTION_STATUS.FAILED,
          error: error?.message || "请求异常",
          updatedAt: Date.now(),
        }),
      };
    }
  }
}
