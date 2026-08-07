import { createId } from "../../domain/id.js";
import type { RewardCap } from "../../domain/reward.js";

/** SYNTHETIC FIXTURE DATA (Milestone 6). */
export const elderRiftDailyRewardCap: RewardCap = {
  id: createId("reward-cap", "elder-rift-daily"),
  period: "daily",
  limit: 1,
};

export const fixtureRewardCaps: readonly RewardCap[] = [
  elderRiftDailyRewardCap,
];
