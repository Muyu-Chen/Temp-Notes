import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearDraftItemId: vi.fn(() => Promise.resolve()),
  saveDraft: vi.fn(() => Promise.resolve()),
  saveDraftAttachments: vi.fn(() => Promise.resolve()),
  saveItems: vi.fn(() => Promise.resolve()),
  loadRecording: vi.fn(),
  saveRecording: vi.fn(() => Promise.resolve()),
  downloadBlobFile: vi.fn(),
  downloadTextFile: vi.fn(),
  formatExportTimestamp: vi.fn(() => "20260520-120000"),
  getTextExportPayload: vi.fn(),
  createZipBlob: vi.fn(() =>
    Promise.resolve(new Blob(["zip"], { type: "application/zip" }))
  ),
  decodeZipTextEntry: vi.fn(),
  readZipEntries: vi.fn(),
}));

vi.mock("../js/storage/draft-storage.js", () => ({
  clearDraftItemId: mocks.clearDraftItemId,
  saveDraft: mocks.saveDraft,
}));

vi.mock("../js/storage/draft-attachments-storage.js", () => ({
  saveDraftAttachments: mocks.saveDraftAttachments,
}));

vi.mock("../js/storage/item-storage.js", () => ({
  saveItems: mocks.saveItems,
}));

vi.mock("../js/storage/recording-storage.js", () => ({
  loadRecording: mocks.loadRecording,
  saveRecording: mocks.saveRecording,
}));

vi.mock("../js/lib/download-utils.js", () => ({
  downloadBlobFile: mocks.downloadBlobFile,
  downloadTextFile: mocks.downloadTextFile,
  formatExportTimestamp: mocks.formatExportTimestamp,
  getTextExportPayload: mocks.getTextExportPayload,
}));

vi.mock("../js/lib/zip-utils.js", () => ({
  createZipBlob: mocks.createZipBlob,
  decodeZipTextEntry: mocks.decodeZipTextEntry,
  readZipEntries: mocks.readZipEntries,
}));

const { ImportExportService } = await import("../js/services/import-export-service.js");

const createApp = () => {
  const app = {
    items: [],
    currentDraftAttachments: [],
    currentLoadedItemId: "item-1",
    dom: {
      getDraftValue: vi.fn(() => "draft"),
      setDraftValue: vi.fn(),
      setAutosaveState: vi.fn(),
    },
    recycleService: {
      deletedItems: [],
      getRecycleItems() {
        return this.deletedItems;
      },
      saveToStorage: vi.fn(() => Promise.resolve()),
    },
    recycleListView: {
      render: vi.fn(),
    },
    ui: {
      showToast: vi.fn(),
    },
    render: vi.fn(),
    stopDraftAttachmentPlayback: vi.fn(),
  };

  return app;
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ImportExportService", () => {
  it("exports notes.json and recording blobs as a ZIP", async () => {
    const attachment = {
      id: "rec-1",
      type: "audio",
      name: "Meeting",
      mimeType: "audio/webm",
      ext: "webm",
      size: 5,
      durationMs: 10,
      createdAt: 20,
    };
    const blob = new Blob(["audio"], { type: "audio/webm" });
    mocks.loadRecording.mockResolvedValue({ id: "rec-1", blob });

    const app = createApp();
    app.items = [{ id: "item-1", content: "Body", createdAt: 1, updatedAt: 2, attachments: [attachment] }];

    await new ImportExportService(app).exportAll();

    expect(mocks.createZipBlob).toHaveBeenCalledWith([
      expect.objectContaining({ name: "notes.json", data: expect.any(String) }),
      expect.objectContaining({ name: "recordings/rec-1.webm", data: blob }),
    ]);
    const notes = JSON.parse(mocks.createZipBlob.mock.calls[0][0][0].data);
    expect(notes).toMatchObject({ version: 2, items: [expect.objectContaining({ id: "item-1" })] });
    expect(mocks.downloadBlobFile).toHaveBeenCalledWith(
      expect.any(Blob),
      "tempnotes-export-20260520-120000.zip"
    );
    expect(app.ui.showToast).toHaveBeenCalledWith("已导出 ZIP");
  });

  it("imports ZIP notes, recordings, recycle entries, and draft attachments", async () => {
    const attachment = {
      id: "rec-1",
      type: "audio",
      name: "Meeting",
      mimeType: "audio/webm",
      ext: "webm",
      size: 5,
      durationMs: 10,
      createdAt: 20,
    };
    const zipEntries = new Map([
      ["notes.json", { data: new Uint8Array([123, 125]) }],
      ["recordings/rec-1.webm", { data: new Uint8Array([1, 2, 3]) }],
    ]);
    mocks.readZipEntries.mockResolvedValue(zipEntries);
    mocks.decodeZipTextEntry.mockReturnValue(
      JSON.stringify({
        version: 2,
        draft: "imported draft",
        draftAttachments: [attachment],
        items: [{ id: "item-1", content: "Body", createdAt: 1, updatedAt: 2, attachments: [attachment] }],
        recycle: [{ id: "deleted", content: "Old", createdAt: 3, updatedAt: 4, deletedAt: 5 }],
      })
    );
    vi.stubGlobal("confirm", vi.fn(() => true));

    const app = createApp();
    await new ImportExportService(app).importZipFile(new Blob(["zip"]));

    expect(mocks.saveRecording).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "rec-1",
        mimeType: "audio/webm",
        durationMs: 10,
        createdAt: 20,
      })
    );
    expect(app.dom.setDraftValue).toHaveBeenCalledWith("imported draft");
    expect(app.currentDraftAttachments).toEqual([expect.objectContaining({ id: "rec-1" })]);
    expect(mocks.saveDraftAttachments).toHaveBeenCalledWith(app.currentDraftAttachments);
    expect(mocks.saveItems).toHaveBeenCalledWith([
      expect.objectContaining({ id: "item-1", tags: ["录音"] }),
    ]);
    expect(app.recycleService.deletedItems).toEqual([
      expect.objectContaining({ id: "deleted", deletedAt: 5 }),
    ]);
    expect(app.ui.showToast).toHaveBeenCalledWith("ZIP 导入完成：新增 1 条，回收站 1 条");
  });

  it("keeps legacy JSON imports working", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const app = createApp();

    await new ImportExportService(app).applyImportedData({
      version: 1,
      draft: "legacy draft",
      items: [{ id: "legacy", content: "Body", createdAt: 1, updatedAt: 2 }],
    });

    expect(app.dom.setDraftValue).not.toHaveBeenCalled();
    expect(mocks.saveItems).toHaveBeenCalledWith([
      expect.objectContaining({ id: "legacy", content: "Body" }),
    ]);
    expect(app.ui.showToast).toHaveBeenCalledWith("JSON 导入完成：新增 1 条，回收站 0 条");
  });
});
