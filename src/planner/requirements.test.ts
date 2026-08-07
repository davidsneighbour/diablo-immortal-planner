import { describe, expect, it } from "vitest";
import type { Character } from "../domain/character.js";
import type { Event, EventPhase } from "../domain/event.js";
import { createId } from "../domain/id.js";
import type { ProgressionState } from "../domain/progression.js";
import type { Requirement } from "../domain/requirement.js";
import type { Scope } from "../domain/scope.js";
import type { Server } from "../domain/server.js";
import type { Task } from "../domain/task.js";
import type { TaskInstance } from "../domain/task-instance.js";
import {
  areRequirementsSatisfied,
  isRequirementSatisfied,
  type RequirementContext,
} from "./requirements.js";

const server: Server = {
  id: createId("server", "sanctuary-1"),
  name: "Sanctuary 1",
  timezone: "Asia/Bangkok",
  dailyResetTime: "03:00",
  active: true,
};

const character: Character = {
  id: createId("character", "barbarian-1"),
  serverId: server.id,
  name: "Conan",
  className: "barbarian",
  level: 45,
  status: "active",
};

const characterScope: Scope = { type: "character", characterId: character.id };

function baseContext(
  overrides: Partial<RequirementContext> = {},
): RequirementContext {
  return {
    instant: new Date("2026-08-10T10:00:00Z"),
    scope: characterScope,
    character,
    server,
    events: new Map(),
    eventPhases: new Map(),
    tasks: new Map(),
    taskInstances: [],
    progressionStates: [],
    ...overrides,
  };
}

function withoutCharacter(context: RequirementContext): RequirementContext {
  const { character: _character, ...rest } = context;
  return rest;
}

describe("character-level", () => {
  it("is satisfied once the character meets minLevel", () => {
    const requirement: Requirement = { type: "character-level", minLevel: 40 };
    expect(isRequirementSatisfied(requirement, baseContext())).toBe(true);
    expect(
      isRequirementSatisfied(
        { type: "character-level", minLevel: 50 },
        baseContext(),
      ),
    ).toBe(false);
  });

  it("throws without a character in context", () => {
    expect(() =>
      isRequirementSatisfied(
        { type: "character-level", minLevel: 1 },
        withoutCharacter(baseContext()),
      ),
    ).toThrow(/requires a character/);
  });
});

describe("progression-level", () => {
  const systemId = createId("progression-system", "paragon");

  it("is satisfied once a matching ProgressionState reaches minLevel", () => {
    const states: ProgressionState[] = [
      {
        systemId,
        scope: characterScope,
        currentLevel: 120,
        updatedAt: "2026-08-01T00:00:00Z",
      },
    ];
    expect(
      isRequirementSatisfied(
        { type: "progression-level", systemId, minLevel: 100 },
        baseContext({ progressionStates: states }),
      ),
    ).toBe(true);
  });

  it("treats a missing ProgressionState as level 0", () => {
    expect(
      isRequirementSatisfied(
        { type: "progression-level", systemId, minLevel: 1 },
        baseContext(),
      ),
    ).toBe(false);
  });
});

describe("prerequisite-task", () => {
  const prerequisiteTaskId = createId("task", "chapter-1");
  const prerequisiteTask: Task = {
    id: prerequisiteTaskId,
    name: "Chapter 1",
    scope: "character",
    activityIds: [],
    completionModel: { kind: "boolean" },
    repeatable: false,
  };

  it("is unsatisfied when no instance exists yet for this scope", () => {
    const requirement: Requirement = {
      type: "prerequisite-task",
      taskId: prerequisiteTaskId,
    };
    expect(
      isRequirementSatisfied(
        requirement,
        baseContext({
          tasks: new Map([[prerequisiteTaskId, prerequisiteTask]]),
        }),
      ),
    ).toBe(false);
  });

  it("is satisfied once the referenced task's instance is complete for the same scope", () => {
    const instance: TaskInstance = {
      id: createId("task-instance", "chapter-1-barbarian-1"),
      taskId: prerequisiteTaskId,
      scope: characterScope,
      periodKey: "lifetime",
      progress: { kind: "boolean", complete: true },
      createdAt: "2026-08-01T00:00:00Z",
    };
    const requirement: Requirement = {
      type: "prerequisite-task",
      taskId: prerequisiteTaskId,
    };
    expect(
      isRequirementSatisfied(
        requirement,
        baseContext({
          tasks: new Map([[prerequisiteTaskId, prerequisiteTask]]),
          taskInstances: [instance],
        }),
      ),
    ).toBe(true);
  });

  it("does not count another character's completion for this character's scope", () => {
    const otherCharacterId = createId("character", "necromancer-1");
    const instance: TaskInstance = {
      id: createId("task-instance", "chapter-1-necromancer-1"),
      taskId: prerequisiteTaskId,
      scope: { type: "character", characterId: otherCharacterId },
      periodKey: "lifetime",
      progress: { kind: "boolean", complete: true },
      createdAt: "2026-08-01T00:00:00Z",
    };
    const requirement: Requirement = {
      type: "prerequisite-task",
      taskId: prerequisiteTaskId,
    };
    expect(
      isRequirementSatisfied(
        requirement,
        baseContext({
          tasks: new Map([[prerequisiteTaskId, prerequisiteTask]]),
          taskInstances: [instance],
        }),
      ),
    ).toBe(false);
  });
});

describe("active-event / event-phase", () => {
  const event: Event = {
    id: createId("event", "shadow-invasion"),
    name: "Shadow Invasion",
    startsAt: "2026-08-10T00:00:00Z",
    endsAt: "2026-08-17T00:00:00Z",
    hasPhases: true,
  };
  const phase: EventPhase = {
    id: createId("event-phase", "phase-1"),
    eventId: event.id,
    name: "Phase 1",
    startsAt: "2026-08-10T00:00:00Z",
    endsAt: "2026-08-13T00:00:00Z",
    order: 1,
  };

  it("active-event reflects whether the event is currently active", () => {
    const requirement: Requirement = {
      type: "active-event",
      eventId: event.id,
    };
    const context = baseContext({ events: new Map([[event.id, event]]) });
    expect(isRequirementSatisfied(requirement, context)).toBe(true);
    expect(
      isRequirementSatisfied(requirement, {
        ...context,
        instant: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toBe(false);
  });

  it("event-phase reflects whether that specific phase is currently active", () => {
    const requirement: Requirement = {
      type: "event-phase",
      eventId: event.id,
      phaseId: phase.id,
    };
    const context = baseContext({ eventPhases: new Map([[phase.id, phase]]) });
    expect(isRequirementSatisfied(requirement, context)).toBe(true);
    expect(
      isRequirementSatisfied(requirement, {
        ...context,
        instant: new Date("2026-08-15T00:00:00Z"),
      }),
    ).toBe(false);
  });
});

describe("server / character", () => {
  it("server requirement matches the character's own server", () => {
    expect(
      isRequirementSatisfied(
        { type: "server", serverId: server.id },
        baseContext(),
      ),
    ).toBe(true);
    expect(
      isRequirementSatisfied(
        { type: "server", serverId: createId("server", "other") },
        baseContext(),
      ),
    ).toBe(false);
  });

  it("server requirement is never satisfied for an account scope", () => {
    expect(
      isRequirementSatisfied(
        { type: "server", serverId: server.id },
        withoutCharacter(baseContext({ scope: { type: "account" } })),
      ),
    ).toBe(false);
  });

  it("character requirement matches only the exact character", () => {
    expect(
      isRequirementSatisfied(
        { type: "character", characterId: character.id },
        baseContext(),
      ),
    ).toBe(true);
    expect(
      isRequirementSatisfied(
        { type: "character", characterId: createId("character", "other") },
        baseContext(),
      ),
    ).toBe(false);
  });
});

describe("time-window", () => {
  it("is satisfied within the window and not outside it, including overnight wraps", () => {
    const requirement: Requirement = {
      type: "time-window",
      startTime: "18:00",
      endTime: "06:00",
    };
    // 2026-08-10T20:00:00Z = 2026-08-11T03:00 local -> within an 18:00-06:00 window.
    expect(
      isRequirementSatisfied(
        requirement,
        baseContext({ instant: new Date("2026-08-10T20:00:00Z") }),
      ),
    ).toBe(true);
    // 2026-08-10T05:00:00Z = 2026-08-10T12:00 local -> outside the window.
    expect(
      isRequirementSatisfied(
        requirement,
        baseContext({ instant: new Date("2026-08-10T05:00:00Z") }),
      ),
    ).toBe(false);
  });
});

describe("item-ownership / manual", () => {
  it("throws without a resolveUnsupported callback", () => {
    expect(() =>
      isRequirementSatisfied(
        { type: "item-ownership", resourceId: createId("resource", "crest") },
        baseContext(),
      ),
    ).toThrow(/needs an explicit resolveUnsupported/);
    expect(() =>
      isRequirementSatisfied(
        { type: "manual", description: "GM approval" },
        baseContext(),
      ),
    ).toThrow(/needs an explicit resolveUnsupported/);
  });

  it("delegates to resolveUnsupported when provided", () => {
    const requirement: Requirement = {
      type: "manual",
      description: "GM approval",
    };
    expect(
      isRequirementSatisfied(
        requirement,
        baseContext({ resolveUnsupported: () => true }),
      ),
    ).toBe(true);
  });
});

describe("areRequirementsSatisfied", () => {
  it("is true for an empty/undefined requirement set", () => {
    expect(areRequirementsSatisfied(undefined, baseContext())).toBe(true);
    expect(areRequirementsSatisfied([], baseContext())).toBe(true);
  });

  it("requires every requirement to be satisfied (AND)", () => {
    const requirements: Requirement[] = [
      { type: "character-level", minLevel: 10 },
      { type: "character-level", minLevel: 100 },
    ];
    expect(areRequirementsSatisfied(requirements, baseContext())).toBe(false);
  });
});
