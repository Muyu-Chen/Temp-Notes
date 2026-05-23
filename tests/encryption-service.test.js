import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearDraftItemId: vi.fn(() => Promise.resolve()),
  saveItem: vi.fn(() => Promise.resolve()),
  encryptContent: vi.fn(() => "ciphertext"),
  decryptContent: vi.fn(),
  verifyPassword: vi.fn(),
  now: vi.fn(() => 3000),
}));

vi.mock("../js/storage/draft-storage.js", () => ({
  clearDraftItemId: mocks.clearDraftItemId,
}));

vi.mock("../js/storage/item-storage.js", () => ({
  saveItem: mocks.saveItem,
}));

vi.mock("../js/crypto.js", () => ({
  encryptContent: mocks.encryptContent,
  decryptContent: mocks.decryptContent,
  verifyPassword: mocks.verifyPassword,
}));

vi.mock("../js/lib/time-utils.js", () => ({
  now: mocks.now,
}));

const { EncryptionService } = await import("../js/services/encryption-service.js");

const createApp = (item) => ({
  items: [item],
  currentLoadedItemId: null,
  modal: {
    show: vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, values: ["Secret", "", "hint"] }),
  },
  ui: {
    showToast: vi.fn(),
  },
  render: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EncryptionService", () => {
  it("warns that recording attachments remain local plaintext when encrypting", async () => {
    const app = createApp({
      id: "item-1",
      content: "Secret body",
      tags: ["work"],
      attachments: [{ id: "rec-1", type: "audio", mimeType: "audio/webm", createdAt: 1 }],
      createdAt: 1000,
      updatedAt: 1000,
    });
    const service = new EncryptionService(app);

    await service.encryptItem("item-1");

    expect(app.modal.show).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        title: "加密范围提示",
        message: expect.stringContaining("录音仍是本地明文文件"),
      })
    );
    expect(app.items[0]).toMatchObject({
      content: "ciphertext",
      encrypted: true,
      encryptedTitle: "Secret",
      updatedAt: 3000,
    });
    expect(mocks.saveItem).toHaveBeenCalledWith(app.items[0]);
  });
});
