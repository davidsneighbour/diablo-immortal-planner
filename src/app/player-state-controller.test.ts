import { describe, expect, it, vi } from "vitest";
import { createId } from "../domain/id.js";
import { createEmptyPlayerState } from "../persistence/schema.js";
import { InMemoryDocumentStorage } from "../persistence/storage.js";
import { PlayerStateController } from "./player-state-controller.js";

describe("PlayerStateController", () => {
  it('starts in "loading" status before initialize() resolves', () => {
    const controller = new PlayerStateController(new InMemoryDocumentStorage());
    expect(controller.getSnapshot().status).toBe("loading");
  });

  it("initialize() loads an empty state from empty storage", async () => {
    const controller = new PlayerStateController(new InMemoryDocumentStorage());
    await controller.initialize();
    expect(controller.getSnapshot()).toEqual({
      status: "ready",
      state: createEmptyPlayerState(),
    });
  });

  it("initialize() surfaces invalid stored data rather than throwing", async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    await storage.save({ not: "a player state" });
    const controller = new PlayerStateController(storage);
    await controller.initialize();
    expect(controller.getSnapshot().status).toBe("invalid");
  });

  it("update() applies a transformation and persists it", async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    const controller = new PlayerStateController(storage);
    await controller.initialize();

    const serverId = createId("server", "sanctuary-1");
    await controller.update((state) => ({
      ...state,
      servers: [
        ...state.servers,
        {
          id: serverId,
          name: "Sanctuary 1",
          timezone: "Asia/Bangkok",
          dailyResetTime: "03:00",
          active: true,
        },
      ],
    }));

    expect(controller.getSnapshot().state.servers).toHaveLength(1);
    // Persisted, not just held in memory.
    const persisted = await storage.load();
    expect((persisted as { servers: unknown[] }).servers).toHaveLength(1);
  });

  it("notifies subscribers on every state change", async () => {
    const controller = new PlayerStateController(new InMemoryDocumentStorage());
    const listener = vi.fn();
    controller.subscribe(listener);

    await controller.initialize();
    expect(listener).toHaveBeenCalledTimes(1);

    await controller.update((state) => state);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe stops further notifications", async () => {
    const controller = new PlayerStateController(new InMemoryDocumentStorage());
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    unsubscribe();

    await controller.initialize();
    expect(listener).not.toHaveBeenCalled();
  });

  it("initialize() seeds empty storage from initialSeed, and persists it", async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    const seed = {
      ...createEmptyPlayerState(),
      servers: [
        {
          id: createId("server", "sanctuary-1"),
          name: "Sanctuary 1",
          timezone: "Asia/Bangkok",
          dailyResetTime: "03:00",
          active: true,
        },
      ],
    };
    const controller = new PlayerStateController(storage, undefined, seed);
    await controller.initialize();

    expect(controller.getSnapshot()).toEqual({ status: "ready", state: seed });
    const persisted = await storage.load();
    expect((persisted as { servers: unknown[] }).servers).toHaveLength(1);
  });

  it("initialize() ignores initialSeed once storage already holds data", async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    await storage.save(createEmptyPlayerState());
    const seed = {
      ...createEmptyPlayerState(),
      servers: [
        {
          id: createId("server", "sanctuary-1"),
          name: "Sanctuary 1",
          timezone: "Asia/Bangkok",
          dailyResetTime: "03:00",
          active: true,
        },
      ],
    };
    const controller = new PlayerStateController(storage, undefined, seed);
    await controller.initialize();

    expect(controller.getSnapshot()).toEqual({
      status: "ready",
      state: createEmptyPlayerState(),
    });
  });

  it("reset() clears storage and returns to an empty state", async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    const controller = new PlayerStateController(storage);
    await controller.initialize();
    await controller.update((state) => ({
      ...state,
      servers: [
        {
          id: createId("server", "sanctuary-1"),
          name: "Sanctuary 1",
          timezone: "Asia/Bangkok",
          dailyResetTime: "03:00",
          active: true,
        },
      ],
    }));

    await controller.reset();
    expect(controller.getSnapshot()).toEqual({
      status: "ready",
      state: createEmptyPlayerState(),
    });
    expect(await storage.load()).toBeNull();
  });
});
