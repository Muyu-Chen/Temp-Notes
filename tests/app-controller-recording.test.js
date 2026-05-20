import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteUnreferencedRecordings: vi.fn(() => Promise.resolve(0)),
  loadRecording: vi.fn(() => Promise.resolve(null)),
  loadDraftAttachments: vi.fn(() => Promise.resolve([])),
  saveDraftAttachments: vi.fn(() => Promise.resolve()),
  downloadBlobFile: vi.fn(),
  getRecordingExportFilename: vi.fn(() => "recording.webm"),
}));

vi.mock("../js/storage/recording-storage.js", () => ({
  deleteUnreferencedRecordings: mocks.deleteUnreferencedRecordings,
  loadRecording: mocks.loadRecording,
}));

vi.mock("../js/storage/draft-attachments-storage.js", () => ({
  loadDraftAttachments: mocks.loadDraftAttachments,
  saveDraftAttachments: mocks.saveDraftAttachments,
}));

vi.mock("../js/lib/download-utils.js", () => ({
  downloadBlobFile: mocks.downloadBlobFile,
  getRecordingExportFilename: mocks.getRecordingExportFilename,
}));

const { AppController } = await import("../js/app-controller.js");

const createRecordingController = ({
  startResult = { ok: true, message: "录音已开始" },
  stopResult = { id: "rec-1", type: "audio", name: "录音" },
  pauseResult = true,
  resumeResult = true,
} = {}) => {
  const controller = Object.create(AppController.prototype);
  controller.recordingUi = {
    active: false,
    paused: false,
    stopping: false,
    startedAt: 0,
    pausedAt: 0,
    pausedMs: 0,
    timerId: null,
  };
  controller.recordingDrag = null;
  controller.draftAttachmentPlayback = null;
  controller.playingDraftAttachmentId = null;
  controller.currentDraftAttachments = [];
  controller.currentLoadedItemId = null;
  controller.items = [];
  controller.recycleService = {
    addRecordingToRecycle: vi.fn(() => Promise.resolve()),
    getRecycleItems: vi.fn(() => []),
  };
  controller.recycleListView = {
    render: vi.fn(),
  };
  controller.dom = {
    getDraftValue: vi.fn(() => "draft body"),
    setRecordingLauncherDisabled: vi.fn(),
    setRecordingPanelVisible: vi.fn(),
    setRecordingPanelState: vi.fn(),
    setRecordingPanelPosition: vi.fn(),
    recordingFloatingPanel: {
      getBoundingClientRect: () => ({ left: 20, top: 30, width: 220, height: 100 }),
    },
    recordingDragHandle: {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    },
  };
  controller.ui = {
    showToast: vi.fn(),
  };
  controller.startRecording = vi.fn(() => Promise.resolve(startResult));
  controller.pauseRecording = vi.fn(() => pauseResult);
  controller.resumeRecording = vi.fn(() => resumeResult);
  controller.stopRecording = vi.fn(() => Promise.resolve(stopResult));
  controller.render = vi.fn();
  return controller;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AppController recording UI flow", () => {
  it("starts recording from the draft button and shows the floating panel", async () => {
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(1000);
    const controller = createRecordingController();

    const result = await controller.beginDraftRecording();

    expect(result).toEqual({ ok: true, message: "录音已开始" });
    expect(controller.startRecording).toHaveBeenCalled();
    expect(controller.dom.setRecordingLauncherDisabled).toHaveBeenCalledWith(true);
    expect(controller.dom.setRecordingPanelVisible).toHaveBeenCalledWith(true);
    expect(controller.recordingUi.active).toBe(true);

    dateNow.mockReturnValue(65000);
    controller.updateRecordingPanel();

    expect(controller.dom.setRecordingPanelState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        state: "recording",
        timer: "01:04",
        stopping: false,
      })
    );

    controller.resetRecordingUi();
  });

  it("restores the draft recording button when start fails", async () => {
    const controller = createRecordingController({
      startResult: { ok: false, message: "当前浏览器不支持录音" },
    });

    await controller.beginDraftRecording();

    expect(controller.dom.setRecordingPanelVisible).not.toHaveBeenCalled();
    expect(controller.dom.setRecordingLauncherDisabled).toHaveBeenNthCalledWith(1, true);
    expect(controller.dom.setRecordingLauncherDisabled).toHaveBeenNthCalledWith(2, false);
    expect(controller.ui.showToast).toHaveBeenCalledWith("当前浏览器不支持录音");
  });

  it("toggles pause and resume while preserving paused duration", () => {
    const dateNow = vi.spyOn(Date, "now");
    const controller = createRecordingController();
    controller.recordingUi = {
      active: true,
      paused: false,
      stopping: false,
      startedAt: 1000,
      pausedAt: 0,
      pausedMs: 0,
      timerId: null,
    };

    dateNow.mockReturnValue(4000);
    expect(controller.toggleDraftRecordingPause()).toBe(true);

    expect(controller.pauseRecording).toHaveBeenCalled();
    expect(controller.recordingUi.paused).toBe(true);
    expect(controller.recordingUi.pausedAt).toBe(4000);
    expect(controller.dom.setRecordingPanelState).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: "paused", timer: "00:03" })
    );

    dateNow.mockReturnValue(9000);
    expect(controller.toggleDraftRecordingPause()).toBe(true);

    expect(controller.resumeRecording).toHaveBeenCalled();
    expect(controller.recordingUi.paused).toBe(false);
    expect(controller.recordingUi.pausedAt).toBe(0);
    expect(controller.recordingUi.pausedMs).toBe(5000);
  });

  it("stops recording, saves the attachment, and restores the launcher", async () => {
    const attachment = { id: "rec-1", type: "audio", name: "会议录音" };
    const controller = createRecordingController({ stopResult: attachment });
    controller.recordingUi = {
      active: true,
      paused: false,
      stopping: false,
      startedAt: 1000,
      pausedAt: 0,
      pausedMs: 0,
      timerId: setInterval(() => {}, 500),
    };

    await expect(controller.finishDraftRecording()).resolves.toBe(attachment);

    expect(controller.stopRecording).toHaveBeenCalled();
    expect(controller.dom.setRecordingPanelVisible).toHaveBeenCalledWith(false);
    expect(controller.dom.setRecordingLauncherDisabled).toHaveBeenCalledWith(false);
    expect(controller.render).toHaveBeenCalled();
    expect(controller.ui.showToast).toHaveBeenCalledWith("录音已保存到当前草稿");
    expect(controller.recordingUi.active).toBe(false);
  });

  it("drags the floating recording panel inside the viewport", () => {
    const controller = createRecordingController();
    controller.recordingUi.active = true;
    const startEvent = {
      button: 0,
      pointerId: 7,
      clientX: 70,
      clientY: 95,
      preventDefault: vi.fn(),
    };

    controller.startRecordingPanelDrag(startEvent);
    controller.dragRecordingPanel({ pointerId: 7, clientX: 210, clientY: 230 });
    controller.endRecordingPanelDrag({ pointerId: 7 });

    expect(controller.dom.recordingDragHandle.setPointerCapture).toHaveBeenCalledWith(7);
    expect(controller.dom.setRecordingPanelPosition).toHaveBeenCalledWith(160, 165);
    expect(controller.dom.recordingDragHandle.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(controller.recordingDrag).toBeNull();
  });

  it("renames a draft recording attachment and persists metadata", async () => {
    const controller = createRecordingController();
    controller.currentDraftAttachments = [
      {
        id: "rec-1",
        type: "audio",
        name: "旧名称",
        mimeType: "audio/webm",
        ext: "webm",
        size: 10,
        durationMs: 20,
        createdAt: 30,
      },
    ];

    await controller.renameDraftAttachment("rec-1", "  新名称  ");

    expect(controller.currentDraftAttachments[0]).toMatchObject({ name: "新名称" });
    expect(mocks.saveDraftAttachments).toHaveBeenCalledWith(controller.currentDraftAttachments);
    expect(controller.render).toHaveBeenCalled();
  });

  it("plays a draft recording attachment and releases the previous object url", async () => {
    const audioInstances = [];
    const createObjectURL = vi.fn(() => "blob:rec-1");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal(
      "Audio",
      class {
        constructor(url) {
          this.url = url;
          this.paused = true;
          this.play = vi.fn(() => {
            this.paused = false;
            return Promise.resolve();
          });
          this.pause = vi.fn(() => {
            this.paused = true;
          });
          this.removeAttribute = vi.fn();
          this.load = vi.fn();
          audioInstances.push(this);
        }
      }
    );
    mocks.loadRecording.mockResolvedValue({
      id: "rec-1",
      blob: new Blob(["audio"], { type: "audio/webm" }),
    });

    const controller = createRecordingController();
    await controller.toggleDraftAttachmentPlayback("rec-1");

    expect(mocks.loadRecording).toHaveBeenCalledWith("rec-1");
    expect(createObjectURL).toHaveBeenCalled();
    expect(audioInstances[0].play).toHaveBeenCalled();
    expect(controller.playingDraftAttachmentId).toBe("rec-1");

    await controller.toggleDraftAttachmentPlayback("rec-1");

    expect(audioInstances[0].pause).toHaveBeenCalled();
    expect(controller.playingDraftAttachmentId).toBeNull();

    controller.stopDraftAttachmentPlayback("rec-1");

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:rec-1");
    expect(controller.draftAttachmentPlayback).toBeNull();
  });

  it("stops playback when deleting the active draft attachment", async () => {
    const audio = {
      pause: vi.fn(),
      removeAttribute: vi.fn(),
      load: vi.fn(),
    };
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { revokeObjectURL });

    const controller = createRecordingController();
    controller.currentDraftAttachments = [
      { id: "rec-1", type: "audio", mimeType: "audio/webm", createdAt: 30 },
    ];
    controller.draftAttachmentPlayback = { id: "rec-1", audio, url: "blob:rec-1" };
    controller.playingDraftAttachmentId = "rec-1";
    controller.cleanupUnreferencedRecordings = vi.fn(() => Promise.resolve());

    await controller.deleteDraftAttachment("rec-1");

    expect(audio.pause).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:rec-1");
    expect(controller.recycleService.addRecordingToRecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        attachment: expect.objectContaining({ id: "rec-1" }),
        sourceDraftContent: "draft body",
      })
    );
    expect(mocks.saveDraftAttachments).toHaveBeenCalledWith([]);
    expect(controller.cleanupUnreferencedRecordings).not.toHaveBeenCalled();
    expect(controller.playingDraftAttachmentId).toBeNull();
  });

  it("exports a draft recording attachment through the download helper", async () => {
    const blob = new Blob(["audio"], { type: "audio/webm" });
    mocks.loadRecording.mockResolvedValue({ id: "rec-1", blob });
    const controller = createRecordingController();
    controller.currentDraftAttachments = [
      { id: "rec-1", type: "audio", name: "Meeting", mimeType: "audio/webm", ext: "webm" },
    ];

    await controller.exportDraftAttachment("rec-1");

    expect(mocks.loadRecording).toHaveBeenCalledWith("rec-1");
    expect(mocks.getRecordingExportFilename).toHaveBeenCalledWith(
      expect.objectContaining({ id: "rec-1", name: "Meeting" })
    );
    expect(mocks.downloadBlobFile).toHaveBeenCalledWith(blob, "recording.webm");
    expect(controller.ui.showToast).toHaveBeenCalledWith("已导出录音");
  });

  it("shows a clear placeholder for draft recording transcription", () => {
    const controller = createRecordingController();

    controller.transcribeDraftAttachment("rec-1");

    expect(controller.ui.showToast).toHaveBeenCalledWith("转录功能待接入");
  });

  it("clears archive search and filter state together", () => {
    const controller = createRecordingController();
    controller.dom.setSearchValue = vi.fn();
    controller.dom.setFavoriteFilterEnabled = vi.fn();
    controller.dom.setActiveTagFilter = vi.fn();
    controller.dom.setArchiveFilterMenuOpen = vi.fn();

    controller.clearArchiveFilters();

    expect(controller.dom.setSearchValue).toHaveBeenCalledWith("");
    expect(controller.dom.setFavoriteFilterEnabled).toHaveBeenCalledWith(false);
    expect(controller.dom.setActiveTagFilter).toHaveBeenCalledWith("");
    expect(controller.dom.setArchiveFilterMenuOpen).toHaveBeenCalledWith(false);
    expect(controller.render).toHaveBeenCalled();
  });
});
