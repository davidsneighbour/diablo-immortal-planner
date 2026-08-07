import type { ActivityId } from "./id.js";
import type { GameDefinitionMetadata } from "./metadata.js";
import type { RequirementSet } from "./requirement.js";

/**
 * Something the player can do. An activity is not itself a task — several
 * tasks (a daily count, a weekly count, an event objective, ...) can
 * reference the same activity. See `Task.activityIds`.
 */
export interface Activity extends GameDefinitionMetadata {
  readonly id: ActivityId;
  readonly name: string;
  /** Open-ended taxonomy, e.g. `["dungeon", "elder-rift"]`. Not a fixed enum. */
  readonly categories: readonly string[];
  readonly requirements?: RequirementSet;
  readonly estimatedDurationMinutes?: number;
  readonly description?: string;
}
