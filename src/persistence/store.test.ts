import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createId } from "../domain/id.js";
import type { Server } from "../domain/server.js";
import { IndexedDbDocumentStorage } from "./indexed-db-storage.js";
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyPlayerState,
  type PlayerState,
} from "./schema.js";
import { InMemoryDocumentStorage } from "./storage.js";
import {
  loadPlayerState,
  resetPlayerState,
  savePlayerState,
  updatePlayerState,
} from "./store.js";

describe("loadPlayerState", () => {
  it('returns "empty" when nothing has been saved yet', async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    const result = await loadPlayerState(storage);
    expect(result).toEqual({
      status: "empty",
      state: createEmptyPlayerState(),
    });
  });

  it('returns "ok" for valid data already at the current schema version', async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    const state = createEmptyPlayerState();
    await storage.save(state);
    const result = await loadPlayerState(storage);
    expect(result).toEqual({ status: "ok", state });
  });

  it('returns "invalid" with diagnostic errors for malformed stored data, rather than throwing', async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    await storage.save({ not: "a player state" });
    const result = await loadPlayerState(storage);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('returns "invalid" for data newer than this app supports, rather than guessing', async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    await storage.save({
      ...createEmptyPlayerState(),
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    });
    const result = await loadPlayerState(storage);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors[0]?.message).toMatch(/newer than this app supports/);
    }
  });

  it('returns "invalid" for semantically inconsistent data (e.g. a dangling reference)', async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    const badState: PlayerState = {
      ...createEmptyPlayerState(),
      characters: [
        {
          id: createId("character", "orphan"),
          serverId: createId("server", "does-not-exist"),
          name: "Orphan",
          className: "barbarian",
          level: 1,
          status: "active",
        },
      ],
    };
    await storage.save(badState);
    const result = await loadPlayerState(storage);
    expect(result.status).toBe("invalid");
  });
});

describe("resetPlayerState", () => {
  it("clears storage and returns a fresh empty state", async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    await storage.save(createEmptyPlayerState());
    const reset = await resetPlayerState(storage);
    expect(reset).toEqual(createEmptyPlayerState());
    expect(await storage.load()).toBeNull();
  });
});

describe("Milestone 4 acceptance: add servers/characters, record progress, reload, retain state", () => {
  it("retains all state across a simulated reload using real IndexedDB", async () => {
    const databaseName = "planner-acceptance-test";
    const storeName = "player-state";

    // --- Session 1: fresh install ---
    const firstSession = new IndexedDbDocumentStorage<unknown>(
      databaseName,
      storeName,
    );
    const initialLoad = await loadPlayerState(firstSession);
    if (initialLoad.status !== "empty") {
      throw new Error(
        `expected an empty initial load, got status "${initialLoad.status}"`,
      );
    }
    let state = initialLoad.state;

    // 1. Add a server.
    const server: Server = {
      id: createId("server", "sanctuary-1"),
      name: "Sanctuary 1",
      timezone: "Asia/Bangkok",
      dailyResetTime: "03:00",
      active: true,
    };
    state = await updatePlayerState(firstSession, state, (s) => ({
      ...s,
      servers: [...s.servers, server],
    }));

    // 2. Add a character.
    const characterId = createId("character", "barbarian-1");
    state = await updatePlayerState(firstSession, state, (s) => ({
      ...s,
      characters: [
        ...s.characters,
        {
          id: characterId,
          serverId: server.id,
          name: "Conan",
          className: "barbarian",
          level: 60,
          status: "active",
        },
      ],
    }));

    // 3. Record progress on a task instance.
    const taskInstanceId = createId(
      "task-instance",
      "daily-bounties-2026-08-08",
    );
    state = await updatePlayerState(firstSession, state, (s) => ({
      ...s,
      taskInstances: [
        ...s.taskInstances,
        {
          id: taskInstanceId,
          taskId: createId("task", "daily-bounties"),
          scope: { type: "character", characterId },
          periodKey: "2026-08-08",
          progress: { kind: "counter", current: 2, target: 3 },
          createdAt: "2026-08-08T03:00:00+07:00",
        },
      ],
    }));

    // 4. "Reload the browser": open a brand-new storage instance against the same database.
    const secondSession = new IndexedDbDocumentStorage<unknown>(
      databaseName,
      storeName,
    );
    const reloadedResult = await loadPlayerState(secondSession);

    // 5. Retain all state.
    if (reloadedResult.status !== "ok") {
      throw new Error(
        `expected the reload to succeed, got status "${reloadedResult.status}"`,
      );
    }
    expect(reloadedResult.state.servers).toEqual([server]);
    expect(reloadedResult.state.characters).toHaveLength(1);
    expect(reloadedResult.state.characters[0]?.id).toBe(characterId);
    expect(reloadedResult.state.taskInstances).toHaveLength(1);
    expect(reloadedResult.state.taskInstances[0]?.progress).toEqual({
      kind: "counter",
      current: 2,
      target: 3,
    });
  });
});

describe("savePlayerState", () => {
  it("persists the exact state passed in", async () => {
    const storage = new InMemoryDocumentStorage<unknown>();
    const state = createEmptyPlayerState();
    await savePlayerState(storage, state);
    expect(await storage.load()).toEqual(state);
  });
});
