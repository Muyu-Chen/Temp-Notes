/**
 * 录音 Blob 持久化
 */

import { normalizeAttachments } from "../lib/attachment-utils.js";
import { getDB, STORE_RECORDINGS } from "./idb.js";

const finishTransaction = (transaction) =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

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
  const db = await getDB();
  const transaction = db.transaction(STORE_RECORDINGS, "readwrite");
  transaction.objectStore(STORE_RECORDINGS).put({
    id: String(record.id),
    blob: record.blob,
    mimeType: String(record.mimeType || record.blob?.type || "audio/webm"),
    size: Number(record.size || record.blob?.size || 0),
    durationMs: Number(record.durationMs || 0),
    createdAt: Number(record.createdAt || Date.now()),
  });
  await finishTransaction(transaction);
};

export const loadRecording = async (id) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_RECORDINGS, "readonly");
    const request = transaction.objectStore(STORE_RECORDINGS).get(String(id));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
};

export const deleteRecordings = async (ids) => {
  const normalizedIds = [...new Set((Array.isArray(ids) ? ids : []).filter(Boolean).map(String))];
  if (!normalizedIds.length) return 0;

  const db = await getDB();
  const transaction = db.transaction(STORE_RECORDINGS, "readwrite");
  const store = transaction.objectStore(STORE_RECORDINGS);
  normalizedIds.forEach((id) => store.delete(id));
  await finishTransaction(transaction);
  return normalizedIds.length;
};

export const deleteUnreferencedRecordings = async (ids, references) => {
  const referencedIds = collectReferencedIds(references);
  const removableIds = (Array.isArray(ids) ? ids : [])
    .filter(Boolean)
    .map(String)
    .filter((id) => !referencedIds.has(id));
  return deleteRecordings(removableIds);
};
