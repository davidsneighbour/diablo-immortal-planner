import type { CompletionModel } from "../domain/task.js";
import type { TaskInstance, TaskProgress } from "../domain/task-instance.js";
import type { PlayerState } from "../persistence/schema.js";
import { isProgressComplete } from "./task-progress.js";

/**
 * Applies `newProgress` to `instance`, setting `completedAt` the moment
 * it becomes complete and clearing it if progress moves back to
 * incomplete (e.g. a counter decremented below target) — `completedAt`
 * always reflects the instance's current state, never a stale one.
 */
export function recordProgress(
  instance: TaskInstance,
  newProgress: TaskProgress,
  model: CompletionModel,
  instant: Date,
): TaskInstance {
  const complete = isProgressComplete(newProgress, model);
  const { completedAt: _staleCompletedAt, ...rest } = instance;
  return {
    ...rest,
    progress: newProgress,
    ...(complete ? { completedAt: instant.toISOString() } : {}),
  };
}

/**
 * Inserts `instance` into `state.taskInstances`, or replaces the
 * existing record with the same id. Needed because `resolveTaskInstances`
 * (Milestone 3) can hand back newly-derived instances that don't exist in
 * storage yet — recording progress on one must persist it for the first
 * time, not just update an existing row.
 */
export function upsertTaskInstance(
  state: PlayerState,
  instance: TaskInstance,
): PlayerState {
  const exists = state.taskInstances.some(
    (candidate) => candidate.id === instance.id,
  );
  return {
    ...state,
    taskInstances: exists
      ? state.taskInstances.map((candidate) =>
          candidate.id === instance.id ? instance : candidate,
        )
      : [...state.taskInstances, instance],
  };
}
