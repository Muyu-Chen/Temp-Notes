import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
