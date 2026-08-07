import { createId } from "../../domain/id.js";
import type { Reward } from "../../domain/reward.js";
import { goldResource, telluricPearlResource } from "./loot.js";
import { elderRiftDailyRewardCap } from "./reward-caps.js";

const fixtureNotes =
  "Synthetic fixture data for Milestone 6 — not verified against real Diablo Immortal mechanics.";

/** Capped via `elderRiftDailyRewardCap` — demonstrates a reward cap independent of task availability. */
export const elderRiftDailyReward: Reward = {
  id: createId("reward", "elder-rift-daily"),
  entries: [
    {
      resourceId: telluricPearlResource.id,
      quantity: { kind: "fixed", amount: 1 },
    },
  ],
  capId: elderRiftDailyRewardCap.id,
  confidence: "unknown",
  notes: fixtureNotes,
};

/** Uncapped, for contrast with `elderRiftDailyReward`. */
export const bountyReward: Reward = {
  id: createId("reward", "bounty"),
  entries: [
    {
      resourceId: goldResource.id,
      quantity: { kind: "range", min: 50, max: 100 },
    },
  ],
  confidence: "unknown",
  notes: fixtureNotes,
};

export const weeklyClanTreasureReward: Reward = {
  id: createId("reward", "weekly-clan-treasure"),
  entries: [
    { resourceId: goldResource.id, quantity: { kind: "fixed", amount: 500 } },
  ],
  confidence: "unknown",
  notes: fixtureNotes,
};

export const fixtureRewards: readonly Reward[] = [
  elderRiftDailyReward,
  bountyReward,
  weeklyClanTreasureReward,
];
