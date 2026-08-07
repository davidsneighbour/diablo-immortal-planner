import type {
  ActivityId,
  EventId,
  EventPhaseId,
  ResetRuleId,
  RewardId,
  TaskId,
} from "./id.js";
import type { GameDefinitionMetadata } from "./metadata.js";
import type { RequirementSet } from "./requirement.js";
import type { Scope } from "./scope.js";

/**
 * How a task's progress is represented and what "done" means for it.
 * Not every task is a simple complete/incomplete checkbox.
 */
export type CompletionModel =
  | { readonly kind: "boolean" }
  | { readonly kind: "counter"; readonly target: number }
  | {
      readonly kind: "accumulated";
      readonly target: number;
      readonly unit?: string;
    }
  | { readonly kind: "threshold"; readonly target: number }
  | { readonly kind: "checklist"; readonly items: readonly string[] }
  | { readonly kind: "staged"; readonly totalStages: number }
  /** Progress is recorded by the player rather than derived automatically. */
  | { readonly kind: "manual" };

/**
 * A task definition: something that can be progressed or completed. Scope
 * (account/server/character) is first-class — see `Scope`. Availability,
 * completion, and reward-cap resets are independent schedules; a task is
 * not required to share one `resetAt` across all three.
 */
export interface Task extends GameDefinitionMetadata {
  readonly id: TaskId;
  readonly name: string;
  readonly scope: Scope;
  /** The activity/activities that progress this task. A task may draw progress from more than one activity. */
  readonly activityIds: readonly ActivityId[];
  readonly completionModel: CompletionModel;
  readonly repeatable: boolean;
  readonly availabilityResetRuleId?: ResetRuleId;
  readonly completionResetRuleId?: ResetRuleId;
  readonly rewardId?: RewardId;
  readonly requirements?: RequirementSet;
  readonly eventId?: EventId;
  readonly eventPhaseId?: EventPhaseId;
  readonly description?: string;
}
