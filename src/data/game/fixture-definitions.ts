import {
  emptyDefinitionSet,
  type GameDefinitionSet,
} from "../../domain/definition-set.js";
import { fixtureActivities } from "./activities.js";
import { fixtureDependencies } from "./dependencies.js";
import { fixtureEventPhases, fixtureEvents } from "./events.js";
import { fixtureResources } from "./loot.js";
import { fixtureProgressionSystems } from "./progression.js";
import { fixtureResetRules } from "./reset-rules.js";
import { fixtureRewardCaps } from "./reward-caps.js";
import { fixtureRewards } from "./rewards.js";
import { fixtureTasks } from "./tasks.js";

/**
 * SYNTHETIC FIXTURE DATA (Milestone 6). Proves the domain model handles
 * realistic combinations before real Diablo Immortal data is collected —
 * see `PLAN.md`'s Milestone 6. Not a real Diablo Immortal dataset.
 */
export function getFixtureDefinitionSet(): GameDefinitionSet {
  return {
    ...emptyDefinitionSet(),
    activities: fixtureActivities,
    tasks: fixtureTasks,
    events: fixtureEvents,
    eventPhases: fixtureEventPhases,
    resources: fixtureResources,
    rewards: fixtureRewards,
    rewardCaps: fixtureRewardCaps,
    resetRules: fixtureResetRules,
    progressionSystems: fixtureProgressionSystems,
    dependencies: fixtureDependencies,
  };
}
