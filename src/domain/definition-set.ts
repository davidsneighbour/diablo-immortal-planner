import type { Activity } from "./activity.js";
import type { Dependency } from "./dependency.js";
import type { Event, EventPhase } from "./event.js";
import type { ProgressionSystem } from "./progression.js";
import type { ResetRule } from "./reset-rule.js";
import type { Resource } from "./resource.js";
import type { Reward, RewardCap } from "./reward.js";
import type { Task } from "./task.js";

/**
 * The full set of game definitions the planner knows about (as opposed to
 * player state — see `PLAN.md`'s "Game definitions versus player state").
 * Grouped here so validation can check cross-entity references and
 * invariants (unique IDs, resolvable foreign keys, dependency cycles) in
 * one pass.
 *
 * Deliberately excludes `Server` and `Character`: both are player-owned
 * configuration for this personal tool (the player names their own
 * servers/characters), not shared game content — see `PlayerState` in
 * `src/persistence/schema.ts`. `ResetRule.serverId` and any `Requirement`
 * referencing a `serverId`/`characterId` therefore can't be fully
 * validated from `GameDefinitionSet` alone; that needs a combined check
 * against the loaded `PlayerState` (see `validatePlayerState`).
 */
export interface GameDefinitionSet {
  readonly activities: readonly Activity[];
  readonly tasks: readonly Task[];
  readonly events: readonly Event[];
  readonly eventPhases: readonly EventPhase[];
  readonly resources: readonly Resource[];
  readonly rewards: readonly Reward[];
  readonly rewardCaps: readonly RewardCap[];
  readonly resetRules: readonly ResetRule[];
  readonly progressionSystems: readonly ProgressionSystem[];
  readonly dependencies: readonly Dependency[];
}

export function emptyDefinitionSet(): GameDefinitionSet {
  return {
    activities: [],
    tasks: [],
    events: [],
    eventPhases: [],
    resources: [],
    rewards: [],
    rewardCaps: [],
    resetRules: [],
    progressionSystems: [],
    dependencies: [],
  };
}
