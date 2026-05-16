import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadRecycleItems: vi.fn(() => Promise.resolve([])),
  saveRecycleItems: vi.fn(() => Promise.resolve()),
}));

vi.mock("../js/storage/recycle-storage.js", () => ({
  loadRecycleItems: mocks.loadRecycleItems,
  saveRecycleItems: mocks.saveRecycleItems,
}));

const { RecycleService } = await import("../js/services/recycle-service.js");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  mocks.loadRecycleItems.mockResolvedValue([]);
});

describe("RecycleService", () => {
  it("loads recycle items only once", async () => {
    const deletedItems = [{ id: "deleted", content: "removed" }];
    mocks.loadRecycleItems.mockResolvedValue(deletedItems);
    const service = new RecycleService();

    await service.init();
    await service.init();

    expect(mocks.loadRecycleItems).toHaveBeenCalledTimes(1);
    expect(service.getRecycleItems()).toBe(deletedItems);
  });

  it("prepends deleted items and persists recycle state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(5000);
    const service = new RecycleService();
    service.deletedItems = [{ id: "older", content: "older", deletedAt: 1000 }];

    await service.addToRecycle({ id: "newer", content: "newer", updatedAt: 2000 });

    expect(service.getRecycleItems()).toEqual([
      { id: "newer", content: "newer", updatedAt: 2000, deletedAt: 5000 },
      { id: "older", content: "older", deletedAt: 1000 },
    ]);
    expect(mocks.saveRecycleItems).toHaveBeenCalledWith(service.deletedItems);
  });

  it("deletes valid recycle items and ignores invalid indexes", async () => {
    const service = new RecycleService();
    service.deletedItems = [{ id: "a" }, { id: "b" }];

    await service.deleteFromRecycle(1);
    await service.deleteFromRecycle(5);

    expect(service.getRecycleItems()).toEqual([{ id: "a" }]);
    expect(mocks.saveRecycleItems).toHaveBeenCalledTimes(1);
  });

  it("restores valid recycle items and returns null for invalid indexes", async () => {
    const service = new RecycleService();
    service.deletedItems = [{ id: "a" }, { id: "b" }];

    await expect(service.restoreItem(0)).resolves.toEqual({ id: "a" });
    await expect(service.restoreItem(5)).resolves.toBeNull();

    expect(service.getRecycleItems()).toEqual([{ id: "b" }]);
    expect(mocks.saveRecycleItems).toHaveBeenCalledTimes(1);
  });

  it("clears recycle items and persists the empty state", async () => {
    const service = new RecycleService();
    service.deletedItems = [{ id: "a" }, { id: "b" }];

    await service.clearRecycle();

    expect(service.getRecycleItems()).toEqual([]);
    expect(mocks.saveRecycleItems).toHaveBeenCalledWith([]);
  });
});
