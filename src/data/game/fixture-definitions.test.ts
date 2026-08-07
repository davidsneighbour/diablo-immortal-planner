import { describe, expect, it } from "vitest";
import { validateDefinitionSet } from "../../domain/validation.js";
import { elderRiftActivity } from "./activities.js";
import { fixtureDependencies } from "./dependencies.js";
import { getFixtureDefinitionSet } from "./fixture-definitions.js";
import {
  dailyBountiesTask,
  dailyElderRiftTask,
  dailyLoginTask,
  shadowInvasionCumulativeTask,
  shadowInvasionDailyTask,
  storylineChapter1Task,
  storylineChapter2Task,
  weeklyClanTreasureTask,
} from "./tasks.js";

describe("fixture GameDefinitionSet", () => {
  it("passes build-time validation", () => {
    const result = validateDefinitionSet(getFixtureDefinitionSet());
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("includes one daily account-wide task", () => {
    expect(dailyLoginTask.scope).toBe("account");
    expect(dailyLoginTask.completionResetRuleId).toBeDefined();
    expect(dailyLoginTask.repeatable).toBe(true);
  });

  it("includes one daily character-scoped task with a numeric progress target", () => {
    expect(dailyBountiesTask.scope).toBe("character");
    expect(dailyBountiesTask.completionModel).toEqual({
      kind: "counter",
      target: 3,
    });
  });

  it("includes one weekly task", () => {
    const set = getFixtureDefinitionSet();
    const weeklyRule = set.resetRules.find(
      (rule) => rule.id === weeklyClanTreasureTask.completionResetRuleId,
    );
    expect(weeklyRule?.schedule.kind).toBe("weekly");
  });

  it("includes one permanent task with no reset rule", () => {
    expect(storylineChapter1Task.repeatable).toBe(false);
    expect(storylineChapter1Task.availabilityResetRuleId).toBeUndefined();
    expect(storylineChapter1Task.completionResetRuleId).toBeUndefined();
  });

  it("includes a dependency matching a prerequisite-task requirement", () => {
    const dependency = fixtureDependencies.find(
      (d) =>
        d.fromTaskId === storylineChapter1Task.id &&
        d.toTaskId === storylineChapter2Task.id,
    );
    expect(dependency).toBeDefined();
    expect(storylineChapter2Task.requirements).toContainEqual({
      type: "prerequisite-task",
      taskId: storylineChapter1Task.id,
    });
  });

  it("includes an event with a daily-reset task and a cumulative task", () => {
    expect(shadowInvasionDailyTask.completionResetRuleId).toBeDefined();
    expect(shadowInvasionCumulativeTask.completionResetRuleId).toBeUndefined();
    expect(shadowInvasionCumulativeTask.completionModel).toEqual({
      kind: "accumulated",
      target: 500,
    });
  });

  it("has one activity progressing several tasks simultaneously", () => {
    const set = getFixtureDefinitionSet();
    const tasksUsingElderRift = set.tasks.filter((task) =>
      task.activityIds.includes(elderRiftActivity.id),
    );
    expect(tasksUsingElderRift.map((task) => task.id)).toEqual(
      expect.arrayContaining([
        dailyElderRiftTask.id,
        weeklyClanTreasureTask.id,
        shadowInvasionCumulativeTask.id,
      ]),
    );
    expect(tasksUsingElderRift).toHaveLength(3);
  });

  it("has a reward cap independent of task availability", () => {
    const set = getFixtureDefinitionSet();
    const reward = set.rewards.find(
      (r) => r.id === dailyElderRiftTask.rewardId,
    );
    expect(reward?.capId).toBeDefined();
    const cap = set.rewardCaps.find((c) => c.id === reward?.capId);
    expect(cap?.period).toBe("daily");
    expect(cap?.limit).toBe(1);
  });

  it("has one progression system", () => {
    const set = getFixtureDefinitionSet();
    expect(set.progressionSystems).toHaveLength(1);
  });

  it("labels every metadata-carrying fixture as synthetic", () => {
    const set = getFixtureDefinitionSet();
    const withMetadata = [
      ...set.activities,
      ...set.tasks,
      ...set.events,
      ...set.resources,
      ...set.rewards,
      ...set.progressionSystems,
    ];
    expect(withMetadata.length).toBeGreaterThan(0);
    for (const record of withMetadata) {
      expect(record.confidence).toBe("unknown");
      expect(record.notes).toMatch(/synthetic fixture data/i);
    }
  });
});
