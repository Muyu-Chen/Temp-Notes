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

const { exportData, itemSignature, mergeItems, normalizeImportedData } = await import(
  "../js/storage/import-export-storage.js"
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.now.mockReturnValue(1234);
  mocks.uid.mockReturnValue("generated-id");
});

describe("import/export storage helpers", () => {
  it("rejects invalid payloads without throwing", () => {
    expect(normalizeImportedData(null)).toEqual({
      draft: "",
      items: [],
      valid: false,
    });

    expect(normalizeImportedData("not-json")).toEqual({
      draft: "",
      items: [],
      valid: false,
    });
  });

  it("normalizes imported items and filters empty content", () => {
    const result = normalizeImportedData({
      draft: "draft text",
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

  it("builds stable item signatures and export envelopes", () => {
    const items = [{ id: "a", content: "hello", createdAt: 1, updatedAt: 2 }];
    const exported = exportData("draft", items);

    expect(itemSignature(items[0])).toBe("1|hello");
    expect(exported).toMatchObject({
      version: 1,
      draft: "draft",
      items,
    });
    expect(Number.isNaN(Date.parse(exported.exportedAt))).toBe(false);
  });
});
