import { describe, expect, it } from "vitest";

import {
  itemHasTag,
  normalizeItem,
  normalizeTags,
  sortItemsForDisplay,
  toStoredItem,
} from "../js/lib/item-utils.js";

describe("item metadata utilities", () => {
  it("normalizes tags from strings and arrays with case-insensitive dedupe", () => {
    expect(normalizeTags(" #Work, work，想法\nLater ")).toEqual(["Work", "想法", "Later"]);
    expect(normalizeTags(["alpha", "#Alpha", "beta tag"])).toEqual(["alpha", "beta tag"]);
  });

  it("normalizes new metadata fields with backward-compatible defaults", () => {
    expect(normalizeItem({ id: "a", content: "body", createdAt: 1, updatedAt: 2 })).toMatchObject({
      id: "a",
      pinned: false,
      pinnedAt: undefined,
      favorite: false,
      tags: [],
    });

    expect(
      normalizeItem({
        id: "b",
        content: "body",
        pinned: true,
        pinnedAt: 9,
        favorite: true,
        tags: "A, b",
      })
    ).toMatchObject({
      pinned: true,
      pinnedAt: 9,
      favorite: true,
      tags: ["A", "b"],
    });
  });

  it("sorts pinned entries first without letting favorites affect order", () => {
    const sorted = sortItemsForDisplay([
      { id: "old-fav", updatedAt: 10, favorite: true },
      { id: "new", updatedAt: 30 },
      { id: "pin-old", updatedAt: 1, pinned: true, pinnedAt: 20 },
      { id: "pin-new", updatedAt: 2, pinned: true, pinnedAt: 40 },
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["pin-new", "pin-old", "new", "old-fav"]);
  });

  it("checks tags and stores normalized metadata", () => {
    const item = { id: "a", content: "body", pinned: true, favorite: true, tags: ["Work"] };

    expect(itemHasTag(item, "work")).toBe(true);
    expect(itemHasTag(item, "missing")).toBe(false);
    expect(toStoredItem(item)).toMatchObject({
      pinned: true,
      favorite: true,
      tags: ["Work"],
    });
  });
});
