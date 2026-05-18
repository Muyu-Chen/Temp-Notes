/**
 * OpenAI-compatible LLM 配置与连通性测试
 */

import { normalizeTags } from "../lib/item-utils.js";
import { resolveItemTitle } from "../lib/text-utils.js";

export const normalizeBaseUrl = (baseUrl) => String(baseUrl || "").trim().replace(/\/+$/, "");

export const getModelsEndpoint = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized ? `${normalized}/models` : "";
};

export const getChatCompletionsEndpoint = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized ? `${normalized}/chat/completions` : "";
};

export const validateLLMSettings = (settings) => {
  if (!settings?.enabled) {
    return { ok: false, reason: "请先启用大模型功能" };
  }
  if (!normalizeBaseUrl(settings.baseUrl)) {
    return { ok: false, reason: "请填写 Base URL" };
  }
  if (!String(settings.apiKey || "").trim()) {
    return { ok: false, reason: "请填写 API Key" };
  }
  return { ok: true, reason: "" };
};

export const validateTagGenerationSettings = (settings) => {
  const baseValidation = validateLLMSettings(settings);
  if (!baseValidation.ok) return baseValidation;

  if (!String(settings.model || "").trim()) {
    return { ok: false, reason: "请填写 Model" };
  }

  return { ok: true, reason: "" };
};

export const getTagGenerationMessages = (item) => [
  {
    role: "system",
    content:
      "你是一个笔记标签助手。请只返回 JSON 数组，数组元素为简短中文或英文标签。不要返回解释。",
  },
  {
    role: "user",
    content: JSON.stringify({
      title: resolveItemTitle(item),
      content: String(item?.content || "").slice(0, 6000),
      existingTags: normalizeTags(item?.tags),
      rules: [
        "返回 1 到 5 个标签",
        "每个标签不超过 12 个中文字符或 24 个英文字符",
        "不要包含 # 前缀",
        "不要包含重复标签",
      ],
    }),
  },
];

export const parseGeneratedTags = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    const tags = Array.isArray(parsed) ? parsed : parsed?.tags;
    return normalizeTags(tags).slice(0, 5);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return normalizeTags(text).slice(0, 5);

    try {
      return normalizeTags(JSON.parse(match[0])).slice(0, 5);
    } catch {
      return [];
    }
  }
};

const clipDebugValue = (value, maxLength = 20000) => {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...[truncated]` : text;
};

export const buildTagGenerationDebugLog = ({
  settings,
  item,
  requestBody,
  responseStatus = null,
  responseText = "",
  assistantContent = "",
  errorMessage = "",
}) =>
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      feature: "ai-tag-generation",
      endpoint: getChatCompletionsEndpoint(settings?.baseUrl),
      settings: {
        enabled: settings?.enabled === true,
        baseUrl: normalizeBaseUrl(settings?.baseUrl),
        model: String(settings?.model || "").trim(),
      },
      item: {
        id: item?.id || "",
        title: resolveItemTitle(item),
        existingTags: normalizeTags(item?.tags),
      },
      request: {
        method: "POST",
        body: requestBody,
      },
      response: {
        status: responseStatus,
        body: clipDebugValue(responseText),
        assistantContent: clipDebugValue(assistantContent),
      },
      error: errorMessage,
    },
    null,
    2
  );

export class LLMService {
  constructor(fetchImpl = globalThis.fetch, requestTimeoutMs = 20000) {
    this.fetchImpl = fetchImpl;
    this.requestTimeoutMs = requestTimeoutMs;
  }

  createRequestOptions(options) {
    if (
      !this.requestTimeoutMs ||
      typeof AbortController !== "function" ||
      typeof setTimeout !== "function"
    ) {
      return { options, cleanup: () => {} };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    return {
      options: { ...options, signal: controller.signal },
      cleanup: () => clearTimeout(timeoutId),
    };
  }

  getErrorMessage(prefix, err) {
    if (err?.name === "AbortError") {
      return `${prefix}：请求超时`;
    }
    return `${prefix}：${err?.message || "请求异常"}`;
  }

  async readResponseText(response) {
    if (typeof response?.text === "function") {
      return response.text();
    }
    if (typeof response?.json === "function") {
      return JSON.stringify(await response.json());
    }
    return "";
  }

  async testConnection(settings) {
    const validation = validateLLMSettings(settings);
    if (!validation.ok) {
      return { ok: false, requested: false, message: validation.reason };
    }

    if (typeof this.fetchImpl !== "function") {
      return { ok: false, requested: false, message: "当前浏览器不支持 fetch" };
    }

    const request = this.createRequestOptions({
      method: "GET",
      headers: {
        Authorization: `Bearer ${String(settings.apiKey || "").trim()}`,
      },
    });

    try {
      const response = await this.fetchImpl(getModelsEndpoint(settings.baseUrl), request.options);
      request.cleanup();

      if (!response.ok) {
        return {
          ok: false,
          requested: true,
          message: `连接失败：HTTP ${response.status}`,
        };
      }

      return { ok: true, requested: true, message: "连接成功" };
    } catch (err) {
      return {
        ok: false,
        requested: true,
        message: this.getErrorMessage("连接失败", err),
      };
    } finally {
      request.cleanup();
    }
  }

  async generateTags(settings, item) {
    const validation = validateTagGenerationSettings(settings);
    if (!validation.ok) {
      return { ok: false, requested: false, message: validation.reason, tags: [] };
    }

    if (typeof this.fetchImpl !== "function") {
      return { ok: false, requested: false, message: "当前浏览器不支持 fetch", tags: [] };
    }

    const requestBody = {
      model: String(settings.model || "").trim(),
      messages: getTagGenerationMessages(item),
      temperature: 0.2,
    };
    const request = this.createRequestOptions({
      method: "POST",
      headers: {
        Authorization: `Bearer ${String(settings.apiKey || "").trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    let responseStatus = null;
    let responseText = "";
    let assistantContent = "";

    try {
      const response = await this.fetchImpl(
        getChatCompletionsEndpoint(settings.baseUrl),
        request.options
      );
      request.cleanup();
      responseStatus = response.status;
      responseText = await this.readResponseText(response);

      if (!response.ok) {
        const message = `生成失败：HTTP ${response.status}`;
        return {
          ok: false,
          requested: true,
          message,
          tags: [],
          debugLog: buildTagGenerationDebugLog({
            settings,
            item,
            requestBody,
            responseStatus,
            responseText,
            errorMessage: message,
          }),
        };
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        const message = "生成失败：响应 JSON 无法解析";
        return {
          ok: false,
          requested: true,
          message,
          tags: [],
          debugLog: buildTagGenerationDebugLog({
            settings,
            item,
            requestBody,
            responseStatus,
            responseText,
            errorMessage: message,
          }),
        };
      }

      assistantContent = data?.choices?.[0]?.message?.content || "";
      const tags = parseGeneratedTags(assistantContent);
      if (tags.length === 0) {
        const message = "生成失败：未返回有效标签";
        return {
          ok: false,
          requested: true,
          message,
          tags: [],
          debugLog: buildTagGenerationDebugLog({
            settings,
            item,
            requestBody,
            responseStatus,
            responseText,
            assistantContent,
            errorMessage: message,
          }),
        };
      }

      return { ok: true, requested: true, message: "标签已生成", tags };
    } catch (err) {
      const message = this.getErrorMessage("生成失败", err);
      return {
        ok: false,
        requested: true,
        message,
        tags: [],
        debugLog: buildTagGenerationDebugLog({
          settings,
          item,
          requestBody,
          responseStatus,
          responseText,
          assistantContent,
          errorMessage: message,
        }),
      };
    } finally {
      request.cleanup();
    }
  }
}
