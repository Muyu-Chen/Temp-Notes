/**
 * 录音 Blob 持久化
 */

import { normalizeAttachments } from "../lib/attachment-utils.js";
import { deleteStoreRecords, getStoreRecord, putStoreRecord, STORE_RECORDINGS } from "./idb.js";

const collectReferencedIds = (references, ids = new Set()) => {
  if (!references) return ids;

  if (Array.isArray(references)) {
    references.forEach((reference) => collectReferencedIds(reference, ids));
    return ids;
  }

  if (references && typeof references === "object") {
    if (references.type === "audio" && references.id) {
      ids.add(String(references.id));
    }

    if (references.attachment?.type === "audio" && references.attachment.id) {
      ids.add(String(references.attachment.id));
    }

    normalizeAttachments(references.attachments).forEach((attachment) => {
      ids.add(attachment.id);
    });
  }

  return ids;
};

export const saveRecording = async (record) => {
  await putStoreRecord(STORE_RECORDINGS, {
    id: String(record.id),
    blob: record.blob,
    mimeType: String(record.mimeType || record.blob?.type || "audio/webm"),
    size: Number(record.size || record.blob?.size || 0),
    durationMs: Number(record.durationMs || 0),
    createdAt: Number(record.createdAt || Date.now()),
  });
};

export const loadRecording = async (id) =>
  (await getStoreRecord(STORE_RECORDINGS, String(id))) || null;

export const deleteRecordings = async (ids) => deleteStoreRecords(STORE_RECORDINGS, ids);

export const deleteUnreferencedRecordings = async (ids, references) => {
  const referencedIds = collectReferencedIds(references);
  const removableIds = (Array.isArray(ids) ? ids : [])
    .filter(Boolean)
    .map(String)
    .filter((id) => !referencedIds.has(id));
  return deleteRecordings(removableIds);
};
