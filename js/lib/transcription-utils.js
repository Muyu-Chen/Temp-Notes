/**
 * 录音转录 metadata 规范化
 */

export const TRANSCRIPTION_STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
};

const VALID_TRANSCRIPTION_STATUS = new Set(Object.values(TRANSCRIPTION_STATUS));

export const normalizeTranscriptionSegment = (segment = {}) => ({
  text: String(segment.text || "").trim(),
  startMs: Math.max(0, Number(segment.startMs || 0)),
  endMs: Math.max(0, Number(segment.endMs || 0)),
});

export const normalizeTranscription = (value = {}) => {
  const status = VALID_TRANSCRIPTION_STATUS.has(value.status)
    ? value.status
    : TRANSCRIPTION_STATUS.IDLE;
  const segments = Array.isArray(value.segments)
    ? value.segments.map(normalizeTranscriptionSegment).filter((segment) => segment.text)
    : [];

  return {
    text: String(value.text || "").trim(),
    summary: String(value.summary || "").trim(),
    segments,
    provider: value.provider ? String(value.provider) : "",
    model: value.model ? String(value.model) : "",
    status,
    error: value.error ? String(value.error) : "",
    updatedAt: Number(value.updatedAt || 0),
  };
};

export const hasTranscriptionText = (transcription) =>
  Boolean(normalizeTranscription(transcription).text);

export const hasTranscriptionSummary = (transcription) =>
  Boolean(normalizeTranscription(transcription).summary);
