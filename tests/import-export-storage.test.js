import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  now: vi.fn(() => 1234),
  uid: vi.fn(() => "generated-id"),
}));

vi.mock("../js/lib/time-utils.js", () => ({
  now: mocks.now,
}));

vi.mock("../js/lib/id-utils.js", () => ({
  uid: mocks.uid,
}));

const {
  collectAttachmentMetadata,
  exportData,
  itemSignature,
  mergeItems,
  mergeRecycleItems,
  normalizeImportedData,
  pruneMissingRecordingReferences,
} = await import("../js/storage/import-export-storage.js");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.now.mockReturnValue(1234);
  mocks.uid.mockReturnValue("generated-id");
});

describe("import/export storage helpers", () => {
  it("rejects invalid payloads without throwing", () => {
    expect(normalizeImportedData(null)).toEqual({
      draft: "",
      draftAttachments: [],
      items: [],
      recycle: [],
      valid: false,
    });

    expect(normalizeImportedData("not-json")).toEqual({
      draft: "",
      draftAttachments: [],
      items: [],
      recycle: [],
      valid: false,
    });
  });

  it("normalizes imported items and filters empty content", () => {
    const result = normalizeImportedData({
      draft: "draft text",
      draftAttachments: [
        {
          id: "draft-rec",
          type: "audio",
          name: "Draft",
          mimeType: "audio/webm",
          ext: "webm",
          size: 10,
          durationMs: 20,
          createdAt: 30,
        },
      ],
      items: [
        null,
        { content: "" },
        {
          content: 42,
          title: "Answer",
          encrypted: 1,
          encryptedTitle: 99,
          encryptionHint: "hint",
          defaultPassword: "yes",
        },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.draft).toBe("draft text");
    expect(result.draftAttachments).toEqual([
      {
        id: "draft-rec",
        type: "audio",
        name: "Draft",
        mimeType: "audio/webm",
        ext: "webm",
        size: 10,
        durationMs: 20,
        createdAt: 30,
      },
    ]);
    expect(result.items).toEqual([
      {
        id: "generated-id",
        content: "42",
        createdAt: 1234,
        updatedAt: 1234,
        title: "Answer",
        encrypted: true,
        encryptedTitle: "99",
        encryptionHint: "hint",
        defaultPassword: true,
        pinned: false,
        pinnedAt: undefined,
        favorite: false,
        tags: [],
        attachments: [],
      },
    ]);
  });

  it("preserves explicit timestamps and falls back from updatedAt to createdAt", () => {
    const result = normalizeImportedData({
      items: [
        {
          id: "kept-id",
          content: "content",
          createdAt: 10,
        },
      ],
    });

    expect(result.items[0]).toMatchObject({
      id: "kept-id",
      createdAt: 10,
      updatedAt: 10,
    });
    expect(mocks.uid).not.toHaveBeenCalled();
  });

  it("deduplicates imports by createdAt and content, then sorts by updatedAt", () => {
    const existing = [
      { id: "old", content: "same", createdAt: 1, updatedAt: 10 },
      { id: "existing-newer", content: "existing", createdAt: 2, updatedAt: 50 },
    ];
    const imported = [
      { id: "duplicate", content: "same", createdAt: 1, updatedAt: 100 },
      { id: "new", content: "new", createdAt: 3, updatedAt: 80 },
    ];

    expect(mergeItems(existing, imported)).toEqual([
      { id: "new", content: "new", createdAt: 3, updatedAt: 80 },
      { id: "existing-newer", content: "existing", createdAt: 2, updatedAt: 50 },
      { id: "old", content: "same", createdAt: 1, updatedAt: 10 },
    ]);
  });

  it("keeps pinned, favorite, and tag metadata from imports", () => {
    const result = normalizeImportedData({
      items: [
        {
          id: "meta",
          content: "content",
          createdAt: 10,
          updatedAt: 20,
          pinned: true,
          pinnedAt: 30,
          favorite: true,
          tags: [" Work ", "#work", "想法"],
        },
      ],
    });

    expect(result.items[0]).toMatchObject({
      pinned: true,
      pinnedAt: 30,
      favorite: true,
      tags: ["Work", "想法"],
    });
  });

  it("preserves audio attachment metadata and keeps attachment-only entries", () => {
    const result = normalizeImportedData({
      items: [
        {
          id: "audio-only",
          content: "",
          attachments: [
            {
              id: "recording-1",
              type: "audio",
              name: "Meeting",
              mimeType: "audio/webm",
              ext: "webm",
              size: 12,
              durationMs: 345,
              createdAt: 99,
            },
          ],
        },
      ],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].tags).toEqual(["录音"]);
    expect(result.items[0].attachments).toEqual([
      {
        id: "recording-1",
        type: "audio",
        name: "Meeting",
        mimeType: "audio/webm",
        ext: "webm",
        size: 12,
        durationMs: 345,
        createdAt: 99,
      },
    ]);
  });

  it("normalizes recording tags for imported recycle items with audio attachments", () => {
    const result = normalizeImportedData({
      recycle: [
        {
          id: "deleted-audio",
          content: "old audio",
          deletedAt: 30,
          attachments: [
            {
              id: "recording-1",
              type: "audio",
              mimeType: "audio/webm",
              createdAt: 99,
            },
          ],
        },
      ],
    });

    expect(result.recycle[0]).toMatchObject({
      id: "deleted-audio",
      tags: ["录音"],
      attachments: [expect.objectContaining({ id: "recording-1" })],
    });
  });

  it("builds stable item signatures and export envelopes", () => {
    const items = [{ id: "a", content: "hello", createdAt: 1, updatedAt: 2 }];
    const exported = exportData("draft", items, {
      draftAttachments: [{ id: "rec-1", type: "audio", mimeType: "audio/webm", createdAt: 3 }],
      recycle: [{ id: "deleted", content: "old", createdAt: 4, updatedAt: 5, deletedAt: 6 }],
    });

    expect(itemSignature(items[0])).toBe("1|hello|");
    expect(exported).toMatchObject({
      version: 3,
      draft: "draft",
      draftAttachments: [expect.objectContaining({ id: "rec-1" })],
      items: [expect.objectContaining({ id: "a", content: "hello" })],
      recycle: [expect.objectContaining({ id: "deleted", deletedAt: 6 })],
      recordings: [],
    });
    expect(Number.isNaN(Date.parse(exported.exportedAt))).toBe(false);
  });

  it("deduplicates recycle imports and sorts by deletedAt", () => {
    const existing = [{ id: "old", content: "old", deletedAt: 10 }];
    const imported = [
      { id: "new", content: "new", deletedAt: 30 },
      { id: "old", content: "duplicate", deletedAt: 10 },
    ];

    expect(mergeRecycleItems(existing, imported)).toEqual([
      { id: "new", content: "new", deletedAt: 30 },
      { id: "old", content: "old", deletedAt: 10 },
    ]);
  });

  it("collects attachment metadata across draft, items, and recycle entries", () => {
    const attachment = {
      id: "rec-1",
      type: "audio",
      mimeType: "audio/webm",
      ext: "webm",
      createdAt: 1,
    };

    expect(
      collectAttachmentMetadata({
        draftAttachments: [attachment],
        items: [{ attachments: [attachment] }],
        recycle: [{ recycleType: "recording", attachment }],
      })
    ).toEqual([expect.objectContaining({ id: "rec-1" })]);
  });

  it("prunes missing recording references from ZIP imports", () => {
    const data = normalizeImportedData({
      draftAttachments: [
        { id: "keep", type: "audio", mimeType: "audio/webm", createdAt: 1 },
        { id: "drop", type: "audio", mimeType: "audio/webm", createdAt: 2 },
      ],
      items: [
        {
          id: "item",
          content: "",
          attachments: [
            { id: "keep", type: "audio", mimeType: "audio/webm", createdAt: 1 },
            { id: "drop", type: "audio", mimeType: "audio/webm", createdAt: 2 },
          ],
        },
      ],
      recycle: [
        {
          recycleType: "recording",
          attachment: { id: "drop", type: "audio", mimeType: "audio/webm", createdAt: 2 },
          deletedAt: 3,
        },
      ],
    });

    const pruned = pruneMissingRecordingReferences(data, ["keep"]);

    expect(pruned.draftAttachments).toEqual([expect.objectContaining({ id: "keep" })]);
    expect(pruned.items[0].attachments).toEqual([expect.objectContaining({ id: "keep" })]);
    expect(pruned.recycle).toEqual([]);
  });
});
