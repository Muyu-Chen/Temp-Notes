import { describe, expect, it, vi } from "vitest";

import {
  buildTagGenerationDebugLog,
  getChatCompletionsEndpoint,
  getModelsEndpoint,
  getTagGenerationMessages,
  LLMService,
  normalizeBaseUrl,
  parseGeneratedTags,
  validateLLMSettings,
  validateTagGenerationSettings,
} from "../js/services/llm-service.js";

describe("LLMService", () => {
  it("normalizes OpenAI-compatible model endpoints", () => {
    expect(normalizeBaseUrl(" https://api.example.com/v1/// ")).toBe(
      "https://api.example.com/v1"
    );
    expect(getModelsEndpoint("https://api.example.com/v1/")).toBe(
      "https://api.example.com/v1/models"
    );
    expect(getChatCompletionsEndpoint("https://api.example.com/v1/")).toBe(
      "https://api.example.com/v1/chat/completions"
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

  it("requires a model before generating tags", async () => {
    const fetchImpl = vi.fn();
    const service = new LLMService(fetchImpl);

    expect(
      validateTagGenerationSettings({
        enabled: true,
        baseUrl: "https://api.example.com/v1",
        apiKey: "x",
        model: "",
      })
    ).toEqual({ ok: false, reason: "请填写 Model" });

    await expect(
      service.generateTags(
        { enabled: true, baseUrl: "https://api.example.com/v1", apiKey: "x", model: "" },
        { title: "Note", content: "Body" }
      )
    ).resolves.toMatchObject({ ok: false, requested: false, message: "请填写 Model" });
    expect(fetchImpl).not.toHaveBeenCalled();
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

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/v1/models", expect.objectContaining({
      method: "GET",
      headers: {
        Authorization: "Bearer secret",
      },
    }));
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

  it("builds tag generation prompts without exposing unbounded content", () => {
    const messages = getTagGenerationMessages({
      title: "Custom title",
      content: "A".repeat(7000),
      tags: ["old"],
    });
    const payload = JSON.parse(messages[1].content);

    expect(messages[0].role).toBe("system");
    expect(payload.title).toBe("Custom title");
    expect(payload.content).toHaveLength(6000);
    expect(payload.existingTags).toEqual(["old"]);
  });

  it("parses generated tags from JSON array, object, or plain text", () => {
    expect(parseGeneratedTags('["工作", "#想法", "工作"]')).toEqual(["工作", "想法"]);
    expect(parseGeneratedTags('{"tags":["Alpha","beta"]}')).toEqual(["Alpha", "beta"]);
    expect(parseGeneratedTags("todo, later")).toEqual(["todo", "later"]);
  });

  it("requests chat completions and returns generated tags", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: '["工作","灵感"]' } }],
          }),
      })
    );
    const service = new LLMService(fetchImpl);

    await expect(
      service.generateTags(
        {
          enabled: true,
          baseUrl: "https://api.example.com/v1/",
          apiKey: " secret ",
          model: "tag-model",
        },
        { title: "Note", content: "Body", tags: ["old"] }
      )
    ).resolves.toEqual({
      ok: true,
      requested: true,
      message: "标签已生成",
      tags: ["工作", "灵感"],
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/v1/chat/completions", expect.objectContaining({
      method: "POST",
      headers: {
        Authorization: "Bearer secret",
        "Content-Type": "application/json",
      },
      body: expect.any(String),
    }));
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({
      model: "tag-model",
      temperature: 0.2,
    });
  });

  it("returns predictable tag generation failures", async () => {
    const httpService = new LLMService(vi.fn(() => Promise.resolve({ ok: false, status: 429 })));
    await expect(
      httpService.generateTags(
        {
          enabled: true,
          baseUrl: "https://api.example.com/v1",
          apiKey: "secret",
          model: "tag-model",
        },
        { content: "Body" }
      )
    ).resolves.toMatchObject({
      ok: false,
      requested: true,
      message: "生成失败：HTTP 429",
      tags: [],
      debugLog: expect.stringContaining('"feature": "ai-tag-generation"'),
    });

    const emptyService = new LLMService(
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ choices: [{ message: { content: "" } }] })),
        })
      )
    );
    await expect(
      emptyService.generateTags(
        {
          enabled: true,
          baseUrl: "https://api.example.com/v1",
          apiKey: "secret",
          model: "tag-model",
        },
        { content: "Body" }
      )
    ).resolves.toMatchObject({
      ok: false,
      requested: true,
      message: "生成失败：未返回有效标签",
      tags: [],
      debugLog: expect.stringContaining('"assistantContent": ""'),
    });
  });

  it("keeps request and raw response details in failed tag debug logs without API keys", async () => {
    const service = new LLMService(
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({ choices: [{ message: { content: '```json\n["todo",]\n```' } }] })
            ),
        })
      )
    );

    const result = await service.generateTags(
      {
        enabled: true,
        baseUrl: "https://api.example.com/v1",
        apiKey: "secret-key",
        model: "tag-model",
      },
      { id: "item-1", title: "Note", content: "Body", tags: ["old"] }
    );
    const debugLog = JSON.parse(result.debugLog);

    expect(result).toMatchObject({
      ok: false,
      requested: true,
      message: "生成失败：未返回有效标签",
    });
    expect(debugLog.request.body.messages).toHaveLength(2);
    expect(debugLog.response.assistantContent).toBe('```json\n["todo",]\n```');
    expect(result.debugLog).not.toContain("secret-key");
  });

  it("builds explicit tag debug logs for direct inspection", () => {
    const log = buildTagGenerationDebugLog({
      settings: { enabled: true, baseUrl: "https://api.example.com/v1", model: "m", apiKey: "x" },
      item: { id: "note", title: "Title", content: "Body", tags: ["old"] },
      requestBody: { model: "m", messages: [{ role: "user", content: "Body" }] },
      responseStatus: 200,
      responseText: '{"bad":true}',
      assistantContent: "not json",
      errorMessage: "parse failed",
    });

    expect(log).toContain('"endpoint": "https://api.example.com/v1/chat/completions"');
    expect(log).toContain('"assistantContent": "not json"');
    expect(log).not.toContain('"apiKey"');
  });
});
