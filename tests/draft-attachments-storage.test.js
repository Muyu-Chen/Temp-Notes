import { beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "../js/constants.js";

const mocks = vi.hoisted(() => ({
  readSetting: vi.fn(),
  writeSetting: vi.fn(() => Promise.resolve()),
}));

vi.mock("../js/storage/settings-storage.js", () => ({
  readSetting: mocks.readSetting,
  writeSetting: mocks.writeSetting,
}));

const {
  clearDraftAttachments,
  loadDraftAttachments,
  saveDraftAttachments,
} = await import("../js/storage/draft-attachments-storage.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("draft attachments storage", () => {
  it("loads normalized draft attachment metadata", async () => {
    mocks.readSetting.mockResolvedValue([
      null,
      { id: "rec-1", type: "audio", name: "Meeting", mimeType: "audio/webm", createdAt: 10 },
    ]);

    await expect(loadDraftAttachments()).resolves.toEqual([
      {
        id: "rec-1",
        type: "audio",
        name: "Meeting",
        mimeType: "audio/webm",
        ext: "webm",
        size: 0,
        durationMs: 0,
        createdAt: 10,
      },
    ]);
    expect(mocks.readSetting).toHaveBeenCalledWith(STORAGE_KEYS.DRAFT_ATTACHMENTS);
  });

  it("saves and clears normalized draft attachment metadata", async () => {
    await saveDraftAttachments([
      { id: "rec-1", type: "audio", mimeType: "audio/webm", createdAt: 10 },
    ]);
    await clearDraftAttachments();

    expect(mocks.writeSetting).toHaveBeenNthCalledWith(1, STORAGE_KEYS.DRAFT_ATTACHMENTS, [
      {
        id: "rec-1",
        type: "audio",
        name: "录音",
        mimeType: "audio/webm",
        ext: "webm",
        size: 0,
        durationMs: 0,
        createdAt: 10,
      },
    ]);
    expect(mocks.writeSetting).toHaveBeenNthCalledWith(2, STORAGE_KEYS.DRAFT_ATTACHMENTS, []);
  });
});
