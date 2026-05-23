import { afterEach, describe, expect, it, vi } from "vitest";

import { loadHtmlPartial } from "../js/bootstrap/load-partials.js";

const stubMount = (mount) => {
  vi.stubGlobal("document", {
    querySelector: vi.fn(() => mount),
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadHtmlPartial", () => {
  it("loads a partial with fetch when available", async () => {
    const mount = { dataset: { partial: "./partial.html" }, innerHTML: "" };
    stubMount(mount);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => "<div>Settings</div>",
      }))
    );

    await loadHtmlPartial("#settingsPanelMount");

    expect(fetch).toHaveBeenCalledWith("./partial.html");
    expect(mount.innerHTML).toBe("<div>Settings</div>");
  });

  it("falls back to XMLHttpRequest when fetch is unavailable", async () => {
    const mount = { dataset: { partial: "./partial.html" }, innerHTML: "" };
    stubMount(mount);
    vi.stubGlobal("fetch", undefined);
    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        open(method, url) {
          this.method = method;
          this.url = url;
        }

        send() {
          this.status = 200;
          this.responseText = "<div>Loaded</div>";
          this.onload();
        }
      }
    );

    await loadHtmlPartial("#settingsPanelMount");

    expect(mount.innerHTML).toBe("<div>Loaded</div>");
  });
});
