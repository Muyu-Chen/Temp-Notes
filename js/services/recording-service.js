/**
 * 浏览器录音控制与 Blob 保存
 */

import { getAudioExtension } from "../lib/attachment-utils.js";
import { uid } from "../lib/id-utils.js";
import { now } from "../lib/time-utils.js";
import { saveRecording } from "../storage/recording-storage.js";

const MIME_CANDIDATES = {
  m4a: ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"],
  mp3: ["audio/mpeg", "audio/mp3", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"],
  webm: ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4"],
};

const stopStream = (stream) => {
  stream?.getTracks?.().forEach((track) => track.stop());
};

export class RecordingService {
  constructor({ navigatorRef = globalThis.navigator, MediaRecorderCtor = globalThis.MediaRecorder } = {}) {
    this.navigatorRef = navigatorRef;
    this.MediaRecorderCtor = MediaRecorderCtor;
    this.reset();
  }

  reset() {
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.startedAt = 0;
    this.pausedAt = 0;
    this.pausedMs = 0;
    this.cancelled = false;
    this.mimeType = "";
  }

  isSupported() {
    return Boolean(
      this.navigatorRef?.mediaDevices?.getUserMedia &&
        typeof this.MediaRecorderCtor === "function"
    );
  }

  getSupportedMimeType(preferredFormat = "m4a") {
    const candidates = MIME_CANDIDATES[preferredFormat] || MIME_CANDIDATES.m4a;
    const isTypeSupported = this.MediaRecorderCtor?.isTypeSupported;
    if (typeof isTypeSupported !== "function") {
      if (preferredFormat === "mp3") return "audio/mpeg";
      return preferredFormat === "webm" ? "audio/webm" : "audio/mp4";
    }
    return candidates.find((mimeType) => isTypeSupported(mimeType)) || "";
  }

  async start({ preferredFormat = "m4a", timesliceMs = 0, onChunk = null } = {}) {
    if (!this.isSupported()) {
      return { ok: false, message: "当前浏览器不支持录音" };
    }

    if (this.recorder && this.recorder.state !== "inactive") {
      return { ok: false, message: "录音已在进行中" };
    }

    this.stream = await this.navigatorRef.mediaDevices.getUserMedia({ audio: true });
    this.mimeType = this.getSupportedMimeType(preferredFormat);
    const options = this.mimeType ? { mimeType: this.mimeType } : undefined;
    this.recorder = new this.MediaRecorderCtor(this.stream, options);
    this.chunks = [];
    this.cancelled = false;
    this.pausedMs = 0;
    this.pausedAt = 0;
    this.startedAt = Date.now();

    this.recorder.ondataavailable = (event) => {
      if (event.data && Number(event.data.size || 0) > 0) {
        this.chunks.push(event.data);
        if (typeof onChunk === "function") {
          onChunk(event.data);
        }
      }
    };

    this.recorder.start(Number(timesliceMs || 0) > 0 ? Number(timesliceMs) : undefined);
    return { ok: true, message: "录音已开始" };
  }

  pause() {
    if (this.recorder?.state !== "recording") return false;
    this.pausedAt = Date.now();
    this.recorder.pause();
    return true;
  }

  resume() {
    if (this.recorder?.state !== "paused") return false;
    if (this.pausedAt) {
      this.pausedMs += Date.now() - this.pausedAt;
      this.pausedAt = 0;
    }
    this.recorder.resume();
    return true;
  }

  async stop() {
    if (!this.recorder || this.recorder.state === "inactive") {
      return null;
    }

    if (this.recorder.state === "paused" && this.pausedAt) {
      this.pausedMs += Date.now() - this.pausedAt;
      this.pausedAt = 0;
    }

    return new Promise((resolve, reject) => {
      const recorder = this.recorder;
      const stream = this.stream;
      const mimeType = this.mimeType || recorder.mimeType || "audio/webm";
      const durationMs = Math.max(0, Date.now() - this.startedAt - this.pausedMs);

      recorder.onerror = () => {
        stopStream(stream);
        this.reset();
        reject(recorder.error || new Error("录音失败"));
      };

      recorder.onstop = async () => {
        try {
          stopStream(stream);

          if (this.cancelled) {
            this.reset();
            resolve(null);
            return;
          }

          const blob = new Blob(this.chunks, { type: mimeType });
          const createdAt = now();
          const attachment = {
            id: uid(),
            type: "audio",
            name: `录音 ${new Date(createdAt).toLocaleString()}`,
            mimeType,
            ext: getAudioExtension(mimeType),
            size: blob.size,
            durationMs,
            createdAt,
          };

          await saveRecording({
            id: attachment.id,
            blob,
            mimeType,
            size: blob.size,
            durationMs,
            createdAt,
          });

          this.reset();
          resolve(attachment);
        } catch (error) {
          this.reset();
          reject(error);
        }
      };

      recorder.stop();
    });
  }

  async cancel() {
    if (!this.recorder || this.recorder.state === "inactive") {
      this.reset();
      return true;
    }

    this.cancelled = true;
    await this.stop();
    return true;
  }
}
