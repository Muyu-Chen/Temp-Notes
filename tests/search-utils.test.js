import { describe, expect, it } from "vitest";

import {
  excerptAroundSearch,
  filterItemsBySearch,
  getHighlightRanges,
  getItemSearchFields,
  getSearchTokens,
  itemMatchesSearch,
} from "../js/lib/search-utils.js";

describe("search utils", () => {
  it("normalizes a query into non-empty search tokens", () => {
    expect(getSearchTokens("  Alpha   beta  ")).toEqual(["alpha", "beta"]);
  });

  it("matches unencrypted items by title, content, and updated time", () => {
    const item = {
      id: "note-1",
      title: "Project Notes",
      content: "Next action is export polish.",
      updatedAt: new Date("2026-05-16T13:45:00").getTime(),
    };

    expect(itemMatchesSearch(item, "project")).toBe(true);
    expect(itemMatchesSearch(item, "export")).toBe(true);
    expect(itemMatchesSearch(item, "2026-05-16")).toBe(true);
  });

  it("requires every token to appear somewhere in the searchable fields", () => {
    const item = {
      id: "note-1",
      title: "Project Notes",
      content: "Next action is export polish.",
    };

    expect(itemMatchesSearch(item, "project export")).toBe(true);
    expect(itemMatchesSearch(item, "project missing")).toBe(false);
  });

  it("does not search encrypted item content", () => {
    const item = {
      id: "secret",
      encrypted: true,
      encryptedTitle: "Private Plan",
      content: "visible only after decrypting",
    };

    expect(itemMatchesSearch(item, "private")).toBe(true);
    expect(itemMatchesSearch(item, "decrypting")).toBe(false);
  });

  it("searches tags even when item content is encrypted", () => {
    const item = {
      id: "secret",
      encrypted: true,
      encryptedTitle: "Private Plan",
      content: "visible only after decrypting",
      tags: ["Work"],
    };

    expect(itemMatchesSearch(item, "work")).toBe(true);
    expect(getItemSearchFields(item)).toContain("Work");
  });

  it("searches the automatic recording tag for audio entries", () => {
    const item = {
      id: "audio",
      content: "",
      attachments: [{ id: "rec", type: "audio", mimeType: "audio/webm", createdAt: 4 }],
    };

    expect(itemMatchesSearch(item, "录音")).toBe(true);
    expect(getItemSearchFields(item)).toContain("录音");
  });

  it("searches the recording tag even when the audio entry is encrypted", () => {
    const item = {
      id: "secret-audio",
      encrypted: true,
      encryptedTitle: "Private audio",
      content: "encrypted body",
      attachments: [{ id: "rec", type: "audio", mimeType: "audio/webm", createdAt: 4 }],
    };

    expect(itemMatchesSearch(item, "录音")).toBe(true);
    expect(itemMatchesSearch(item, "encrypted body")).toBe(false);
  });

  it("filters item lists without cloning the original entries", () => {
    const first = { id: "a", title: "Daily", content: "breakfast" };
    const second = { id: "b", title: "Work", content: "meeting" };

    expect(filterItemsBySearch([first, second], "meet")).toEqual([second]);
    expect(filterItemsBySearch([first, second], ["MEET"])).toEqual([second]);
    expect(filterItemsBySearch([first, second], "")).toEqual([first, second]);
  });

  it("builds fields that include deletion time when present", () => {
    const fields = getItemSearchFields({
      id: "deleted",
      title: "Old note",
      content: "body",
      deletedAt: new Date("2026-05-15T09:30:00").getTime(),
    });

    expect(fields).toContain("2026-05-15 09:30");
  });

  it("returns a focused excerpt around the first content hit", () => {
    const excerpt = excerptAroundSearch(
      "A".repeat(80) + " important keyword " + "B".repeat(80),
      "keyword",
      40
    );

    expect(excerpt).toContain("keyword");
    expect(excerpt.startsWith("…")).toBe(true);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("merges overlapping highlight ranges", () => {
    expect(getHighlightRanges("markdown preview", ["mark", "markdown"])).toEqual([
      { start: 0, end: 8 },
    ]);
  });
});
