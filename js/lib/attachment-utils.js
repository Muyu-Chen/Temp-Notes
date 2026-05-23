/**
 * 附件 metadata 规范化
 */

const VALID_AUDIO_EXTENSIONS = new Set(["webm", "m4a", "mp3", "mp4"]);

export const getAudioExtension = (mimeType) => {
  const value = String(mimeType || "").toLowerCase();
  if (value.includes("mpeg") || value.includes("mp3")) return "mp3";
  if (value.includes("mp4") || value.includes("mpeg-4") || value.includes("m4a")) return "m4a";
  return "webm";
};

export const normalizeAttachment = (attachment) => {
  if (!attachment || typeof attachment !== "object") return null;
  if (!attachment.id) return null;

  const mimeType = String(attachment.mimeType || "audio/webm");
  const ext = VALID_AUDIO_EXTENSIONS.has(String(attachment.ext || ""))
    ? String(attachment.ext)
    : getAudioExtension(mimeType);

  return {
    id: String(attachment.id),
    type: "audio",
    name: String(attachment.name || "录音"),
    mimeType,
    ext,
    size: Math.max(0, Number(attachment.size || 0)),
    durationMs: Math.max(0, Number(attachment.durationMs || 0)),
    createdAt: Number(attachment.createdAt || Date.now()),
  };
};

export const normalizeAttachments = (attachments) =>
  (Array.isArray(attachments) ? attachments : [])
    .map(normalizeAttachment)
    .filter(Boolean);

export const attachmentSignature = (attachment) => {
  const normalized = normalizeAttachment(attachment);
  if (!normalized) return "";
  return [
    normalized.id,
    normalized.type,
    normalized.name,
    normalized.mimeType,
    normalized.ext,
    normalized.size,
    normalized.durationMs,
    normalized.createdAt,
  ].join("|");
};

export const areAttachmentsEqual = (a, b) => {
  const left = normalizeAttachments(a).map(attachmentSignature);
  const right = normalizeAttachments(b).map(attachmentSignature);
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

export const getAttachmentIds = (attachments) =>
  normalizeAttachments(attachments).map((attachment) => attachment.id);
