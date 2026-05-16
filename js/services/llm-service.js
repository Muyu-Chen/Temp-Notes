/**
 * OpenAI-compatible LLM 配置与连通性测试
 */

export const normalizeBaseUrl = (baseUrl) => String(baseUrl || "").trim().replace(/\/+$/, "");

export const getModelsEndpoint = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized ? `${normalized}/models` : "";
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

export class LLMService {
  constructor(fetchImpl = globalThis.fetch) {
    this.fetchImpl = fetchImpl;
  }

  async testConnection(settings) {
    const validation = validateLLMSettings(settings);
    if (!validation.ok) {
      return { ok: false, requested: false, message: validation.reason };
    }

    if (typeof this.fetchImpl !== "function") {
      return { ok: false, requested: false, message: "当前浏览器不支持 fetch" };
    }

    try {
      const response = await this.fetchImpl(getModelsEndpoint(settings.baseUrl), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${String(settings.apiKey || "").trim()}`,
        },
      });

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
        message: `连接失败：${err?.message || "请求异常"}`,
      };
    }
  }
}
