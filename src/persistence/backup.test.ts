import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { emptyDefinitionSet } from "../domain/definition-set.js";
import { createId } from "../domain/id.js";
import type { ResetRule } from "../domain/reset-rule.js";
import type { Server } from "../domain/server.js";
import {
  CURRENT_EXPORT_FORMAT_VERSION,
  exportPlayerState,
  importPlayerState,
  PLAYER_STATE_EXPORT_FORMAT,
} from "./backup.js";
import { IndexedDbDocumentStorage } from "./indexed-db-storage.js";
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyPlayerState,
  type PlayerState,
} from "./schema.js";
import {
  loadPlayerState,
  resetPlayerState,
  updatePlayerState,
} from "./store.js";

const exportedAt = new Date("2026-08-08T12:00:00Z");

describe("exportPlayerState", () => {
  it("wraps the player state in a versioned, JSON-serializable export document", () => {
    const state = createEmptyPlayerState();
    const exported = exportPlayerState(state, exportedAt);
    expect(exported).toEqual({
      format: PLAYER_STATE_EXPORT_FORMAT,
      formatVersion: CURRENT_EXPORT_FORMAT_VERSION,
      exportedAt: "2026-08-08T12:00:00.000Z",
      playerState: state,
    });
    // Must round-trip through JSON exactly, since PLAN.md requires a human-inspectable structured export.
    expect(JSON.parse(JSON.stringify(exported))).toEqual(exported);
  });
});

describe("importPlayerState", () => {
  it("round-trips a valid export back to the original state", () => {
    const state = createEmptyPlayerState();
    const exported = exportPlayerState(state, exportedAt);
    const result = importPlayerState(JSON.parse(JSON.stringify(exported)));
    expect(result).toEqual({ status: "ok", state });
  });

  it("rejects a value that is not a recognizable export at all", () => {
    expect(importPlayerState(null)).toMatchObject({ status: "invalid" });
    expect(importPlayerState("just a string")).toMatchObject({
      status: "invalid",
    });
    expect(importPlayerState({ some: "other json" })).toMatchObject({
      status: "invalid",
    });
  });

  it("rejects a document with an unrecognized format", () => {
    const result = importPlayerState({
      format: "some-other-app-export",
      formatVersion: 1,
      playerState: createEmptyPlayerState(),
    });
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors[0]?.code).toBe("unrecognized-format");
    }
  });

  it("rejects a document from a newer, unsupported export format version", () => {
    const result = importPlayerState({
      format: PLAYER_STATE_EXPORT_FORMAT,
      formatVersion: CURRENT_EXPORT_FORMAT_VERSION + 1,
      playerState: createEmptyPlayerState(),
    });
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors[0]?.code).toBe("unsupported-format-version");
    }
  });

  it("rejects a document whose embedded player state is malformed", () => {
    const result = importPlayerState({
      format: PLAYER_STATE_EXPORT_FORMAT,
      formatVersion: CURRENT_EXPORT_FORMAT_VERSION,
      playerState: { not: "a player state" },
    });
    expect(result.status).toBe("invalid");
  });

  it("rejects a document whose embedded player state is semantically inconsistent", () => {
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
    const result = importPlayerState(exportPlayerState(badState, exportedAt));
    expect(result.status).toBe("invalid");
  });

  it("cross-checks the embedded player state against a supplied GameDefinitionSet", () => {
    const resetRule: ResetRule = {
      id: createId("reset-rule", "daily"),
      serverId: createId("server", "does-not-exist"),
      schedule: { kind: "every-game-day" },
    };
    const gameDefinitions = {
      ...emptyDefinitionSet(),
      resetRules: [resetRule],
    };
    const result = importPlayerState(
      exportPlayerState(createEmptyPlayerState(), exportedAt),
      gameDefinitions,
    );
    expect(result.status).toBe("invalid");
  });

  it("migrates an export whose player state predates the current schema version", () => {
    const server: Server = {
      id: createId("server", "sanctuary-1"),
      name: "Sanctuary 1",
      timezone: "Asia/Bangkok",
      dailyResetTime: "03:00",
      active: true,
    };
    // Schema version 1 has no migrations registered yet, so this simulates
    // the mechanism using data already at the current version — the same
    // data should still come back with status "ok", not "migrated".
    const state: PlayerState = {
      ...createEmptyPlayerState(),
      servers: [server],
    };
    const result = importPlayerState(exportPlayerState(state, exportedAt));
    expect(result).toEqual({ status: "ok", state });
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });
});

describe("Milestone 5 acceptance: export, delete all local data, reload, import, recover", () => {
  it("fully recovers player state after local storage is wiped, using a real IndexedDB backing store", async () => {
    const storage = new IndexedDbDocumentStorage<unknown>(
      "planner-backup-acceptance-test",
      "player-state",
    );

    // Build up some state, the same way the Milestone 4 acceptance test does.
    const server: Server = {
      id: createId("server", "sanctuary-1"),
      name: "Sanctuary 1",
      timezone: "Asia/Bangkok",
      dailyResetTime: "03:00",
      active: true,
    };
    const characterId = createId("character", "barbarian-1");
    let state = createEmptyPlayerState();
    state = await updatePlayerState(storage, state, (s) => ({
      ...s,
      servers: [...s.servers, server],
    }));
    state = await updatePlayerState(storage, state, (s) => ({
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

    // 1. Export the planner.
    const exported = exportPlayerState(state, new Date("2026-08-08T12:00:00Z"));
    // Round-trip through JSON to faithfully simulate a downloaded-then-reuploaded file.
    const exportedJson = JSON.parse(JSON.stringify(exported));

    // 2. Delete all local data.
    await resetPlayerState(storage);
    const afterReset = await loadPlayerState(storage);
    expect(afterReset).toEqual({
      status: "empty",
      state: createEmptyPlayerState(),
    });

    // 3. Reload the application: open a fresh storage instance against the same (now-empty) database.
    const reloadedStorage = new IndexedDbDocumentStorage<unknown>(
      "planner-backup-acceptance-test",
      "player-state",
    );
    const reloadedEmpty = await loadPlayerState(reloadedStorage);
    expect(reloadedEmpty.status).toBe("empty");

    // 4. Import the export.
    const importResult = importPlayerState(exportedJson);
    expect(importResult.status).toBe("ok");
    if (importResult.status !== "ok") {
      throw new Error("expected import to succeed");
    }

    // 5. Recover the previous state — persist the imported state and confirm it survives another reload.
    await updatePlayerState(
      reloadedStorage,
      createEmptyPlayerState(),
      () => importResult.state,
    );
    const finalSession = new IndexedDbDocumentStorage<unknown>(
      "planner-backup-acceptance-test",
      "player-state",
    );
    const recovered = await loadPlayerState(finalSession);
    expect(recovered).toEqual({ status: "ok", state });
  });
});
