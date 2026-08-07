import type { ServerId } from "../../domain/id.js";
import { createId } from "../../domain/id.js";
import type { ResetRule } from "../../domain/reset-rule.js";

/**
 * `ResetRule.serverId` references player-owned data (see
 * `src/persistence/schema.ts`'s `PlayerState`), so these fixtures are
 * only fully valid once combined with a matching demo server — see
 * `src/data/fixtures/demo-player-state.ts`'s `fixtureServer`, which uses
 * this exact ID.
 */
export const fixtureServerId: ServerId = createId("server", "sanctuary-1");

export const dailyResetRule: ResetRule = {
  id: createId("reset-rule", "daily-sanctuary-1"),
  serverId: fixtureServerId,
  schedule: { kind: "every-game-day" },
};

export const weeklyResetRule: ResetRule = {
  id: createId("reset-rule", "weekly-monday-sanctuary-1"),
  serverId: fixtureServerId,
  // 1 = Monday.
  schedule: { kind: "weekly", weekday: 1 },
};

export const fixtureResetRules: readonly ResetRule[] = [
  dailyResetRule,
  weeklyResetRule,
];
