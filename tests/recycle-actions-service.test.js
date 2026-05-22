import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveItem: vi.fn(() => Promise.resolve()),
  saveDraft: vi.fn(() => Promise.resolve()),
  clearDraftItemId: vi.fn(() => Promise.resolve()),
  saveDraftAttachments: vi.fn(() => Promise.resolve()),
  uid: vi.fn(() => "new-item"),
  now: vi.fn(() => 8000),
}));

vi.mock("../js/storage/item-storage.js", () => ({
  saveItem: mocks.saveItem,
}));

vi.mock("../js/storage/draft-storage.js", () => ({
  saveDraft: mocks.saveDraft,
  clearDraftItemId: mocks.clearDraftItemId,
}));

vi.mock("../js/storage/draft-attachments-storage.js", () => ({
  saveDraftAttachments: mocks.saveDraftAttachments,
}));

vi.mock("../js/lib/id-utils.js", () => ({
  uid: mocks.uid,
}));

vi.mock("../js/lib/time-utils.js", async () => {
  const actual = await vi.importActual("../js/lib/time-utils.js");
  return {
    ...actual,
    now: mocks.now,
  };
});

const { RecycleActionsService } = await import("../js/services/recycle-actions-service.js");

const createApp = (items, overrides = {}) => {
  const app = {
    items: overrides.items || [],
    currentLoadedItemId: null,
    currentDraftAttachments: [],
    recycleService: {
      getRecycleItems: vi.fn(() => items),
      restoreItem: vi.fn((index) => Promise.resolve(items[index] || null)),
      deleteFromRecycle: vi.fn(() => Promise.resolve(items[0] || null)),
      clearRecycle: vi.fn(() => Promise.resolve(items)),
    },
    dom: {
      getDraftValue: vi.fn(() => ""),
      setDraftValue: vi.fn(),
      setAutosaveState: vi.fn(),
    },
    modal: {
      show: vi.fn(() => Promise.resolve({ ok: true })),
    },
    cleanupUnreferencedRecordings: vi.fn(() => Promise.resolve()),
    render: vi.fn(),
    recycleListView: {
      render: vi.fn(),
    },
    ui: {
      showToast: vi.fn(),
    },
    ...overrides,
  };
  return app;
};

describe("RecycleActionsService recording cleanup", () => {
  it("restores a deleted recording to its active source item", async () => {
    const recordingEntry = {
      id: "recording-rec-1",
      recycleType: "recording",
      attachment: { id: "rec-1", type: "audio", mimeType: "audio/webm", createdAt: 10 },
      sourceItemId: "item-1",
      sourceItemTitle: "Meeting",
      deletedAt: 5000,
    };
    const sourceItem = { id: "item-1", content: "Meeting", attachments: [], updatedAt: 1000 };
    const app = createApp([recordingEntry], { items: [sourceItem] });
    app.recycleService.getRecycleItems.mockReturnValueOnce([recordingEntry]).mockReturnValue([]);
    const service = new RecycleActionsService(app);

    await service.restoreFromRecycle(0);

    expect(app.items[0].attachments).toEqual([
      expect.objectContaining({ id: "rec-1", name: "录音" }),
    ]);
    expect(app.items[0].tags).toEqual(["录音"]);
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
    expect(app.ui.showToast).toHaveBeenCalledWith("录音已恢复到原条目");
  });

  it("can restore a deleted recording together with its source item from recycle", async () => {
    const recordingEntry = {
      id: "recording-rec-1",
      recycleType: "recording",
      attachment: { id: "rec-1", type: "audio", mimeType: "audio/webm", createdAt: 10 },
      sourceItemId: "item-1",
      sourceItemTitle: "Meeting",
      deletedAt: 6000,
    };
    const deletedItem = {
      id: "item-1",
      content: "Meeting",
      attachments: [],
      deletedAt: 5000,
      updatedAt: 1000,
    };
    const recycleItems = [recordingEntry, deletedItem];
    const app = createApp(recycleItems);
    app.recycleService.restoreItem.mockImplementation((index) =>
      Promise.resolve(recycleItems[index] || null)
    );
    const service = new RecycleActionsService(app);

    await service.restoreFromRecycle(0);

    expect(app.modal.show).toHaveBeenCalledTimes(2);
    expect(app.recycleService.restoreItem).toHaveBeenNthCalledWith(1, 1);
    expect(app.recycleService.restoreItem).toHaveBeenNthCalledWith(2, 0);
    expect(app.items[0]).toMatchObject({
      id: "item-1",
      content: "Meeting",
      tags: ["录音"],
      attachments: [expect.objectContaining({ id: "rec-1" })],
    });
    expect(app.ui.showToast).toHaveBeenCalledWith("条目和录音已恢复");
  });

  it("restores a deleted draft and its recording back to an empty draft", async () => {
    const recordingEntry = {
      id: "recording-rec-draft",
      recycleType: "recording",
      attachment: { id: "rec-draft", type: "audio", mimeType: "audio/webm", createdAt: 10 },
      sourceItemTitle: "草稿",
      sourceDraftContent: "draft body",
      deletedAt: 6000,
    };
    const app = createApp([recordingEntry]);
    const service = new RecycleActionsService(app);

    await service.restoreFromRecycle(0);

    expect(app.dom.setDraftValue).toHaveBeenCalledWith("draft body");
    expect(app.currentDraftAttachments).toEqual([
      expect.objectContaining({ id: "rec-draft" }),
    ]);
    expect(mocks.saveDraft).toHaveBeenCalledWith("draft body");
    expect(mocks.saveDraftAttachments).toHaveBeenCalledWith(app.currentDraftAttachments);
    expect(app.ui.showToast).toHaveBeenCalledWith("草稿和录音已恢复");
  });

  it("cleans unreferenced recording blobs after permanent item deletion", async () => {
    const item = {
      id: "deleted",
      content: "body",
      attachments: [{ id: "rec-1", type: "audio", mimeType: "audio/webm", createdAt: 10 }],
    };
    const app = createApp([item]);
    app.recycleService.getRecycleItems
      .mockReturnValueOnce([item])
      .mockReturnValueOnce([]);
    const service = new RecycleActionsService(app);

    await service.deleteFromRecycle(0);

    expect(app.recycleService.deleteFromRecycle).toHaveBeenCalledWith(0);
    expect(app.cleanupUnreferencedRecordings).toHaveBeenCalledWith(["rec-1"]);
    expect(app.recycleListView.render).toHaveBeenCalledWith([]);
  });

  it("cleans all unreferenced recording blobs after clearing recycle bin", async () => {
    const items = [
      {
        id: "a",
        content: "a",
        attachments: [{ id: "rec-a", type: "audio", mimeType: "audio/webm", createdAt: 10 }],
      },
      {
        id: "b",
        content: "b",
        attachments: [{ id: "rec-b", type: "audio", mimeType: "audio/webm", createdAt: 20 }],
      },
    ];
    const app = createApp(items);
    app.recycleService.getRecycleItems
      .mockReturnValueOnce(items)
      .mockReturnValueOnce([]);
    const service = new RecycleActionsService(app);

    await service.clearRecycleBin();

    expect(app.recycleService.clearRecycle).toHaveBeenCalled();
    expect(app.cleanupUnreferencedRecordings).toHaveBeenCalledWith(["rec-a", "rec-b"]);
    expect(app.recycleListView.render).toHaveBeenCalledWith([]);
  });
});
