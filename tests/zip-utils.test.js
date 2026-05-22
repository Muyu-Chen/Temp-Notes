import { afterEach, describe, expect, it, vi } from "vitest";

import { createZipBlob, decodeZipTextEntry, readZipEntries } from "../js/lib/zip-utils.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("zip utilities", () => {
  it("writes normalized entries through the local JSZip runtime", async () => {
    let instance;
    class FakeJSZip {
      constructor() {
        this.files = {};
        instance = this;
      }

      file(name, data, options) {
        this.files[name] = { data, options };
      }

      generateAsync(options) {
        this.generateOptions = options;
        return Promise.resolve(new Blob(["zip"], { type: "application/zip" }));
      }
    }
    vi.stubGlobal("JSZip", FakeJSZip);

    const blob = await createZipBlob(
      [
        { name: "/notes.json", data: "{}" },
        { name: "recordings\\rec-1.webm", data: new Uint8Array([1]) },
      ],
      1000
    );

    expect(blob.type).toBe("application/zip");
    expect(Object.keys(instance.files)).toEqual(["notes.json", "recordings/rec-1.webm"]);
    expect(instance.files["notes.json"].options).toMatchObject({ compression: "STORE" });
    expect(instance.generateOptions).toMatchObject({ type: "blob", compression: "STORE" });
  });

  it("reads non-directory entries through JSZip", async () => {
    class FakeJSZip {
      static loadAsync = vi.fn(() =>
        Promise.resolve({
          files: {
            "notes.json": {
              name: "notes.json",
              dir: false,
              async: vi.fn(() => Promise.resolve(new Uint8Array([123, 125]))),
            },
            "recordings/": { name: "recordings/", dir: true },
          },
        })
      );
    }
    vi.stubGlobal("JSZip", FakeJSZip);

    const entries = await readZipEntries(new Blob(["zip"]));

    expect([...entries.keys()]).toEqual(["notes.json"]);
    expect(decodeZipTextEntry(entries.get("notes.json"))).toBe("{}");
  });

  it("fails clearly when the local ZIP runtime is missing", async () => {
    vi.stubGlobal("JSZip", undefined);

    await expect(createZipBlob([])).rejects.toThrow("ZIP 工具未加载");
  });
});
