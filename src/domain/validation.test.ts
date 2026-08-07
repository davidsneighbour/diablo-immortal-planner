import { describe, expect, it } from "vitest";
import type { Character } from "./character.js";
import {
  emptyDefinitionSet,
  type GameDefinitionSet,
} from "./definition-set.js";
import type { Dependency } from "./dependency.js";
import { createId } from "./id.js";
import type { ResetRule } from "./reset-rule.js";
import type { Server } from "./server.js";
import type { Task } from "./task.js";
import { validateDefinitionSet } from "./validation.js";

function baseServer(): Server {
  return {
    id: createId("server", "sanctuary-1"),
    name: "Sanctuary 1",
    timezone: "Asia/Bangkok",
    dailyResetTime: "03:00",
    active: true,
  };
}

function baseSet(
  overrides: Partial<GameDefinitionSet> = {},
): GameDefinitionSet {
  return { ...emptyDefinitionSet(), servers: [baseServer()], ...overrides };
}

describe("validateDefinitionSet: unique IDs", () => {
  it("accepts an empty definition set", () => {
    expect(validateDefinitionSet(emptyDefinitionSet())).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects two servers sharing the same ID", () => {
    const server = baseServer();
    const result = validateDefinitionSet(
      baseSet({ servers: [server, server] }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "duplicate-id", path: server.id }),
    );
  });
});

describe("validateDefinitionSet: character limits", () => {
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

  it("allows exactly five non-archived characters on one server", () => {
    const server = baseServer();
    const characters = Array.from({ length: 5 }, (_, index) =>
      characterOn(server.id, `hero-${index}`),
    );
    const result = validateDefinitionSet(
      baseSet({ servers: [server], characters }),
    );
    expect(result.valid).toBe(true);
  });

  it("rejects a sixth non-archived character on one server", () => {
    const server = baseServer();
    const characters = Array.from({ length: 6 }, (_, index) =>
      characterOn(server.id, `hero-${index}`),
    );
    const result = validateDefinitionSet(
      baseSet({ servers: [server], characters }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "too-many-characters" }),
    );
  });

  it("does not count archived characters against the limit", () => {
    const server = baseServer();
    const characters = [
      ...Array.from({ length: 5 }, (_, index) =>
        characterOn(server.id, `hero-${index}`),
      ),
      characterOn(server.id, "retired-hero", "archived"),
    ];
    const result = validateDefinitionSet(
      baseSet({ servers: [server], characters }),
    );
    expect(result.valid).toBe(true);
  });
});

describe("validateDefinitionSet: references", () => {
  it("rejects a character referencing an unknown server", () => {
    const character: Character = {
      id: createId("character", "orphan"),
      serverId: createId("server", "does-not-exist"),
      name: "Orphan",
      className: "barbarian",
      level: 1,
      status: "active",
    };
    const result = validateDefinitionSet(baseSet({ characters: [character] }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "unknown-reference" }),
    );
  });

  it("rejects a task referencing an unknown activity", () => {
    const task: Task = {
      id: createId("task", "daily-bounties"),
      name: "Daily bounties",
      scope: "account",
      activityIds: [createId("activity", "does-not-exist")],
      completionModel: { kind: "boolean" },
      repeatable: true,
    };
    const result = validateDefinitionSet(baseSet({ tasks: [task] }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "unknown-reference", path: task.id }),
    );
  });
});

describe("validateDefinitionSet: reset rules", () => {
  function ruleWith(schedule: ResetRule["schedule"]): ResetRule {
    return {
      id: createId("reset-rule", "test-rule"),
      serverId: baseServer().id,
      schedule,
    };
  }

  it("rejects a fixed-period rule whose endsAt is not after startsAt", () => {
    const rule = ruleWith({
      kind: "fixed-period",
      startsAt: "2026-08-10T00:00:00Z",
      endsAt: "2026-08-01T00:00:00Z",
    });
    const result = validateDefinitionSet(baseSet({ resetRules: [rule] }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "invalid-reset-rule" }),
    );
  });

  it("rejects an out-of-range weekday", () => {
    const rule = ruleWith({ kind: "weekly", weekday: 7 });
    const result = validateDefinitionSet(baseSet({ resetRules: [rule] }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "invalid-reset-rule" }),
    );
  });

  it("accepts a valid every-game-day rule", () => {
    const rule = ruleWith({ kind: "every-game-day" });
    const result = validateDefinitionSet(baseSet({ resetRules: [rule] }));
    expect(result.valid).toBe(true);
  });
});

describe("validateDefinitionSet: dependency graph", () => {
  function taskStub(slug: string): Task {
    return {
      id: createId("task", slug),
      name: slug,
      scope: "account",
      activityIds: [],
      completionModel: { kind: "boolean" },
      repeatable: false,
    };
  }

  it("accepts a linear chain of dependencies", () => {
    const a = taskStub("quest-a");
    const b = taskStub("quest-b");
    const c = taskStub("quest-c");
    const dependencies: Dependency[] = [
      {
        id: createId("dependency", "a-unlocks-b"),
        kind: "unlocks",
        fromTaskId: a.id,
        toTaskId: b.id,
      },
      {
        id: createId("dependency", "b-unlocks-c"),
        kind: "unlocks",
        fromTaskId: b.id,
        toTaskId: c.id,
      },
    ];
    const result = validateDefinitionSet(
      baseSet({ tasks: [a, b, c], dependencies }),
    );
    expect(result.valid).toBe(true);
  });

  it("rejects a cycle between two tasks", () => {
    const a = taskStub("quest-a");
    const b = taskStub("quest-b");
    const dependencies: Dependency[] = [
      {
        id: createId("dependency", "a-requires-b"),
        kind: "requires",
        fromTaskId: a.id,
        toTaskId: b.id,
      },
      {
        id: createId("dependency", "b-requires-a"),
        kind: "requires",
        fromTaskId: b.id,
        toTaskId: a.id,
      },
    ];
    const result = validateDefinitionSet(
      baseSet({ tasks: [a, b], dependencies }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "circular-dependency" }),
    );
  });

  it("rejects a longer cycle spanning three tasks", () => {
    const a = taskStub("quest-a");
    const b = taskStub("quest-b");
    const c = taskStub("quest-c");
    const dependencies: Dependency[] = [
      {
        id: createId("dependency", "a-to-b"),
        kind: "progresses",
        fromTaskId: a.id,
        toTaskId: b.id,
      },
      {
        id: createId("dependency", "b-to-c"),
        kind: "progresses",
        fromTaskId: b.id,
        toTaskId: c.id,
      },
      {
        id: createId("dependency", "c-to-a"),
        kind: "progresses",
        fromTaskId: c.id,
        toTaskId: a.id,
      },
    ];
    const result = validateDefinitionSet(
      baseSet({ tasks: [a, b, c], dependencies }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "circular-dependency" }),
    );
  });
});
