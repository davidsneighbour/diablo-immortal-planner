import { describe, expect, it } from "vitest";
import {
  createEmptyPlayerState,
  type PlayerState,
} from "../../persistence/schema.js";
import { validatePlayerState } from "../../persistence/validate-player-state.js";
import { resolveTaskInstances } from "../../planner/task-instances.js";
import { setCounterProgress } from "../../planner/task-progress.js";
import { getFixtureDefinitionSet } from "../game/fixture-definitions.js";
import { dailyResetRule } from "../game/reset-rules.js";
import { dailyBountiesTask } from "../game/tasks.js";
import {
  fixtureCharacterA,
  fixtureCharacterB,
  fixtureCharacterC,
  fixtureCharacters,
  fixtureGoals,
  fixtureProgressionStates,
  fixtureServer,
} from "./demo-player-state.js";

const instant = new Date("2026-08-09T21:00:00Z");

function buildDemoState(): PlayerState {
  const freshInstances = resolveTaskInstances(dailyBountiesTask, {
    servers: [fixtureServer],
    characters: fixtureCharacters,
    resetRules: new Map([[dailyResetRule.id, dailyResetRule]]),
    existingInstances: [],
    instant,
  });

  // Simulate recorded progress: A is complete, B is partial, C hasn't started — independent per character.
  const taskInstances = freshInstances.map((instance) => {
    if (
      instance.scope.type !== "character" ||
      instance.progress.kind !== "counter"
    ) {
      return instance;
    }
    if (instance.scope.characterId === fixtureCharacterA.id) {
      return {
        ...instance,
        progress: setCounterProgress(instance.progress, 3),
        completedAt: instant.toISOString(),
      };
    }
    if (instance.scope.characterId === fixtureCharacterB.id) {
      return {
        ...instance,
        progress: setCounterProgress(instance.progress, 1),
      };
    }
    return instance;
  });

  return {
    ...createEmptyPlayerState(),
    servers: [fixtureServer],
    characters: fixtureCharacters,
    taskInstances,
    goals: fixtureGoals,
    progressionStates: fixtureProgressionStates,
  };
}

describe("demo player state fixture", () => {
  it("passes validation against the fixture game definitions", () => {
    const result = validatePlayerState(
      buildDemoState(),
      getFixtureDefinitionSet(),
    );
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("demonstrates independent per-character task progress (PLAN.md Milestone 3 acceptance shape)", () => {
    const state = buildDemoState();
    const forA = state.taskInstances.find(
      (i) =>
        i.scope.type === "character" &&
        i.scope.characterId === fixtureCharacterA.id,
    );
    const forB = state.taskInstances.find(
      (i) =>
        i.scope.type === "character" &&
        i.scope.characterId === fixtureCharacterB.id,
    );
    const forC = state.taskInstances.find(
      (i) =>
        i.scope.type === "character" &&
        i.scope.characterId === fixtureCharacterC.id,
    );

    expect(forA?.progress).toEqual({ kind: "counter", current: 3, target: 3 });
    expect(forB?.progress).toEqual({ kind: "counter", current: 1, target: 3 });
    expect(forC?.progress).toEqual({ kind: "counter", current: 0, target: 3 });
    expect(forA?.completedAt).toBeDefined();
    expect(forB?.completedAt).toBeUndefined();
  });

  it("demonstrates independent goals per character", () => {
    const goalScopes = fixtureGoals.map((goal) =>
      goal.scope.type === "character" ? goal.scope.characterId : null,
    );
    expect(new Set(goalScopes).size).toBe(fixtureGoals.length);
    expect(
      fixtureGoals.some(
        (g) =>
          g.scope.type === "character" &&
          g.scope.characterId === fixtureCharacterC.id,
      ),
    ).toBe(false);
  });
});
