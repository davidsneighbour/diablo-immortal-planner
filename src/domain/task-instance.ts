import type { TaskId, TaskInstanceId } from "./id.js";
import type { Scope } from "./scope.js";

/** Recorded player progress, shaped to match the task's `CompletionModel`. */
export type TaskProgress =
  | { readonly kind: "boolean"; readonly complete: boolean }
  | {
      readonly kind: "counter";
      readonly current: number;
      readonly target: number;
    }
  | {
      readonly kind: "accumulated";
      readonly current: number;
      readonly target: number;
    }
  | {
      readonly kind: "threshold";
      readonly current: number;
      readonly target: number;
    }
  | { readonly kind: "checklist"; readonly completedItems: readonly string[] }
  | {
      readonly kind: "staged";
      readonly currentStage: number;
      readonly totalStages: number;
    }
  | { readonly kind: "manual"; readonly state: string };

/**
 * A task definition's occurrence within a particular reset period — e.g.
 * "Bounties for game day 2026-08-08" as distinct from the "Bounties" task
 * definition. Resets create a new instance; they must never overwrite or
 * discard a prior instance's recorded progress, which remains as history.
 */
export interface TaskInstance {
  readonly id: TaskInstanceId;
  readonly taskId: TaskId;
  /** The resolved scope this instance belongs to (e.g. one specific character for a character-scoped task). */
  readonly scope: Scope;
  /** A stable key identifying the reset period this instance belongs to, e.g. "2026-08-08" or "2026-W32". */
  readonly periodKey: string;
  readonly progress: TaskProgress;
  readonly rewardClaimed?: boolean;
  readonly completedAt?: string;
  readonly createdAt: string;
}
