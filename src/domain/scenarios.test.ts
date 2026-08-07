import { describe, expect, it } from "vitest";
import type { Activity } from "./activity.js";
import type { Character } from "./character.js";
import {
  emptyDefinitionSet,
  type GameDefinitionSet,
} from "./definition-set.js";
import type { Event } from "./event.js";
import type { Goal } from "./goal.js";
import { createId } from "./id.js";
import type { ResetRule } from "./reset-rule.js";
import type { Server } from "./server.js";
import type { Task } from "./task.js";
import type { TaskInstance } from "./task-instance.js";
import { validateDefinitionSet } from "./validation.js";

/**
 * Exercises the Milestone 1 acceptance criteria from PLAN.md: the domain
 * model can represent these relationships without any React component,
 * and a valid combination of them passes validation.
 */
describe("Milestone 1 acceptance scenarios", () => {
  const serverA: Server = {
    id: createId("server", "sanctuary-1"),
    name: "Sanctuary 1",
    timezone: "Asia/Bangkok",
    dailyResetTime: "03:00",
    active: true,
  };
  const serverB: Server = {
    id: createId("server", "sanctuary-2"),
    name: "Sanctuary 2",
    timezone: "Asia/Bangkok",
    dailyResetTime: "03:00",
    active: true,
  };

  it("represents several characters on one server and characters on different servers", () => {
    const characters: Character[] = [
      {
        id: createId("character", "barbarian-1"),
        serverId: serverA.id,
        name: "Conan",
        className: "barbarian",
        level: 60,
        status: "active",
      },
      {
        id: createId("character", "necromancer-1"),
        serverId: serverA.id,
        name: "Death",
        className: "necromancer",
        level: 55,
        status: "active",
      },
      {
        id: createId("character", "monk-1"),
        serverId: serverB.id,
        name: "Zen",
        className: "monk",
        level: 40,
        status: "active",
      },
    ];
    const set = {
      ...emptyDefinitionSet(),
      servers: [serverA, serverB],
      characters,
    };
    expect(validateDefinitionSet(set).valid).toBe(true);
    expect(characters.filter((c) => c.serverId === serverA.id)).toHaveLength(2);
    expect(characters.filter((c) => c.serverId === serverB.id)).toHaveLength(1);
  });

  it("represents one account-wide task alongside the same recurring task tracked independently per character", () => {
    const dailyResetRule: ResetRule = {
      id: createId("reset-rule", "daily-sanctuary-1"),
      serverId: serverA.id,
      schedule: { kind: "every-game-day" },
    };

    const accountTask: Task = {
      id: createId("task", "account-login"),
      name: "Daily login",
      scope: { type: "account" },
      activityIds: [],
      completionModel: { kind: "boolean" },
      repeatable: true,
      availabilityResetRuleId: dailyResetRule.id,
    };

    const characterA = createId("character", "barbarian-1");
    const characterB = createId("character", "necromancer-1");
    const characterC = createId("character", "monk-1");
    const characters: Character[] = [
      {
        id: characterA,
        serverId: serverA.id,
        name: "Conan",
        className: "barbarian",
        level: 60,
        status: "active",
      },
      {
        id: characterB,
        serverId: serverA.id,
        name: "Death",
        className: "necromancer",
        level: 55,
        status: "active",
      },
      {
        id: characterC,
        serverId: serverA.id,
        name: "Zen",
        className: "monk",
        level: 40,
        status: "active",
      },
    ];

    const bountiesTask: Task = {
      id: createId("task", "bounties"),
      name: "Bounties",
      scope: { type: "character", characterId: characterA },
      activityIds: [],
      completionModel: { kind: "counter", target: 3 },
      repeatable: true,
      availabilityResetRuleId: dailyResetRule.id,
    };

    // Same task definition conceptually, independent instances per character.
    const periodKey = "2026-08-08";
    const instances: TaskInstance[] = [
      {
        id: createId("task-instance", "bounties-a-2026-08-08"),
        taskId: bountiesTask.id,
        scope: { type: "character", characterId: characterA },
        periodKey,
        progress: { kind: "counter", current: 3, target: 3 },
        createdAt: "2026-08-08T03:00:00+07:00",
      },
      {
        id: createId("task-instance", "bounties-b-2026-08-08"),
        taskId: bountiesTask.id,
        scope: { type: "character", characterId: characterB },
        periodKey,
        progress: { kind: "counter", current: 1, target: 3 },
        createdAt: "2026-08-08T03:00:00+07:00",
      },
      {
        id: createId("task-instance", "bounties-c-2026-08-08"),
        taskId: bountiesTask.id,
        scope: { type: "character", characterId: characterC },
        periodKey,
        progress: { kind: "counter", current: 0, target: 3 },
        createdAt: "2026-08-08T03:00:00+07:00",
      },
    ];

    const set: GameDefinitionSet = {
      ...emptyDefinitionSet(),
      servers: [serverA],
      characters,
      resetRules: [dailyResetRule],
      tasks: [accountTask, bountiesTask],
    };
    expect(validateDefinitionSet(set).valid).toBe(true);

    // Each character's progress is independent — completing it for A must
    // not imply completion for B or C.
    expect(instances[0]?.progress).toMatchObject({ current: 3, target: 3 });
    expect(instances[1]?.progress).toMatchObject({ current: 1, target: 3 });
    expect(instances[2]?.progress).toMatchObject({ current: 0, target: 3 });
    const uniqueScopes = new Set(
      instances.map((i) =>
        i.scope.type === "character" ? i.scope.characterId : null,
      ),
    );
    expect(uniqueScopes.size).toBe(3);
  });

  it("represents different goals for different characters", () => {
    const characterA = createId("character", "barbarian-1");
    const characterB = createId("character", "necromancer-1");

    const goals: Goal[] = [
      {
        id: createId("goal", "upgrade-gem-a"),
        scope: { type: "character", characterId: characterA },
        name: "Upgrade legendary gem",
        createdAt: "2026-08-01T00:00:00Z",
      },
      {
        id: createId("goal", "reach-level-b"),
        scope: { type: "character", characterId: characterB },
        name: "Reach level 60",
        targetLevel: 60,
        createdAt: "2026-08-01T00:00:00Z",
      },
    ];

    expect(goals[0]?.scope).not.toEqual(goals[1]?.scope);
    expect(
      goals.filter(
        (g) =>
          g.scope.type === "character" && g.scope.characterId === characterA,
      ),
    ).toHaveLength(1);
  });

  it("represents permanent tasks (no reset) alongside recurring tasks using the same task shape", () => {
    const dailyResetRule: ResetRule = {
      id: createId("reset-rule", "daily-sanctuary-1"),
      serverId: serverA.id,
      schedule: { kind: "every-game-day" },
    };

    const permanentTask: Task = {
      id: createId("task", "storyline-chapter-1"),
      name: "Storyline: Chapter 1",
      scope: { type: "account" },
      activityIds: [],
      completionModel: { kind: "boolean" },
      repeatable: false,
      // No reset rule at all — this is what makes it permanent, not a
      // recurring rule with an implausibly long period.
    };

    const recurringTask: Task = {
      id: createId("task", "daily-bounties"),
      name: "Daily bounties",
      scope: { type: "account" },
      activityIds: [],
      completionModel: { kind: "counter", target: 3 },
      repeatable: true,
      availabilityResetRuleId: dailyResetRule.id,
      completionResetRuleId: dailyResetRule.id,
    };

    const set: GameDefinitionSet = {
      ...emptyDefinitionSet(),
      servers: [serverA],
      resetRules: [dailyResetRule],
      tasks: [permanentTask, recurringTask],
    };
    expect(validateDefinitionSet(set).valid).toBe(true);
    expect(permanentTask.availabilityResetRuleId).toBeUndefined();
    expect(recurringTask.availabilityResetRuleId).toBe(dailyResetRule.id);
  });

  it("represents an event and an event-specific task that only exists while the event is active", () => {
    const event: Event = {
      id: createId("event", "shadow-invasion"),
      name: "Shadow Invasion",
      startsAt: "2026-08-10T03:00:00+07:00",
      endsAt: "2026-08-17T03:00:00+07:00",
      hasPhases: false,
    };

    const eventTask: Task = {
      id: createId("task", "shadow-invasion-daily"),
      name: "Shadow Invasion: daily objective",
      scope: { type: "account" },
      activityIds: [],
      completionModel: { kind: "boolean" },
      repeatable: true,
      eventId: event.id,
      requirements: [{ type: "active-event", eventId: event.id }],
    };

    const set: GameDefinitionSet = {
      ...emptyDefinitionSet(),
      servers: [serverA],
      events: [event],
      tasks: [eventTask],
    };
    expect(validateDefinitionSet(set).valid).toBe(true);
    expect(eventTask.eventId).toBe(event.id);
  });

  it("represents one activity progressing several tasks simultaneously", () => {
    const activityId = createId("activity", "elder-rift");
    const activity: Activity = {
      id: activityId,
      name: "Run Elder Rift",
      categories: ["dungeon", "elder-rift"],
    };

    const dailyTask: Task = {
      id: createId("task", "daily-elder-rift"),
      name: "Run an Elder Rift",
      scope: { type: "account" },
      activityIds: [activityId],
      completionModel: { kind: "counter", target: 1 },
      repeatable: true,
    };
    const weeklyTask: Task = {
      id: createId("task", "weekly-elder-rift"),
      name: "Run three Elder Rifts",
      scope: { type: "account" },
      activityIds: [activityId],
      completionModel: { kind: "counter", target: 3 },
      repeatable: true,
    };
    const eventTask: Task = {
      id: createId("task", "event-elder-rift"),
      name: "Complete Elder Rift for event X",
      scope: { type: "account" },
      activityIds: [activityId],
      completionModel: { kind: "boolean" },
      repeatable: false,
    };

    const set: GameDefinitionSet = {
      ...emptyDefinitionSet(),
      servers: [serverA],
      activities: [activity],
      tasks: [dailyTask, weeklyTask, eventTask],
    };
    expect(validateDefinitionSet(set).valid).toBe(true);

    const tasksProgressedByActivity = set.tasks.filter((task) =>
      task.activityIds.includes(activityId),
    );
    expect(tasksProgressedByActivity).toHaveLength(3);
  });
});
