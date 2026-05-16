import { describe, expect, it, vi } from "vitest";

import {
  getModelsEndpoint,
  LLMService,
  normalizeBaseUrl,
  validateLLMSettings,
} from "../js/services/llm-service.js";

describe("LLMService", () => {
  it("normalizes OpenAI-compatible model endpoints", () => {
    expect(normalizeBaseUrl(" https://api.example.com/v1/// ")).toBe(
      "https://api.example.com/v1"
    );
    expect(getModelsEndpoint("https://api.example.com/v1/")).toBe(
      "https://api.example.com/v1/models"
    );
  });

  it("does not request when settings are disabled or incomplete", async () => {
    const fetchImpl = vi.fn();
    const service = new LLMService(fetchImpl);

    await expect(
      service.testConnection({ enabled: false, baseUrl: "https://api.example.com/v1", apiKey: "x" })
    ).resolves.toMatchObject({ ok: false, requested: false });
    await expect(service.testConnection({ enabled: true, baseUrl: "", apiKey: "x" })).resolves.toMatchObject({
      ok: false,
      requested: false,
      message: "请填写 Base URL",
    });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("validates enabled settings before testing", () => {
    expect(validateLLMSettings({ enabled: true, baseUrl: "https://api.example.com/v1", apiKey: "x" })).toEqual({
      ok: true,
      reason: "",
    });
  });

  it("requests the models endpoint with bearer auth", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    const service = new LLMService(fetchImpl);

    await expect(
      service.testConnection({
        enabled: true,
        baseUrl: "https://api.example.com/v1/",
        apiKey: " secret ",
      })
    ).resolves.toEqual({ ok: true, requested: true, message: "连接成功" });

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: "Bearer secret",
      },
    });
  });

  it("returns predictable failure states for HTTP and network errors", async () => {
    const httpService = new LLMService(vi.fn(() => Promise.resolve({ ok: false, status: 401 })));
    await expect(
      httpService.testConnection({
        enabled: true,
        baseUrl: "https://api.example.com/v1",
        apiKey: "secret",
      })
    ).resolves.toEqual({ ok: false, requested: true, message: "连接失败：HTTP 401" });

    const networkService = new LLMService(vi.fn(() => Promise.reject(new Error("offline"))));
    await expect(
      networkService.testConnection({
        enabled: true,
        baseUrl: "https://api.example.com/v1",
        apiKey: "secret",
      })
    ).resolves.toEqual({ ok: false, requested: true, message: "连接失败：offline" });
  });
});
