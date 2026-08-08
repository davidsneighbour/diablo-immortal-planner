import { describe, expect, it } from "vitest";
import {
  fixtureCharacterA,
  fixtureCharacterB,
  fixtureGoals,
  fixtureServer,
} from "../data/fixtures/demo-player-state.js";
import { shadowInvasionEvent } from "../data/game/events.js";
import { getFixtureDefinitionSet } from "../data/game/fixture-definitions.js";
import {
  dailyBountiesTask,
  dailyLoginTask,
  shadowInvasionDailyTask,
  storylineChapter1Task,
  storylineChapter2Task,
  weeklyClanTreasureTask,
} from "../data/game/tasks.js";
import type { Scope } from "../domain/scope.js";
import {
  createEmptyPlayerState,
  type PlayerState,
} from "../persistence/schema.js";
import { getGameDay } from "../time/game-day.js";
import { buildDashboard, type TaskGroupName } from "./now-dashboard.js";
import { deriveTaskInstanceId } from "./task-instances.js";

const instant = new Date("2026-08-08T10:00:00Z");
const definitions = getFixtureDefinitionSet();

function basePlayerState(): PlayerState {
  return {
    ...createEmptyPlayerState(),
    servers: [fixtureServer],
    characters: [fixtureCharacterA, fixtureCharacterB],
    goals: fixtureGoals,
  };
}

function findEntry(
  groups: readonly {
    name: TaskGroupName;
    entries: readonly { task: { id: string } }[];
  }[],
  taskId: string,
) {
  for (const group of groups) {
    const entry = group.entries.find(
      (candidate) => candidate.task.id === taskId,
    );
    if (entry) {
      return { group: group.name, entry };
    }
  }
  return undefined;
}

function findSection(
  sections: ReturnType<typeof buildDashboard>["sections"],
  scope: Scope,
) {
  return sections.find((section) => {
    if (section.scope.type !== scope.type) {
      return false;
    }
    if (section.scope.type === "character" && scope.type === "character") {
      return section.scope.characterId === scope.characterId;
    }
    if (section.scope.type === "server" && scope.type === "server") {
      return section.scope.serverId === scope.serverId;
    }
    return true;
  });
}

describe("buildDashboard", () => {
  it("computes server time, game day, and next reset", () => {
    const dashboard = buildDashboard(definitions, basePlayerState(), instant);
    expect(dashboard.serverTimes).toHaveLength(1);
    const summary = dashboard.serverTimes[0];
    expect(summary?.server.id).toBe(fixtureServer.id);
    expect(summary?.gameDay).toBe(getGameDay(fixtureServer, instant));
    expect(summary?.nextReset.getTime()).toBeGreaterThan(instant.getTime());
  });

  it("has no active events before the fixture event window", () => {
    const dashboard = buildDashboard(definitions, basePlayerState(), instant);
    expect(dashboard.activeEvents).toHaveLength(0);
  });

  it("includes the fixture event, and its event-gated task, once its window opens", () => {
    const duringEvent = new Date("2026-08-12T10:00:00Z");
    const dashboard = buildDashboard(
      definitions,
      basePlayerState(),
      duringEvent,
    );
    expect(dashboard.activeEvents.map((event) => event.id)).toContain(
      shadowInvasionEvent.id,
    );
    const account = findSection(dashboard.sections, { type: "account" });
    expect(
      findEntry(account?.groups ?? [], shadowInvasionDailyTask.id)?.group,
    ).toBe("events");
  });

  it("groups an account-scoped daily task under 'daily' in the Account section", () => {
    const dashboard = buildDashboard(definitions, basePlayerState(), instant);
    const account = findSection(dashboard.sections, { type: "account" });
    expect(findEntry(account?.groups ?? [], dailyLoginTask.id)?.group).toBe(
      "daily",
    );
  });

  it("groups an account-scoped weekly task under 'weekly'", () => {
    const dashboard = buildDashboard(definitions, basePlayerState(), instant);
    const account = findSection(dashboard.sections, { type: "account" });
    expect(
      findEntry(account?.groups ?? [], weeklyClanTreasureTask.id)?.group,
    ).toBe("weekly");
  });

  it("groups a task with no reset rule under 'permanent'", () => {
    const dashboard = buildDashboard(definitions, basePlayerState(), instant);
    const account = findSection(dashboard.sections, { type: "account" });
    expect(
      findEntry(account?.groups ?? [], storylineChapter1Task.id)?.group,
    ).toBe("permanent");
  });

  it("always includes one section per active character, even with no entries", () => {
    const dashboard = buildDashboard(definitions, basePlayerState(), instant);
    const sectionA = findSection(dashboard.sections, {
      type: "character",
      characterId: fixtureCharacterA.id,
    });
    const sectionB = findSection(dashboard.sections, {
      type: "character",
      characterId: fixtureCharacterB.id,
    });
    expect(sectionA?.label).toBe(fixtureCharacterA.name);
    expect(sectionB?.label).toBe(fixtureCharacterB.name);
  });

  it("hides a task behind an unmet prerequisite, and reveals it once satisfied", () => {
    const withoutPrerequisite = buildDashboard(
      definitions,
      basePlayerState(),
      instant,
    );
    const account = findSection(withoutPrerequisite.sections, {
      type: "account",
    });
    expect(
      findEntry(account?.groups ?? [], storylineChapter2Task.id),
    ).toBeUndefined();

    const chapter1Instance = {
      id: deriveTaskInstanceId(
        storylineChapter1Task.id,
        { type: "account" as const },
        "lifetime",
      ),
      taskId: storylineChapter1Task.id,
      scope: { type: "account" as const },
      periodKey: "lifetime",
      progress: { kind: "boolean" as const, complete: true },
      createdAt: instant.toISOString(),
    };
    const withPrerequisite = buildDashboard(
      definitions,
      { ...basePlayerState(), taskInstances: [chapter1Instance] },
      instant,
    );
    const accountAfter = findSection(withPrerequisite.sections, {
      type: "account",
    });
    // Chapter 1 is now complete, so it drops out; Chapter 2 unlocks.
    expect(
      findEntry(accountAfter?.groups ?? [], storylineChapter1Task.id),
    ).toBeUndefined();
    expect(
      findEntry(accountAfter?.groups ?? [], storylineChapter2Task.id)?.group,
    ).toBe("permanent");
  });

  it("tracks per-character progress independently — completing a task for one character never affects another", () => {
    const gameDay = getGameDay(fixtureServer, instant);
    const scopeA: Scope = {
      type: "character",
      characterId: fixtureCharacterA.id,
    };
    const instanceA = {
      id: deriveTaskInstanceId(dailyBountiesTask.id, scopeA, gameDay),
      taskId: dailyBountiesTask.id,
      scope: scopeA,
      periodKey: gameDay,
      progress: { kind: "counter" as const, current: 3, target: 3 },
      createdAt: instant.toISOString(),
    };
    const dashboard = buildDashboard(
      definitions,
      { ...basePlayerState(), taskInstances: [instanceA] },
      instant,
    );
    const sectionA = findSection(dashboard.sections, scopeA);
    const sectionB = findSection(dashboard.sections, {
      type: "character",
      characterId: fixtureCharacterB.id,
    });
    const account = findSection(dashboard.sections, { type: "account" });

    expect(
      findEntry(sectionA?.groups ?? [], dailyBountiesTask.id),
    ).toBeUndefined();
    expect(findEntry(sectionB?.groups ?? [], dailyBountiesTask.id)?.group).toBe(
      "daily",
    );
    expect(
      findEntry(account?.groups ?? [], dailyBountiesTask.id),
    ).toBeUndefined();
  });

  it("attaches goals to the matching character section only", () => {
    const dashboard = buildDashboard(definitions, basePlayerState(), instant);
    const sectionA = findSection(dashboard.sections, {
      type: "character",
      characterId: fixtureCharacterA.id,
    });
    const sectionB = findSection(dashboard.sections, {
      type: "character",
      characterId: fixtureCharacterB.id,
    });
    expect(sectionA?.goals).toHaveLength(1);
    expect(sectionA?.goals[0]?.scope).toEqual({
      type: "character",
      characterId: fixtureCharacterA.id,
    });
    expect(sectionB?.goals).toHaveLength(1);
  });
});
