import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteStoreRecords: vi.fn(),
  getStoreRecord: vi.fn(),
  putStoreRecord: vi.fn(() => Promise.resolve()),
}));

vi.mock("../js/storage/idb.js", () => ({
  STORE_RECORDINGS: "recordings",
  deleteStoreRecords: mocks.deleteStoreRecords,
  getStoreRecord: mocks.getStoreRecord,
  putStoreRecord: mocks.putStoreRecord,
}));

const {
  deleteRecordings,
  deleteUnreferencedRecordings,
  loadRecording,
  saveRecording,
} = await import("../js/storage/recording-storage.js");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.putStoreRecord.mockResolvedValue();
  mocks.getStoreRecord.mockResolvedValue(null);
  mocks.deleteStoreRecords.mockImplementation((storeName, ids) => Promise.resolve(ids.length));
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

    expect(mocks.putStoreRecord).toHaveBeenCalledWith("recordings", {
      id: "rec-1",
      blob,
      mimeType: "audio/webm",
      size: 5,
      durationMs: 100,
      createdAt: 200,
      transcription: expect.objectContaining({
        text: "",
        summary: "",
        status: "idle",
      }),
    });
  });

  it("loads recording records", async () => {
    const record = { id: "rec-1" };
    mocks.getStoreRecord.mockResolvedValue(record);

    await expect(loadRecording("rec-1")).resolves.toMatchObject({
      id: "rec-1",
      transcription: expect.objectContaining({ status: "idle" }),
    });
  });

  it("deletes only unreferenced recordings", async () => {
    await deleteUnreferencedRecordings(["keep", "recycle-keep", "remove"], [
      { attachments: [{ id: "keep", type: "audio", mimeType: "audio/webm", createdAt: 1 }] },
      { attachment: { id: "recycle-keep", type: "audio", mimeType: "audio/webm", createdAt: 2 } },
    ]);

    expect(mocks.deleteStoreRecords).toHaveBeenCalledTimes(1);
    expect(mocks.deleteStoreRecords).toHaveBeenCalledWith("recordings", ["remove"]);
  });

  it("skips storage work when there are no ids to delete", async () => {
    await expect(deleteRecordings([])).resolves.toBe(0);
    expect(mocks.deleteStoreRecords).toHaveBeenCalledWith("recordings", []);
  });
});
