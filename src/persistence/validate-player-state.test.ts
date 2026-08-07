import { describe, expect, it } from "vitest";
import type { Character } from "../domain/character.js";
import { emptyDefinitionSet } from "../domain/definition-set.js";
import { createId } from "../domain/id.js";
import type { ResetRule } from "../domain/reset-rule.js";
import type { Server } from "../domain/server.js";
import type { Task } from "../domain/task.js";
import type { TaskInstance } from "../domain/task-instance.js";
import { createEmptyPlayerState, type PlayerState } from "./schema.js";
import {
  isPlayerStateShape,
  validatePlayerState,
} from "./validate-player-state.js";

const server: Server = {
  id: createId("server", "sanctuary-1"),
  name: "Sanctuary 1",
  timezone: "Asia/Bangkok",
  dailyResetTime: "03:00",
  active: true,
};

describe("isPlayerStateShape", () => {
  it("accepts a well-formed empty player state", () => {
    expect(isPlayerStateShape(createEmptyPlayerState())).toBe(true);
  });

  it("rejects null, non-objects, and objects missing required arrays", () => {
    expect(isPlayerStateShape(null)).toBe(false);
    expect(isPlayerStateShape("not an object")).toBe(false);
    expect(isPlayerStateShape({ schemaVersion: 1 })).toBe(false);
    expect(
      isPlayerStateShape({
        ...createEmptyPlayerState(),
        servers: "not-an-array",
      }),
    ).toBe(false);
  });
});

function characterOn(
  serverId: Server["id"],
  slug: string,
  status: Character["status"] = "active",
): Character {
  return {
    id: createId("character", slug),
    serverId,
    name: slug,
    className: "barbarian",
    level: 1,
    status,
  };
}

describe("validatePlayerState", () => {
  it("accepts an empty player state", () => {
    expect(validatePlayerState(createEmptyPlayerState())).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects duplicate server ids", () => {
    const state: PlayerState = {
      ...createEmptyPlayerState(),
      servers: [server, server],
    };
    const result = validatePlayerState(state);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "duplicate-id" }),
    );
  });

  it("rejects a character referencing an unknown server", () => {
    const character = characterOn(
      createId("server", "does-not-exist"),
      "orphan",
    );
    const state: PlayerState = {
      ...createEmptyPlayerState(),
      characters: [character],
    };
    const result = validatePlayerState(state);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "unknown-reference" }),
    );
  });

  it("allows exactly five non-archived characters on one server, and rejects a sixth", () => {
    const five = Array.from({ length: 5 }, (_, index) =>
      characterOn(server.id, `hero-${index}`),
    );
    const okState: PlayerState = {
      ...createEmptyPlayerState(),
      servers: [server],
      characters: five,
    };
    expect(validatePlayerState(okState).valid).toBe(true);

    const six = [...five, characterOn(server.id, "hero-5")];
    const tooManyState: PlayerState = {
      ...createEmptyPlayerState(),
      servers: [server],
      characters: six,
    };
    const result = validatePlayerState(tooManyState);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "too-many-characters" }),
    );
  });

  it("does not count archived characters against the limit", () => {
    const five = Array.from({ length: 5 }, (_, index) =>
      characterOn(server.id, `hero-${index}`),
    );
    const characters = [...five, characterOn(server.id, "retired", "archived")];
    const state: PlayerState = {
      ...createEmptyPlayerState(),
      servers: [server],
      characters,
    };
    expect(validatePlayerState(state).valid).toBe(true);
  });

  it("rejects a task instance whose scope references an unknown character", () => {
    const instance: TaskInstance = {
      id: createId("task-instance", "bounties-orphan"),
      taskId: createId("task", "bounties"),
      scope: {
        type: "character",
        characterId: createId("character", "does-not-exist"),
      },
      periodKey: "lifetime",
      progress: { kind: "boolean", complete: false },
      createdAt: "2026-08-01T00:00:00Z",
    };
    const state: PlayerState = {
      ...createEmptyPlayerState(),
      taskInstances: [instance],
    };
    const result = validatePlayerState(state);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "unknown-reference", path: instance.id }),
    );
  });

  it("cross-checks task instances against a supplied GameDefinitionSet", () => {
    const task: Task = {
      id: createId("task", "bounties"),
      name: "Bounties",
      scope: "account",
      activityIds: [],
      completionModel: { kind: "boolean" },
      repeatable: true,
    };
    const knownInstance: TaskInstance = {
      id: createId("task-instance", "bounties-lifetime"),
      taskId: task.id,
      scope: { type: "account" },
      periodKey: "lifetime",
      progress: { kind: "boolean", complete: false },
      createdAt: "2026-08-01T00:00:00Z",
    };
    const unknownInstance: TaskInstance = {
      id: createId("task-instance", "ghost-task"),
      taskId: createId("task", "ghost"),
      scope: { type: "account" },
      periodKey: "lifetime",
      progress: { kind: "boolean", complete: false },
      createdAt: "2026-08-01T00:00:00Z",
    };
    const state: PlayerState = {
      ...createEmptyPlayerState(),
      taskInstances: [knownInstance, unknownInstance],
    };
    const gameDefinitions = { ...emptyDefinitionSet(), tasks: [task] };

    const result = validatePlayerState(state, gameDefinitions);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "unknown-reference",
        path: unknownInstance.id,
      }),
    );
    expect(result.errors).not.toContainEqual(
      expect.objectContaining({
        code: "unknown-reference",
        path: knownInstance.id,
      }),
    );
  });

  it("cross-checks reset rule serverId against player-configured servers", () => {
    const resetRule: ResetRule = {
      id: createId("reset-rule", "daily"),
      serverId: createId("server", "does-not-exist"),
      schedule: { kind: "every-game-day" },
    };
    const gameDefinitions = {
      ...emptyDefinitionSet(),
      resetRules: [resetRule],
    };
    const result = validatePlayerState(
      createEmptyPlayerState(),
      gameDefinitions,
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "unknown-reference",
        path: resetRule.id,
      }),
    );
  });
});
