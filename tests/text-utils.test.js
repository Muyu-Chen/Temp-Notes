import { describe, expect, it } from "vitest";

import {
  cleanTitle,
  clamp,
  firstLine,
  resolveItemTitle,
  wordCount,
} from "../js/lib/text-utils.js";

describe("text utilities", () => {
  it("clamps long text and leaves short text unchanged", () => {
    expect(clamp("hello", 10)).toBe("hello");
    expect(clamp("hello world", 5)).toBe("hello…");
  });

  it("extracts a fallback title from the first non-empty line", () => {
    expect(firstLine("  Title  \nBody")).toBe("Title");
    expect(firstLine("   ")).toBe("（空条目）");
  });

  it("cleans blank titles to undefined", () => {
    expect(cleanTitle("  Custom title  ")).toBe("Custom title");
    expect(cleanTitle("   ")).toBeUndefined();
    expect(cleanTitle(null)).toBeUndefined();
  });

  it("resolves custom, encrypted, and content-derived item titles", () => {
    expect(resolveItemTitle({ title: " Manual ", content: "Body" })).toBe("Manual");
    expect(resolveItemTitle({ encrypted: true, encryptedTitle: " Hidden " })).toBe("Hidden");
    expect(resolveItemTitle({ encrypted: true })).toBe("已加密的内容");
    expect(resolveItemTitle({ content: "First line\nSecond line" })).toBe("First line");
  });

  it("counts mixed Chinese, latin words, numbers, and punctuation", () => {
    expect(wordCount("你好 hello world 2026!")).toBe(6);
    expect(wordCount("   ")).toBe(0);
  });
});
