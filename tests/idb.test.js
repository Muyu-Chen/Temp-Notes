import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("IndexedDB setup", () => {
  it("opens v3 and creates the recordings object store during upgrades", async () => {
    const stores = new Set();
    const createIndex = vi.fn();
    const createObjectStore = vi.fn((name) => {
      stores.add(name);
      return { createIndex };
    });
    const db = {
      objectStoreNames: {
        contains: (name) => stores.has(name),
      },
      createObjectStore,
    };
    const open = vi.fn(() => {
      const request = {};
      queueMicrotask(() => {
        request.onupgradeneeded({ target: { result: db } });
        request.result = db;
        request.onsuccess({ target: { result: db } });
      });
      return request;
    });
    vi.stubGlobal("indexedDB", { open });

    const { DB_NAME, DB_VERSION, STORE_RECORDINGS, initDB } = await import("../js/storage/idb.js");
    await expect(initDB()).resolves.toBe(db);

    expect(open).toHaveBeenCalledWith(DB_NAME, DB_VERSION);
    expect(DB_VERSION).toBe(3);
    expect(createObjectStore).toHaveBeenCalledWith(STORE_RECORDINGS, { keyPath: "id" });
  });
});
