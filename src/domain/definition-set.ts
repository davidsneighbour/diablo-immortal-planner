import type { Activity } from "./activity.js";
import type { Character } from "./character.js";
import type { Dependency } from "./dependency.js";
import type { Event, EventPhase } from "./event.js";
import type { ProgressionSystem } from "./progression.js";
import type { ResetRule } from "./reset-rule.js";
import type { Resource } from "./resource.js";
import type { Reward, RewardCap } from "./reward.js";
import type { Server } from "./server.js";
import type { Task } from "./task.js";

/**
 * The full set of game definitions the planner knows about (as opposed to
 * player state — see `PLAN.md`'s "Game definitions versus player state").
 * Grouped here so validation can check cross-entity references and
 * invariants (unique IDs, resolvable foreign keys, dependency cycles,
 * character-per-server limits) in one pass.
 */
export interface GameDefinitionSet {
  readonly servers: readonly Server[];
  readonly characters: readonly Character[];
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
    servers: [],
    characters: [],
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
