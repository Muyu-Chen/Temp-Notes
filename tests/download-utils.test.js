import { describe, expect, it } from "vitest";

import {
  formatExportTimestamp,
  getTextExportPayload,
  sanitizeFilePart,
} from "../js/lib/download-utils.js";

describe("download utilities", () => {
  it("sanitizes unsafe filename characters", () => {
    expect(sanitizeFilePart('  ../bad:/name*?"  ')).toBe("bad name");
  });

  it("formats timestamps for exported filenames", () => {
    const timestamp = new Date(2026, 0, 2, 3, 4, 5).getTime();

    expect(formatExportTimestamp(timestamp)).toBe("20260102-030405");
  });

  it("builds TXT export payloads with title-based filenames", () => {
    const timestamp = new Date(2026, 4, 16, 9, 8, 7).getTime();
    const payload = getTextExportPayload(
      { id: "item-1", title: "Meeting / notes", content: "hello" },
      "txt",
      timestamp
    );

    expect(payload).toEqual({
      content: "hello",
      filename: "tempnotes-Meeting notes-20260516-090807.txt",
      mimeType: "text/plain;charset=utf-8",
    });
  });

  it("builds Markdown payloads and falls back to item id when title is empty", () => {
    const timestamp = new Date(2026, 4, 16, 9, 8, 7).getTime();
    const payload = getTextExportPayload(
      { id: "item-2", title: "", content: "# Heading" },
      "md",
      timestamp
    );

    expect(payload).toEqual({
      content: "# Heading",
      filename: "tempnotes-item-2-20260516-090807.md",
      mimeType: "text/markdown;charset=utf-8",
    });
  });

  it("returns null for unsupported formats", () => {
    expect(getTextExportPayload({ id: "item-1", content: "hello" }, "pdf")).toBeNull();
  });
});
