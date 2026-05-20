import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  transaction: null,
  getDB: vi.fn(),
}));

vi.mock("../js/storage/idb.js", () => ({
  STORE_RECORDINGS: "recordings",
  getDB: mocks.getDB,
}));

const {
  deleteRecordings,
  deleteUnreferencedRecordings,
  loadRecording,
  saveRecording,
} = await import("../js/storage/recording-storage.js");

const createTransaction = () => {
  const transaction = {
    objectStore: vi.fn(() => ({
      delete: mocks.delete,
      put: mocks.put,
      get: mocks.get,
    })),
    oncomplete: null,
    onerror: null,
    onabort: null,
    error: null,
  };
  queueMicrotask(() => transaction.oncomplete?.());
  return transaction;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getDB.mockImplementation(() => ({
    transaction: vi.fn(() => {
      mocks.transaction = createTransaction();
      return mocks.transaction;
    }),
  }));
});

describe("recording storage", () => {
  it("saves recording blobs by attachment id", async () => {
    const blob = new Blob(["audio"], { type: "audio/webm" });

    await saveRecording({
      id: "rec-1",
      blob,
      mimeType: "audio/webm",
      size: blob.size,
      durationMs: 100,
      createdAt: 200,
    });

    expect(mocks.put).toHaveBeenCalledWith({
      id: "rec-1",
      blob,
      mimeType: "audio/webm",
      size: 5,
      durationMs: 100,
      createdAt: 200,
    });
  });

  it("loads recording records", async () => {
    const record = { id: "rec-1" };
    mocks.get.mockImplementation(() => {
      const request = {};
      queueMicrotask(() => {
        request.result = record;
        request.onsuccess?.();
      });
      return request;
    });

    await expect(loadRecording("rec-1")).resolves.toBe(record);
  });

  it("deletes only unreferenced recordings", async () => {
    await deleteUnreferencedRecordings(["keep", "recycle-keep", "remove"], [
      { attachments: [{ id: "keep", type: "audio", mimeType: "audio/webm", createdAt: 1 }] },
      { attachment: { id: "recycle-keep", type: "audio", mimeType: "audio/webm", createdAt: 2 } },
    ]);

    expect(mocks.delete).toHaveBeenCalledTimes(1);
    expect(mocks.delete).toHaveBeenCalledWith("remove");
  });

  it("skips storage work when there are no ids to delete", async () => {
    await expect(deleteRecordings([])).resolves.toBe(0);
    expect(mocks.getDB).not.toHaveBeenCalled();
  });
});
