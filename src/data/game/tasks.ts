import { createId } from "../../domain/id.js";
import type { Task } from "../../domain/task.js";
import { bountyActivity, elderRiftActivity } from "./activities.js";
import { shadowInvasionEvent } from "./events.js";
import { dailyResetRule, weeklyResetRule } from "./reset-rules.js";
import {
  bountyReward,
  elderRiftDailyReward,
  weeklyClanTreasureReward,
} from "./rewards.js";

const fixtureNotes =
  "Synthetic fixture data for Milestone 6 — not verified against real Diablo Immortal mechanics.";

/** One daily account-wide task. */
export const dailyLoginTask: Task = {
  id: createId("task", "daily-login"),
  name: "Daily login",
  scope: "account",
  activityIds: [],
  completionModel: { kind: "boolean" },
  repeatable: true,
  completionResetRuleId: dailyResetRule.id,
  confidence: "unknown",
  notes: fixtureNotes,
};

/** One daily character-scoped task, with a numeric progress target. */
export const dailyBountiesTask: Task = {
  id: createId("task", "daily-bounties"),
  name: "Daily bounties",
  scope: "character",
  activityIds: [bountyActivity.id],
  completionModel: { kind: "counter", target: 3 },
  repeatable: true,
  completionResetRuleId: dailyResetRule.id,
  rewardId: bountyReward.id,
  confidence: "unknown",
  notes: fixtureNotes,
};

/**
 * A character-scoped daily task sharing `elderRiftActivity` with
 * `weeklyClanTreasureTask` and `shadowInvasionCumulativeTask` —
 * demonstrates one activity progressing several tasks simultaneously.
 * Its reward is capped via `elderRiftDailyReward`.
 */
export const dailyElderRiftTask: Task = {
  id: createId("task", "daily-elder-rift"),
  name: "Run an Elder Rift",
  scope: "character",
  activityIds: [elderRiftActivity.id],
  completionModel: { kind: "counter", target: 1 },
  repeatable: true,
  completionResetRuleId: dailyResetRule.id,
  rewardId: elderRiftDailyReward.id,
  confidence: "unknown",
  notes: fixtureNotes,
};

/** One weekly task. */
export const weeklyClanTreasureTask: Task = {
  id: createId("task", "weekly-clan-treasure"),
  name: "Weekly clan treasure",
  scope: "account",
  activityIds: [elderRiftActivity.id],
  completionModel: { kind: "counter", target: 3 },
  repeatable: true,
  completionResetRuleId: weeklyResetRule.id,
  rewardId: weeklyClanTreasureReward.id,
  confidence: "unknown",
  notes: fixtureNotes,
};

/** One permanent task: repeatable is false and there is no reset rule at all — not a recurring rule with an implausibly long period. */
export const storylineChapter1Task: Task = {
  id: createId("task", "storyline-chapter-1"),
  name: "Storyline: Chapter 1",
  scope: "account",
  activityIds: [],
  completionModel: { kind: "boolean" },
  repeatable: false,
  confidence: "unknown",
  notes: fixtureNotes,
};

/** Depends on `storylineChapter1Task` — see `fixtureDependencies` for the matching `Dependency` edge. */
export const storylineChapter2Task: Task = {
  id: createId("task", "storyline-chapter-2"),
  name: "Storyline: Chapter 2",
  scope: "account",
  activityIds: [],
  completionModel: { kind: "boolean" },
  repeatable: false,
  requirements: [
    { type: "prerequisite-task", taskId: storylineChapter1Task.id },
  ],
  confidence: "unknown",
  notes: fixtureNotes,
};

/** A daily-reset task tied to a specific event. */
export const shadowInvasionDailyTask: Task = {
  id: createId("task", "shadow-invasion-daily"),
  name: "Shadow Invasion: daily objective",
  scope: "account",
  activityIds: [],
  completionModel: { kind: "boolean" },
  repeatable: true,
  eventId: shadowInvasionEvent.id,
  completionResetRuleId: dailyResetRule.id,
  requirements: [{ type: "active-event", eventId: shadowInvasionEvent.id }],
  confidence: "unknown",
  notes: fixtureNotes,
};

/**
 * A cumulative event task: no reset rule of its own, so progress
 * accumulates for the whole event rather than resetting daily.
 */
export const shadowInvasionCumulativeTask: Task = {
  id: createId("task", "shadow-invasion-cumulative"),
  name: "Shadow Invasion: clear 500 Elder Rifts worth of essence",
  scope: "account",
  activityIds: [elderRiftActivity.id],
  completionModel: { kind: "accumulated", target: 500 },
  repeatable: false,
  eventId: shadowInvasionEvent.id,
  requirements: [{ type: "active-event", eventId: shadowInvasionEvent.id }],
  confidence: "unknown",
  notes: fixtureNotes,
};

export const fixtureTasks: readonly Task[] = [
  dailyLoginTask,
  dailyBountiesTask,
  dailyElderRiftTask,
  weeklyClanTreasureTask,
  storylineChapter1Task,
  storylineChapter2Task,
  shadowInvasionDailyTask,
  shadowInvasionCumulativeTask,
];
