import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearDraftItemId: vi.fn(() => Promise.resolve()),
  saveDraft: vi.fn(() => Promise.resolve()),
  saveDraftItemId: vi.fn(() => Promise.resolve()),
  saveItem: vi.fn(() => Promise.resolve()),
  now: vi.fn(() => 2000),
}));

vi.mock("../js/storage/draft-storage.js", () => ({
  clearDraftItemId: mocks.clearDraftItemId,
  saveDraft: mocks.saveDraft,
  saveDraftItemId: mocks.saveDraftItemId,
}));

vi.mock("../js/storage/item-storage.js", () => ({
  saveItem: mocks.saveItem,
}));

vi.mock("../js/lib/time-utils.js", () => ({
  now: mocks.now,
}));

vi.mock("../js/lib/bytes-utils.js", () => ({
  estimateStorageBytes: vi.fn(() => 0),
}));

vi.mock("../js/lib/id-utils.js", () => ({
  uid: vi.fn(() => "new-item"),
}));

vi.mock("../js/services/settings-service.js", () => ({
  getFontSize: vi.fn(() => 16),
}));

vi.mock("../js/services/theme-manager.js", () => ({
  getAppliedTheme: vi.fn(() => "light"),
}));

const { DraftService } = await import("../js/services/draft-service.js");

const createApp = ({
  draft = "saved draft",
  itemContent = draft,
  items: providedItems,
  updatedAt = 1000,
  currentLoadedItemId = "item-1",
  modalResult = { ok: false },
  confirmResult = true,
} = {}) => {
  const events = {
    confirmCalls: 0,
    modalCalls: 0,
    renders: 0,
    toasts: [],
  };
  const items =
    providedItems ??
    (currentLoadedItemId
      ? [
          {
            id: currentLoadedItemId,
            content: itemContent,
            createdAt: 500,
            updatedAt,
          },
        ]
      : []);
  const app = {
    currentLoadedItemId,
    items,
    saveTimer: null,
    recycleService: {
      getRecycleItems: () => [],
    },
    dom: {
      value: draft,
      getDraftValue() {
        return this.value;
      },
      setDraftValue(value) {
        this.value = value;
      },
      setAutosaveState: vi.fn(),
      focusDraft: vi.fn(),
    },
    ui: {
      showToast(message) {
        events.toasts.push(message);
      },
      updateMeta: vi.fn(),
    },
    modal: {
      async show() {
        events.modalCalls += 1;
        return modalResult;
      },
    },
    render() {
      events.renders += 1;
    },
  };

  vi.stubGlobal("confirm", () => {
    events.confirmCalls += 1;
    return confirmResult;
  });

  return { app, events, service: new DraftService(app) };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.now.mockReturnValue(2000);
});

describe("DraftService saved draft behavior", () => {
  it("skips archive for empty drafts", async () => {
    const { service } = createApp({ draft: "   ", currentLoadedItemId: null });

    const result = await service.archiveDraft();

    expect(result).toBe("empty");
    expect(mocks.saveItem).not.toHaveBeenCalled();
    expect(mocks.saveDraftItemId).not.toHaveBeenCalled();
  });

  it("creates a new item when there is no linked saved draft", async () => {
    const { app, service } = createApp({
      draft: "fresh draft",
      currentLoadedItemId: null,
    });

    const result = await service.archiveDraft();

    expect(result).toBe("created");
    expect(app.items).toHaveLength(1);
    expect(app.currentLoadedItemId).toBe("new-item");
    expect(app.items[0]).toMatchObject({
      id: "new-item",
      content: "fresh draft",
      createdAt: 2000,
      updatedAt: 2000,
    });
    expect(mocks.saveDraftItemId).toHaveBeenCalledWith("new-item");
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
  });

  it("does not update timestamp or rewrite an unchanged linked item", async () => {
    const { app, service } = createApp({ draft: "same", itemContent: "same", updatedAt: 1000 });

    const result = await service.archiveDraft();

    expect(result).toBe("unchanged");
    expect(app.items[0].updatedAt).toBe(1000);
    expect(mocks.saveItem).not.toHaveBeenCalled();
    expect(mocks.saveDraftItemId).toHaveBeenCalledWith("item-1");
  });

  it("updates the existing linked item only when draft content changes", async () => {
    const { app, service } = createApp({
      draft: "changed",
      itemContent: "old",
      updatedAt: 1000,
    });

    const result = await service.archiveDraft();

    expect(result).toBe("updated");
    expect(app.items).toHaveLength(1);
    expect(app.items[0]).toMatchObject({
      id: "item-1",
      content: "changed",
      updatedAt: 2000,
    });
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
  });

  it("clears an unchanged saved draft without confirmation", async () => {
    const { app, events, service } = createApp({
      draft: "saved",
      itemContent: "saved",
    });

    const cleared = await service.clearDraft();

    expect(cleared).toBe(true);
    expect(events.confirmCalls).toBe(0);
    expect(app.dom.value).toBe("");
    expect(app.currentLoadedItemId).toBeNull();
    expect(mocks.clearDraftItemId).toHaveBeenCalled();
  });

  it("requires confirmation before clearing an unsaved changed draft", async () => {
    const { app, events, service } = createApp({
      draft: "changed",
      itemContent: "saved",
      confirmResult: false,
    });

    const cleared = await service.clearDraft();

    expect(cleared).toBe(false);
    expect(events.confirmCalls).toBe(1);
    expect(app.dom.value).toBe("changed");
    expect(app.currentLoadedItemId).toBe("item-1");
    expect(mocks.clearDraftItemId).not.toHaveBeenCalled();
  });

  it("creates a new draft directly when the current draft is already saved", async () => {
    const { app, events, service } = createApp({
      draft: "saved",
      itemContent: "saved",
    });

    const created = await service.newDraft();

    expect(created).toBe(true);
    expect(events.modalCalls).toBe(0);
    expect(app.dom.value).toBe("");
    expect(app.currentLoadedItemId).toBeNull();
  });

  it("prompts on new draft when content changed and saves without duplicating when confirmed", async () => {
    const { app, events, service } = createApp({
      draft: "changed",
      itemContent: "saved",
      modalResult: { ok: true },
      updatedAt: 1000,
    });

    const created = await service.newDraft();

    expect(created).toBe(true);
    expect(events.modalCalls).toBe(1);
    expect(app.items).toHaveLength(1);
    expect(app.items[0]).toMatchObject({
      id: "item-1",
      content: "changed",
      updatedAt: 2000,
    });
    expect(app.dom.value).toBe("");
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
  });

  it("can discard changed content when creating a new draft", async () => {
    const { app, events, service } = createApp({
      draft: "changed",
      itemContent: "saved",
      modalResult: { ok: false },
      updatedAt: 1000,
    });

    const created = await service.newDraft();

    expect(created).toBe(true);
    expect(events.modalCalls).toBe(1);
    expect(app.items[0]).toMatchObject({
      content: "saved",
      updatedAt: 1000,
    });
    expect(app.dom.value).toBe("");
    expect(mocks.saveItem).not.toHaveBeenCalled();
  });

  it("does not load encrypted items into the draft", () => {
    const { app, events, service } = createApp({
      draft: "current",
      currentLoadedItemId: null,
      items: [{ id: "encrypted", content: "secret", encrypted: true, updatedAt: 1000 }],
    });

    service.loadToDraft("encrypted");

    expect(app.dom.value).toBe("current");
    expect(app.currentLoadedItemId).toBeNull();
    expect(events.toasts).toContain("该条目已加密，请先解密");
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });

  it("clears the linked item id when draft input becomes empty and autosaves", async () => {
    vi.useFakeTimers();
    try {
      const { app, service } = createApp({
        draft: "   ",
        itemContent: "saved",
      });

      service.onDraftInput();

      expect(app.currentLoadedItemId).toBeNull();
      expect(mocks.clearDraftItemId).toHaveBeenCalled();
      expect(app.dom.setAutosaveState).toHaveBeenCalledWith("保存中");

      await vi.advanceTimersByTimeAsync(250);

      expect(mocks.saveDraft).toHaveBeenCalledWith("   ");
      expect(app.dom.setAutosaveState).toHaveBeenCalledWith("已保存");
    } finally {
      vi.useRealTimers();
    }
  });
});
