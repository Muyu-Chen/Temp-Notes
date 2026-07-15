import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveRecording: vi.fn(() => Promise.resolve()),
  now: vi.fn(() => 5000),
  uid: vi.fn(() => "rec-id"),
}));

vi.mock("../js/storage/recording-storage.js", () => ({
  saveRecording: mocks.saveRecording,
}));

vi.mock("../js/lib/time-utils.js", () => ({
  now: mocks.now,
}));

vi.mock("../js/lib/id-utils.js", () => ({
  uid: mocks.uid,
}));

const { RecordingService } = await import("../js/services/recording-service.js");

class MockMediaRecorder {
  static isTypeSupported = vi.fn((mimeType) => mimeType === "audio/webm;codecs=opus");

  constructor(stream, options) {
    this.stream = stream;
    this.options = options;
    this.mimeType = options?.mimeType || "";
    this.state = "inactive";
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;
  }

  start() {
    this.state = "recording";
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

class ChunkingMediaRecorder extends MockMediaRecorder {
  requestData = vi.fn(() => {
    this.ondataavailable?.({ data: new Blob(["chunk"], { type: this.mimeType }) });
  });
}

const createStream = () => ({
  tracks: [{ stop: vi.fn() }],
  getTracks() {
    return this.tracks;
  },
});

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  mocks.now.mockReturnValue(5000);
  mocks.uid.mockReturnValue("rec-id");
  MockMediaRecorder.isTypeSupported.mockImplementation(
    (mimeType) => mimeType === "audio/webm;codecs=opus"
  );
});

describe("RecordingService", () => {
  it("reports unsupported browsers without requesting the microphone", async () => {
    const getUserMedia = vi.fn();
    const service = new RecordingService({
      navigatorRef: { mediaDevices: { getUserMedia } },
      MediaRecorderCtor: undefined,
    });

    expect(service.isSupported()).toBe(false);
    await expect(service.start()).resolves.toEqual({
      ok: false,
      message: "当前浏览器不支持录音",
    });
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("records, pauses, resumes, stores the blob, and returns attachment metadata", async () => {
    const stream = createStream();
    const getUserMedia = vi.fn(() => Promise.resolve(stream));
    const dateNow = vi.spyOn(Date, "now");
    dateNow
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1500)
      .mockReturnValueOnce(2500)
      .mockReturnValueOnce(4000);

    const service = new RecordingService({
      navigatorRef: { mediaDevices: { getUserMedia } },
      MediaRecorderCtor: MockMediaRecorder,
    });

    await expect(service.start()).resolves.toEqual({ ok: true, message: "录音已开始" });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(service.recorder.mimeType).toBe("audio/webm;codecs=opus");

    expect(service.pause()).toBe(true);
    expect(service.resume()).toBe(true);

    const attachment = await service.stop();

    expect(attachment).toMatchObject({
      id: "rec-id",
      type: "audio",
      mimeType: "audio/webm;codecs=opus",
      ext: "webm",
      size: 5,
      durationMs: 2000,
      createdAt: 5000,
    });
    expect(mocks.saveRecording).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "rec-id",
        mimeType: "audio/webm;codecs=opus",
        size: 5,
        durationMs: 2000,
        createdAt: 5000,
      })
    );
    expect(stream.tracks[0].stop).toHaveBeenCalled();

    dateNow.mockRestore();
  });

  it("prefers m4a when the browser supports mp4 audio recording", async () => {
    MockMediaRecorder.isTypeSupported.mockImplementation(
      (mimeType) => mimeType === "audio/mp4;codecs=mp4a.40.2"
    );
    const stream = createStream();
    const service = new RecordingService({
      navigatorRef: { mediaDevices: { getUserMedia: vi.fn(() => Promise.resolve(stream)) } },
      MediaRecorderCtor: MockMediaRecorder,
    });

    await service.start({ preferredFormat: "m4a" });
    const attachment = await service.stop();

    expect(attachment).toMatchObject({
      mimeType: "audio/mp4;codecs=mp4a.40.2",
      ext: "m4a",
    });
  });

  it("can prefer webm for future recordings", async () => {
    const stream = createStream();
    const service = new RecordingService({
      navigatorRef: { mediaDevices: { getUserMedia: vi.fn(() => Promise.resolve(stream)) } },
      MediaRecorderCtor: MockMediaRecorder,
    });

    await service.start({ preferredFormat: "webm" });

    expect(service.recorder.mimeType).toBe("audio/webm;codecs=opus");
    await service.cancel();
  });

  it("can prefer mp3 when native MediaRecorder support exists", async () => {
    MockMediaRecorder.isTypeSupported.mockImplementation((mimeType) => mimeType === "audio/mpeg");
    const stream = createStream();
    const service = new RecordingService({
      navigatorRef: { mediaDevices: { getUserMedia: vi.fn(() => Promise.resolve(stream)) } },
      MediaRecorderCtor: MockMediaRecorder,
    });

    await service.start({ preferredFormat: "mp3" });
    const attachment = await service.stop();

    expect(attachment).toMatchObject({
      mimeType: "audio/mpeg",
      ext: "mp3",
    });
  });

  it("requests realtime chunks on the configured interval", async () => {
    vi.useFakeTimers();
    const stream = createStream();
    const onChunk = vi.fn();
    const service = new RecordingService({
      navigatorRef: { mediaDevices: { getUserMedia: vi.fn(() => Promise.resolve(stream)) } },
      MediaRecorderCtor: ChunkingMediaRecorder,
    });

    await service.start({ timesliceMs: 3000, onChunk });
    vi.advanceTimersByTime(3000);

    expect(service.recorder.requestData).toHaveBeenCalled();
    expect(onChunk).toHaveBeenCalledWith(expect.any(Blob));

    await service.cancel();
    vi.useRealTimers();
  });

  it("cancels an active recording without saving a blob", async () => {
    const stream = createStream();
    const service = new RecordingService({
      navigatorRef: { mediaDevices: { getUserMedia: vi.fn(() => Promise.resolve(stream)) } },
      MediaRecorderCtor: MockMediaRecorder,
    });

    await service.start();
    await expect(service.cancel()).resolves.toBe(true);

    expect(mocks.saveRecording).not.toHaveBeenCalled();
    expect(stream.tracks[0].stop).toHaveBeenCalled();
  });
});
