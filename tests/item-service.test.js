import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../js/constants.js";

const mocks = vi.hoisted(() => ({
  clearDraftItemId: vi.fn(() => Promise.resolve()),
  deleteItemById: vi.fn(() => Promise.resolve()),
  saveItem: vi.fn(() => Promise.resolve()),
  now: vi.fn(() => 3000),
}));

vi.mock("../js/storage/draft-storage.js", () => ({
  clearDraftItemId: mocks.clearDraftItemId,
}));

vi.mock("../js/storage/item-storage.js", () => ({
  deleteItemById: mocks.deleteItemById,
  saveItem: mocks.saveItem,
}));

vi.mock("../js/lib/time-utils.js", () => ({
  now: mocks.now,
}));

const { ItemService } = await import("../js/services/item-service.js");

const createApp = ({ items, currentLoadedItemId = null } = {}) => {
  const events = {
    renders: 0,
    toasts: [],
  };
  const app = {
    currentLoadedItemId,
    items: items ?? [
      {
        id: "item-1",
        content: "Title\nBody",
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    recycleService: {
      addToRecycle: vi.fn(() => Promise.resolve()),
    },
    render() {
      events.renders += 1;
    },
    ui: {
      showToast(message) {
        events.toasts.push(message);
      },
    },
  };

  return { app, events, service: new ItemService(app) };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.now.mockReturnValue(3000);
});

describe("ItemService", () => {
  it("does nothing when renaming to the existing title", async () => {
    const { events, service } = createApp({
      items: [{ id: "item-1", title: "Custom", content: "Body", updatedAt: 1000 }],
    });

    await service.renameItemTitle("item-1", "  Custom  ");

    expect(mocks.saveItem).not.toHaveBeenCalled();
    expect(events.renders).toBe(0);
    expect(events.toasts).toEqual([]);
  });

  it("clears a custom title when it matches the first content line", async () => {
    const { app, events, service } = createApp({
      items: [
        {
          id: "item-1",
          title: "Custom",
          content: "Title\nBody",
          updatedAt: 1000,
        },
      ],
    });

    await service.renameItemTitle("item-1", "Title");

    expect(app.items[0]).toMatchObject({
      id: "item-1",
      title: undefined,
      updatedAt: 3000,
    });
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
    expect(events.renders).toBe(1);
    expect(events.toasts).toEqual(["已恢复为正文第一行标题"]);
  });

  it("keeps encrypted title metadata in sync when renaming encrypted items", async () => {
    const { app, events, service } = createApp({
      items: [
        {
          id: "item-1",
          content: "ciphertext",
          encrypted: true,
          encryptedTitle: "Old",
          updatedAt: 1000,
        },
      ],
    });

    await service.renameItemTitle("item-1", "Secret");

    expect(app.items[0]).toMatchObject({
      title: "Secret",
      encryptedTitle: "Secret",
      updatedAt: 3000,
    });
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
    expect(events.toasts).toEqual(["标题已更新"]);
  });

  it("moves deleted items to recycle bin and clears the loaded draft link", async () => {
    const item = { id: "item-1", content: "Body", updatedAt: 1000 };
    const { app, events, service } = createApp({
      items: [item, { id: "item-2", content: "Other", updatedAt: 1000 }],
      currentLoadedItemId: "item-1",
    });

    await service.deleteItem("item-1");

    expect(app.recycleService.addToRecycle).toHaveBeenCalledWith(item);
    expect(app.items).toEqual([{ id: "item-2", content: "Other", updatedAt: 1000 }]);
    expect(app.currentLoadedItemId).toBeNull();
    expect(mocks.clearDraftItemId).toHaveBeenCalled();
    expect(mocks.deleteItemById).toHaveBeenCalledWith("item-1");
    expect(events.renders).toBe(1);
    expect(events.toasts).toEqual(["已删除条目（可在回收站恢复）"]);
  });

  it("does nothing when deleting a missing item", async () => {
    const { app, events, service } = createApp();

    await service.deleteItem("missing");

    expect(app.items).toHaveLength(1);
    expect(app.recycleService.addToRecycle).not.toHaveBeenCalled();
    expect(mocks.deleteItemById).not.toHaveBeenCalled();
    expect(events.renders).toBe(0);
  });

  it("toggles pinned state without touching updatedAt", async () => {
    const { app, events, service } = createApp({
      items: [
        { id: "item-1", content: "Body", updatedAt: 1000 },
        { id: "item-2", content: "Other", updatedAt: 2000 },
      ],
    });

    await service.togglePinned("item-1");

    expect(app.items[0]).toMatchObject({
      id: "item-1",
      pinned: true,
      pinnedAt: 3000,
      updatedAt: 1000,
    });
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
    expect(events.toasts).toEqual(["已置顶条目"]);
  });

  it("toggles favorite state without changing list order", async () => {
    const { app, events, service } = createApp({
      items: [
        { id: "item-1", content: "Body", updatedAt: 1000 },
        { id: "item-2", content: "Other", updatedAt: 2000 },
      ],
    });

    await service.toggleFavorite("item-1");

    expect(app.items[0]).toMatchObject({ id: "item-1", favorite: true, updatedAt: 1000 });
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
    expect(events.toasts).toEqual(["已收藏条目"]);
  });

  it("edits tags with normalized values", async () => {
    const { app, events, service } = createApp({
      items: [{ id: "item-1", content: "Body", tags: ["old"], updatedAt: 1000 }],
    });
    app.modal = {
      show: vi.fn(() => Promise.resolve({ ok: true, values: ["#Work, work, 想法"] })),
    };

    await service.editTags("item-1");

    expect(app.items[0]).toMatchObject({
      id: "item-1",
      tags: ["Work", "想法"],
      updatedAt: 1000,
    });
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
    expect(events.toasts).toEqual(["标签已更新"]);
  });

  it("warns before editing tags on encrypted entries", async () => {
    const { app, service } = createApp({
      items: [{ id: "item-1", content: "cipher", encrypted: true, tags: [], updatedAt: 1000 }],
    });
    app.modal = {
      show: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, values: [] })
        .mockResolvedValueOnce({ ok: true, values: ["secret"] }),
    };

    await service.editTags("item-1");

    expect(app.modal.show).toHaveBeenCalledTimes(2);
    expect(app.items[0].tags).toEqual(["secret"]);
  });

  it("generates and merges AI tags without changing updatedAt", async () => {
    const { app, events, service } = createApp({
      items: [{ id: "item-1", content: "Body", tags: ["old"], updatedAt: 1000 }],
    });
    app.getLLMSettings = vi.fn(() => ({
      enabled: true,
      baseUrl: "https://api.example.com/v1",
      apiKey: "x",
      model: "tag-model",
    }));
    app.llmService = {
      generateTags: vi.fn(() =>
        Promise.resolve({ ok: true, requested: true, message: "标签已生成", tags: ["old", "new"] })
      ),
    };

    await service.generateTags("item-1");

    expect(app.llmService.generateTags).toHaveBeenCalledWith(app.getLLMSettings(), {
      id: "item-1",
      content: "Body",
      tags: ["old"],
      updatedAt: 1000,
    });
    expect(app.items[0]).toMatchObject({
      tags: ["old", "new"],
      updatedAt: 1000,
    });
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
    expect(events.toasts).toEqual(["正在生成标签...", "已添加 1 个标签"]);
  });

  it("does not request AI tags for encrypted items", async () => {
    const { app, events, service } = createApp({
      items: [{ id: "item-1", content: "cipher", encrypted: true, updatedAt: 1000 }],
    });
    app.llmService = {
      generateTags: vi.fn(),
    };
    app.getLLMSettings = vi.fn();

    await service.generateTags("item-1");

    expect(app.llmService.generateTags).not.toHaveBeenCalled();
    expect(mocks.saveItem).not.toHaveBeenCalled();
    expect(events.toasts).toEqual(["请先解密后再生成标签"]);
  });

  it("generates tags for the currently loaded draft item and saves them to the archive item", async () => {
    const { app, events, service } = createApp({
      currentLoadedItemId: "item-1",
      items: [{ id: "item-1", content: "Old body", tags: ["old"], attachments: [], updatedAt: 1000 }],
    });
    app.dom = {
      getDraftValue: vi.fn(() => "Draft body"),
      setLLMDebugLog: vi.fn(),
    };
    app.currentDraftAttachments = [{ id: "rec-1", type: "audio", mimeType: "audio/webm" }];
    app.getLLMSettings = vi.fn(() => ({
      id: "default",
      enabled: true,
      baseUrl: "https://api.example.com/v1",
      apiKey: "x",
      model: "tag-model",
    }));
    app.llmService = {
      generateTags: vi.fn(() =>
        Promise.resolve({ ok: true, requested: true, message: "标签已生成", tags: ["new"] })
      ),
    };

    await service.generateTagsForDraft();

    expect(app.llmService.generateTags).toHaveBeenCalledWith(
      app.getLLMSettings(),
      expect.objectContaining({ content: "Draft body", attachments: app.currentDraftAttachments })
    );
    expect(app.items[0].tags).toEqual(["old", "new"]);
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
    expect(events.toasts).toEqual(["正在生成标签...", "已添加 1 个标签"]);
  });

  it("asks users to archive before generating tags for an unlinked draft", async () => {
    const { app, events, service } = createApp({
      currentLoadedItemId: null,
      items: [{ id: "item-1", content: "Body", updatedAt: 1000 }],
    });
    app.llmService = { generateTags: vi.fn() };

    await service.generateTagsForDraft();

    expect(app.llmService.generateTags).not.toHaveBeenCalled();
    expect(mocks.saveItem).not.toHaveBeenCalled();
    expect(events.toasts).toEqual(["请先把草稿存档或加载一个存档条目"]);
  });

  it("does not modify tags when AI generation fails", async () => {
    const { app, events, service } = createApp({
      items: [{ id: "item-1", content: "Body", tags: ["old"], updatedAt: 1000 }],
    });
    app.getLLMSettings = vi.fn(() => ({ enabled: false }));
    app.llmService = {
      generateTags: vi.fn(() =>
        Promise.resolve({ ok: false, requested: false, message: "请先启用大模型功能", tags: [] })
      ),
    };

    await service.generateTags("item-1");

    expect(app.items[0].tags).toEqual(["old"]);
    expect(mocks.saveItem).not.toHaveBeenCalled();
    expect(events.toasts).toEqual(["正在生成标签...", "请先启用大模型功能"]);
  });

  it("stores local debug logs when AI tag generation fails after a request", async () => {
    const store = new Map();
    vi.stubGlobal("localStorage", {
      setItem: vi.fn((key, value) => {
        store.set(key, String(value));
      }),
      getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
      removeItem: vi.fn((key) => {
        store.delete(key);
      }),
    });

    const { app, events, service } = createApp({
      items: [{ id: "item-1", content: "Body", tags: ["old"], updatedAt: 1000 }],
    });
    app.dom = {
      setLLMDebugLog: vi.fn(),
    };
    app.getLLMSettings = vi.fn(() => ({
      enabled: true,
      baseUrl: "https://api.example.com/v1",
      apiKey: "x",
      model: "tag-model",
    }));
    app.llmService = {
      generateTags: vi.fn(() =>
        Promise.resolve({
          ok: false,
          requested: true,
          message: "生成失败：未返回有效标签",
          tags: [],
          debugLog: "debug details",
        })
      ),
    };

    await service.generateTags("item-1");

    expect(localStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.LLM_DEBUG_LOG,
      "debug details"
    );
    expect(app.dom.setLLMDebugLog).toHaveBeenCalledWith("debug details");
    expect(mocks.saveItem).not.toHaveBeenCalled();
    expect(events.toasts).toEqual(["正在生成标签...", "生成失败：未返回有效标签（日志已保存）"]);

    vi.unstubAllGlobals();
  });
});
