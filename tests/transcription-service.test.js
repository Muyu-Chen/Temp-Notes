import { afterEach, describe, expect, it, vi } from "vitest";

import { TranscriptionService } from "../js/services/transcription-service.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TranscriptionService", () => {
  it("transcribes blobs with local Whisper by default", async () => {
    const transcriber = vi.fn(() =>
      Promise.resolve({
        text: "你好，世界",
        chunks: [{ text: "你好", timestamp: [0, 1.2] }],
      })
    );
    const pipeline = vi.fn(() => Promise.resolve(transcriber));
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:rec"),
      revokeObjectURL: vi.fn(),
    });

    const service = new TranscriptionService({
      importModule: vi.fn(() => Promise.resolve({ env: {}, pipeline })),
    });
    const result = await service.transcribeBlob(new Blob(["audio"], { type: "audio/webm" }), {
      language: "zh",
    });

    expect(pipeline).toHaveBeenCalledWith(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny",
      { device: "webgpu" }
    );
    expect(transcriber).toHaveBeenCalledWith(
      "blob:rec",
      expect.objectContaining({ language: "zh", return_timestamps: true })
    );
    expect(result).toMatchObject({
      ok: true,
      transcription: {
        text: "你好，世界",
        provider: "local-whisper",
        model: "Xenova/whisper-tiny",
        status: "done",
      },
    });
  });

  it("falls back to OpenAI file transcription when requested", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ text: "meeting notes" })),
      })
    );
    const service = new TranscriptionService({ fetchImpl });

    const result = await service.transcribeBlob(new Blob(["audio"], { type: "audio/webm" }), {
      provider: "openai",
      openaiApiKey: "sk-test",
      openaiFileModel: "whisper-1",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer sk-test" },
        body: expect.any(FormData),
      })
    );
    expect(result).toMatchObject({
      ok: true,
      transcription: {
        text: "meeting notes",
        provider: "openai",
        model: "whisper-1",
        status: "done",
      },
    });
  });
});
