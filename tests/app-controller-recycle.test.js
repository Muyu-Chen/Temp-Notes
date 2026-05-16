import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppController } from "../js/app-controller.js";

const createLocalStorage = () => {
  const store = new Map();
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key) => {
      store.delete(key);
    }),
  };
};

beforeEach(() => {
  vi.stubGlobal("localStorage", createLocalStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppController recycle retention", () => {
  it("runs recycle cleanup when the retention setting changes", async () => {
    const dom = {
      setRecycleRetention: vi.fn(),
    };
    const ui = {
      showToast: vi.fn(),
    };
    const app = new AppController(ui, dom);
    app.recycleService = {
      cleanupExpired: vi.fn(() => Promise.resolve(1)),
      getRecycleItems: vi.fn(() => []),
    };
    app.recycleListView = {
      render: vi.fn(),
    };

    await app.setRecycleRetentionDays("7");

    expect(app.recycleService.cleanupExpired).toHaveBeenCalledWith(7);
    expect(app.recycleListView.render).toHaveBeenCalledWith([]);
    expect(dom.setRecycleRetention).toHaveBeenLastCalledWith(7, "超过 7 天自动清理");
    expect(ui.showToast).toHaveBeenCalledWith("已自动清理 1 个回收站条目");
  });
});
