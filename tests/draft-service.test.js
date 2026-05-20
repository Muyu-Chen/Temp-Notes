import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearDraftItemId: vi.fn(() => Promise.resolve()),
  saveDraft: vi.fn(() => Promise.resolve()),
  saveDraftItemId: vi.fn(() => Promise.resolve()),
  clearDraftAttachments: vi.fn(() => Promise.resolve()),
  saveDraftAttachments: vi.fn(() => Promise.resolve()),
  saveItem: vi.fn(() => Promise.resolve()),
  now: vi.fn(() => 2000),
}));

vi.mock("../js/storage/draft-storage.js", () => ({
  clearDraftItemId: mocks.clearDraftItemId,
  saveDraft: mocks.saveDraft,
  saveDraftItemId: mocks.saveDraftItemId,
}));

vi.mock("../js/storage/draft-attachments-storage.js", () => ({
  clearDraftAttachments: mocks.clearDraftAttachments,
  saveDraftAttachments: mocks.saveDraftAttachments,
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
  currentDraftAttachments = [],
  itemAttachments = currentDraftAttachments,
  recycleItems = [],
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
            attachments: itemAttachments,
            createdAt: 500,
            updatedAt,
          },
        ]
      : []);
  const app = {
    currentLoadedItemId,
    currentDraftAttachments,
    items,
    saveTimer: null,
    cleanupUnreferencedRecordings: vi.fn(() => Promise.resolve()),
    recycleService: {
      getRecycleItems: () => recycleItems,
      addRecordingToRecycle: vi.fn(() => Promise.resolve()),
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
  it("counts recording attachment sizes in draft and total usage", () => {
    const { service } = createApp({
      draft: "abc",
      currentDraftAttachments: [
        { id: "rec-1", type: "audio", mimeType: "audio/webm", size: 100, createdAt: 1 },
      ],
      itemAttachments: [
        { id: "rec-1", type: "audio", mimeType: "audio/webm", size: 100, createdAt: 1 },
        { id: "rec-2", type: "audio", mimeType: "audio/webm", size: 250, createdAt: 2 },
      ],
      recycleItems: [
        {
          id: "deleted",
          attachments: [
            { id: "rec-3", type: "audio", mimeType: "audio/webm", size: 400, createdAt: 3 },
          ],
        },
      ],
    });

    expect(service.getDraftUsageBytes()).toBe(106);
    expect(service.getStorageUsageBytes()).toBe(750);
  });

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
      currentDraftAttachments: [
        {
          id: "rec-1",
          type: "audio",
          name: "Audio",
          mimeType: "audio/webm",
          ext: "webm",
          size: 10,
          durationMs: 20,
          createdAt: 30,
        },
      ],
    });

    const result = await service.archiveDraft();

    expect(result).toBe("created");
    expect(app.items).toHaveLength(1);
    expect(app.currentLoadedItemId).toBe("new-item");
    expect(app.items[0]).toMatchObject({
      id: "new-item",
      content: "fresh draft",
      attachments: [
        {
          id: "rec-1",
          type: "audio",
          name: "Audio",
          mimeType: "audio/webm",
          ext: "webm",
          size: 10,
          durationMs: 20,
          createdAt: 30,
        },
      ],
      createdAt: 2000,
      updatedAt: 2000,
    });
    expect(mocks.saveDraftItemId).toHaveBeenCalledWith("new-item");
    expect(mocks.saveDraftAttachments).toHaveBeenCalledWith(app.currentDraftAttachments);
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
  });

  it("does not update timestamp or rewrite an unchanged linked item", async () => {
    const attachments = [
      { id: "rec-1", type: "audio", mimeType: "audio/webm", createdAt: 30 },
    ];
    const { app, service } = createApp({
      draft: "same",
      itemContent: "same",
      updatedAt: 1000,
      currentDraftAttachments: attachments,
      itemAttachments: attachments,
    });

    const result = await service.archiveDraft();

    expect(result).toBe("unchanged");
    expect(app.items[0].updatedAt).toBe(1000);
    expect(mocks.saveItem).not.toHaveBeenCalled();
    expect(mocks.saveDraftItemId).toHaveBeenCalledWith("item-1");
    expect(mocks.saveDraftAttachments).toHaveBeenCalled();
  });

  it("updates the existing linked item when draft content or attachments change", async () => {
    const { app, service } = createApp({
      draft: "changed",
      itemContent: "old",
      updatedAt: 1000,
      currentDraftAttachments: [
        { id: "rec-new", type: "audio", mimeType: "audio/webm", createdAt: 30 },
      ],
      itemAttachments: [],
    });

    const result = await service.archiveDraft();

    expect(result).toBe("updated");
    expect(app.items).toHaveLength(1);
    expect(app.items[0]).toMatchObject({
      id: "item-1",
      content: "changed",
      attachments: [
        {
          id: "rec-new",
          type: "audio",
          name: "录音",
          mimeType: "audio/webm",
          ext: "webm",
          size: 0,
          durationMs: 0,
          createdAt: 30,
        },
      ],
      updatedAt: 2000,
    });
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
  });

  it("archives an attachment-only draft", async () => {
    const { app, service } = createApp({
      draft: "",
      currentLoadedItemId: null,
      currentDraftAttachments: [
        { id: "rec-only", type: "audio", mimeType: "audio/webm", createdAt: 30 },
      ],
    });

    const result = await service.archiveDraft();

    expect(result).toBe("created");
    expect(app.items[0]).toMatchObject({
      id: "new-item",
      content: "",
      attachments: [{ id: "rec-only" }],
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
    expect(app.currentDraftAttachments).toEqual([]);
    expect(app.currentLoadedItemId).toBeNull();
    expect(mocks.clearDraftItemId).toHaveBeenCalled();
    expect(mocks.clearDraftAttachments).toHaveBeenCalled();
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

  it("requires confirmation before clearing unsaved draft attachments", async () => {
    const { app, events, service } = createApp({
      draft: "",
      currentLoadedItemId: null,
      currentDraftAttachments: [
        { id: "rec-unsaved", type: "audio", mimeType: "audio/webm", createdAt: 30 },
      ],
      confirmResult: false,
    });

    const cleared = await service.clearDraft();

    expect(cleared).toBe(false);
    expect(events.confirmCalls).toBe(1);
    expect(app.currentDraftAttachments).toHaveLength(1);
  });

  it("moves unsaved draft recordings to recycle when clearing the draft", async () => {
    const { app, service } = createApp({
      draft: "draft with audio",
      currentLoadedItemId: null,
      currentDraftAttachments: [
        { id: "rec-unsaved", type: "audio", mimeType: "audio/webm", createdAt: 30 },
      ],
      confirmResult: true,
    });

    const cleared = await service.clearDraft();

    expect(cleared).toBe(true);
    expect(app.recycleService.addRecordingToRecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        attachment: expect.objectContaining({ id: "rec-unsaved" }),
        sourceItemTitle: "草稿",
        sourceDraftContent: "draft with audio",
      })
    );
  });

  it("does not recycle recordings that still belong to an unchanged saved item", async () => {
    const attachment = { id: "rec-saved", type: "audio", mimeType: "audio/webm", createdAt: 30 };
    const { app, service } = createApp({
      draft: "saved",
      itemContent: "saved",
      currentDraftAttachments: [attachment],
      itemAttachments: [attachment],
    });

    await service.clearDraft();

    expect(app.recycleService.addRecordingToRecycle).not.toHaveBeenCalled();
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

  it("loads item attachments into the draft with the item content", () => {
    const { app, service } = createApp({
      draft: "current",
      currentLoadedItemId: null,
      items: [
        {
          id: "plain",
          content: "body",
          attachments: [{ id: "rec-1", type: "audio", mimeType: "audio/webm", createdAt: 30 }],
          updatedAt: 1000,
        },
      ],
    });

    service.loadToDraft("plain");

    expect(app.dom.value).toBe("body");
    expect(app.currentDraftAttachments).toEqual([
      {
        id: "rec-1",
        type: "audio",
        name: "录音",
        mimeType: "audio/webm",
        ext: "webm",
        size: 0,
        durationMs: 0,
        createdAt: 30,
      },
    ]);
    expect(mocks.saveDraftAttachments).toHaveBeenCalledWith(app.currentDraftAttachments);
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
