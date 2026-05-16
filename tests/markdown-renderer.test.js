import { afterEach, describe, expect, it, vi } from "vitest";

import { renderMarkdown } from "../js/ui/markdown-renderer.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("renderMarkdown", () => {
  it("escapes HTML and preserves line breaks when markdown libraries are unavailable", () => {
    vi.stubGlobal("marked", undefined);
    vi.stubGlobal("DOMPurify", undefined);

    expect(renderMarkdown("<b>x</b>\n\"&'")).toBe(
      "&lt;b&gt;x&lt;/b&gt;<br>&quot;&amp;&#39;"
    );
  });

  it("uses marked and DOMPurify when both libraries are available", () => {
    const parsedHtml = "<h1>Hello</h1><script>alert(1)</script>";
    const parse = vi.fn(() => parsedHtml);
    const sanitize = vi.fn(() => "<h1>Hello</h1>");
    vi.stubGlobal("marked", { parse });
    vi.stubGlobal("DOMPurify", { sanitize });

    expect(renderMarkdown("# Hello")).toBe("<h1>Hello</h1>");
    expect(parse).toHaveBeenCalledWith("# Hello", {
      gfm: true,
      breaks: false,
    });
    expect(sanitize).toHaveBeenCalledWith(parsedHtml, {
      USE_PROFILES: { html: true },
    });
  });

  it("treats nullish input as an empty markdown document when rendering with libraries", () => {
    const parse = vi.fn(() => "");
    const sanitize = vi.fn(() => "");
    vi.stubGlobal("marked", { parse });
    vi.stubGlobal("DOMPurify", { sanitize });

    expect(renderMarkdown(null)).toBe("");
    expect(parse).toHaveBeenCalledWith("", {
      gfm: true,
      breaks: false,
    });
  });
});
