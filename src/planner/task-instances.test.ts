import { describe, expect, it } from "vitest";
import type { Character } from "../domain/character.js";
import { createId } from "../domain/id.js";
import type { ResetRule } from "../domain/reset-rule.js";
import type { Server } from "../domain/server.js";
import type { Task } from "../domain/task.js";
import type { TaskInstance } from "../domain/task-instance.js";
import {
  deriveTaskInstanceId,
  resolveTaskInstances,
  resolveTaskPeriodKey,
  resolveTaskScopeTargets,
} from "./task-instances.js";

const server: Server = {
  id: createId("server", "sanctuary-1"),
  name: "Sanctuary 1",
  timezone: "Asia/Bangkok",
  dailyResetTime: "03:00",
  active: true,
};

const characterA: Character = {
  id: createId("character", "barbarian-1"),
  serverId: server.id,
  name: "Conan",
  className: "barbarian",
  level: 60,
  status: "active",
};
const characterB: Character = {
  id: createId("character", "necromancer-1"),
  serverId: server.id,
  name: "Death",
  className: "necromancer",
  level: 55,
  status: "active",
};
const archivedCharacter: Character = {
  id: createId("character", "retired-1"),
  serverId: server.id,
  name: "Retired",
  className: "monk",
  level: 10,
  status: "archived",
};

const dailyResetRule: ResetRule = {
  id: createId("reset-rule", "daily-sanctuary-1"),
  serverId: server.id,
  schedule: { kind: "every-game-day" },
};

describe("resolveTaskScopeTargets", () => {
  it("resolves an account-scoped task to the single account target", () => {
    const task: Task = {
      id: createId("task", "account-login"),
      name: "Daily login",
      scope: "account",
      activityIds: [],
      completionModel: { kind: "boolean" },
      repeatable: true,
    };
    expect(resolveTaskScopeTargets(task, [server], [characterA])).toEqual([
      { type: "account" },
    ]);
  });

  it("resolves a character-scoped task to one target per non-archived character", () => {
    const task: Task = {
      id: createId("task", "bounties"),
      name: "Bounties",
      scope: "character",
      activityIds: [],
      completionModel: { kind: "counter", target: 3 },
      repeatable: true,
    };
    const targets = resolveTaskScopeTargets(
      task,
      [server],
      [characterA, characterB, archivedCharacter],
    );
    expect(targets).toEqual([
      { type: "character", characterId: characterA.id },
      { type: "character", characterId: characterB.id },
    ]);
  });

  it("resolves a server-scoped task to one target per active server", () => {
    const inactiveServer: Server = {
      ...server,
      id: createId("server", "sanctuary-2"),
      active: false,
    };
    const task: Task = {
      id: createId("task", "server-event"),
      name: "Server event",
      scope: "server",
      activityIds: [],
      completionModel: { kind: "boolean" },
      repeatable: false,
    };
    expect(resolveTaskScopeTargets(task, [server, inactiveServer], [])).toEqual(
      [{ type: "server", serverId: server.id }],
    );
  });
});

describe("resolveTaskPeriodKey", () => {
  const resetRules = new Map([[dailyResetRule.id, dailyResetRule]]);
  const servers = new Map([[server.id, server]]);

  it('returns "lifetime" for a task with no reset rule', () => {
    const task: Task = {
      id: createId("task", "storyline-chapter-1"),
      name: "Storyline: Chapter 1",
      scope: "account",
      activityIds: [],
      completionModel: { kind: "boolean" },
      repeatable: false,
    };
    expect(resolveTaskPeriodKey(task, resetRules, servers, new Date())).toBe(
      "lifetime",
    );
  });

  it('returns "lifetime" for a rule with a none/manual schedule', () => {
    const manualRule: ResetRule = {
      id: createId("reset-rule", "manual"),
      serverId: server.id,
      schedule: { kind: "manual" },
    };
    const task: Task = {
      id: createId("task", "manual-task"),
      name: "Manual task",
      scope: "account",
      activityIds: [],
      completionModel: { kind: "boolean" },
      repeatable: true,
      completionResetRuleId: manualRule.id,
    };
    expect(
      resolveTaskPeriodKey(
        task,
        new Map([[manualRule.id, manualRule]]),
        servers,
        new Date(),
      ),
    ).toBe("lifetime");
  });

  it("returns the underlying reset rule's current period key otherwise", () => {
    const task: Task = {
      id: createId("task", "daily-bounties"),
      name: "Daily bounties",
      scope: "account",
      activityIds: [],
      completionModel: { kind: "boolean" },
      repeatable: true,
      completionResetRuleId: dailyResetRule.id,
    };
    expect(
      resolveTaskPeriodKey(
        task,
        resetRules,
        servers,
        new Date("2026-08-09T21:00:00Z"),
      ),
    ).toBe("2026-08-10");
  });
});

describe("deriveTaskInstanceId", () => {
  it("is deterministic for the same (task, scope, period) triple", () => {
    const taskId = createId("task", "bounties");
    const scope = { type: "character" as const, characterId: characterA.id };
    expect(deriveTaskInstanceId(taskId, scope, "2026-08-08")).toBe(
      deriveTaskInstanceId(taskId, scope, "2026-08-08"),
    );
  });

  it("differs when the scope target differs", () => {
    const taskId = createId("task", "bounties");
    const idA = deriveTaskInstanceId(
      taskId,
      { type: "character", characterId: characterA.id },
      "2026-08-08",
    );
    const idB = deriveTaskInstanceId(
      taskId,
      { type: "character", characterId: characterB.id },
      "2026-08-08",
    );
    expect(idA).not.toBe(idB);
  });
});

describe("resolveTaskInstances", () => {
  it("demonstrates the Milestone 3 acceptance scenario: independent per-character progress", () => {
    const bountiesTask: Task = {
      id: createId("task", "bounties"),
      name: "Bounties",
      scope: "character",
      activityIds: [],
      completionModel: { kind: "counter", target: 3 },
      repeatable: true,
      completionResetRuleId: dailyResetRule.id,
    };
    const instant = new Date("2026-08-09T21:00:00Z");
    const periodKey = resolveTaskPeriodKey(
      bountiesTask,
      new Map([[dailyResetRule.id, dailyResetRule]]),
      new Map([[server.id, server]]),
      instant,
    );
    const existingInstances: TaskInstance[] = [
      {
        id: deriveTaskInstanceId(
          bountiesTask.id,
          { type: "character", characterId: characterA.id },
          periodKey,
        ),
        taskId: bountiesTask.id,
        scope: { type: "character", characterId: characterA.id },
        periodKey,
        progress: { kind: "counter", current: 3, target: 3 },
        createdAt: instant.toISOString(),
      },
    ];

    const instances = resolveTaskInstances(bountiesTask, {
      servers: [server],
      characters: [characterA, characterB],
      resetRules: new Map([[dailyResetRule.id, dailyResetRule]]),
      existingInstances,
      instant,
    });

    expect(instances).toHaveLength(2);
    const forA = instances.find(
      (i) =>
        i.scope.type === "character" && i.scope.characterId === characterA.id,
    );
    const forB = instances.find(
      (i) =>
        i.scope.type === "character" && i.scope.characterId === characterB.id,
    );
    // Character A already had 3/3 recorded — that existing instance is reused, not recreated.
    expect(forA?.progress).toEqual({ kind: "counter", current: 3, target: 3 });
    expect(forA).toBe(existingInstances[0]);
    // Character B has no prior record — a fresh 0/3 instance is created.
    expect(forB?.progress).toEqual({ kind: "counter", current: 0, target: 3 });
  });

  it("resolves a single instance for an account-wide task", () => {
    const accountTask: Task = {
      id: createId("task", "account-login"),
      name: "Daily login",
      scope: "account",
      activityIds: [],
      completionModel: { kind: "boolean" },
      repeatable: true,
      completionResetRuleId: dailyResetRule.id,
    };
    const instances = resolveTaskInstances(accountTask, {
      servers: [server],
      characters: [characterA, characterB],
      resetRules: new Map([[dailyResetRule.id, dailyResetRule]]),
      existingInstances: [],
      instant: new Date("2026-08-09T21:00:00Z"),
    });
    expect(instances).toHaveLength(1);
    expect(instances[0]?.scope).toEqual({ type: "account" });
  });

  it("creates a new period instance on reset without touching the previous period's record", () => {
    const dailyTask: Task = {
      id: createId("task", "daily-bounties"),
      name: "Daily bounties",
      scope: "account",
      activityIds: [],
      completionModel: { kind: "counter", target: 3 },
      repeatable: true,
      completionResetRuleId: dailyResetRule.id,
    };
    const resetRules = new Map([[dailyResetRule.id, dailyResetRule]]);
    const servers = new Map([[server.id, server]]);

    const day1 = new Date("2026-08-09T21:00:00Z");
    const day1PeriodKey = resolveTaskPeriodKey(
      dailyTask,
      resetRules,
      servers,
      day1,
    );
    const day1Instance: TaskInstance = {
      id: deriveTaskInstanceId(
        dailyTask.id,
        { type: "account" },
        day1PeriodKey,
      ),
      taskId: dailyTask.id,
      scope: { type: "account" },
      periodKey: day1PeriodKey,
      progress: { kind: "counter", current: 3, target: 3 },
      completedAt: day1.toISOString(),
      createdAt: day1.toISOString(),
    };

    // The application is reopened a day later, after the reset.
    const day2 = new Date("2026-08-10T21:00:00Z");
    const instances = resolveTaskInstances(dailyTask, {
      servers: [server],
      characters: [],
      resetRules,
      existingInstances: [day1Instance],
      instant: day2,
    });

    expect(instances).toHaveLength(1);
    const day2Instance = instances[0];
    expect(day2Instance?.periodKey).not.toBe(day1Instance.periodKey);
    expect(day2Instance?.progress).toEqual({
      kind: "counter",
      current: 0,
      target: 3,
    });
    // The previous period's completed record is untouched.
    expect(day1Instance.progress).toEqual({
      kind: "counter",
      current: 3,
      target: 3,
    });
    expect(day1Instance.completedAt).toBe(day1.toISOString());
  });
});
