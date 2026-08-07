import type { CompletionModel } from "../domain/task.js";
import type { TaskProgress } from "../domain/task-instance.js";

function clampMin0(value: number): number {
  return Math.max(value, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The zero-value progress matching a task's `CompletionModel`. */
export function createInitialProgress(model: CompletionModel): TaskProgress {
  switch (model.kind) {
    case "boolean":
      return { kind: "boolean", complete: false };
    case "counter":
      return { kind: "counter", current: 0, target: model.target };
    case "accumulated":
      return { kind: "accumulated", current: 0, target: model.target };
    case "threshold":
      return { kind: "threshold", current: 0, target: model.target };
    case "checklist":
      return { kind: "checklist", completedItems: [] };
    case "staged":
      return {
        kind: "staged",
        currentStage: 0,
        totalStages: model.totalStages,
      };
    case "manual":
      return { kind: "manual", state: "" };
  }
}

/**
 * Whether `progress` currently counts as done, given the `model` it was
 * created from (required to interpret `checklist` progress, since the
 * full item list lives on the model, not the progress record).
 *
 * `manual` progress has no generally decidable completeness — its state
 * is a free-form string for cases that don't fit the other models — so
 * this always returns `false` for it. Callers that need a manual task to
 * report done/not-done should encode that convention in the state string
 * themselves and check it directly.
 */
export function isProgressComplete(
  progress: TaskProgress,
  model: CompletionModel,
): boolean {
  switch (progress.kind) {
    case "boolean":
      return progress.complete;
    case "counter":
      return progress.current >= progress.target;
    case "accumulated":
      return progress.current >= progress.target;
    case "threshold":
      return progress.current >= progress.target;
    case "staged":
      return progress.currentStage >= progress.totalStages;
    case "checklist":
      return (
        model.kind === "checklist" &&
        model.items.every((item) => progress.completedItems.includes(item))
      );
    case "manual":
      return false;
  }
}

export function setBooleanProgress(
  complete: boolean,
): Extract<TaskProgress, { kind: "boolean" }> {
  return { kind: "boolean", complete };
}

/** Counters represent a capped count of repeatable actions — clamped to `[0, target]`. */
export function setCounterProgress(
  progress: Extract<TaskProgress, { kind: "counter" }>,
  current: number,
): Extract<TaskProgress, { kind: "counter" }> {
  return { ...progress, current: clamp(current, 0, progress.target) };
}

export function incrementCounterProgress(
  progress: Extract<TaskProgress, { kind: "counter" }>,
  delta = 1,
): Extract<TaskProgress, { kind: "counter" }> {
  return setCounterProgress(progress, progress.current + delta);
}

/** Accumulated quantities may exceed `target` (e.g. collecting more than the goal amount) — only clamped at 0. */
export function setAccumulatedProgress(
  progress: Extract<TaskProgress, { kind: "accumulated" }>,
  current: number,
): Extract<TaskProgress, { kind: "accumulated" }> {
  return { ...progress, current: clampMin0(current) };
}

/** Thresholds (e.g. "hold at least 500 currency") may exceed `target` — only clamped at 0. */
export function setThresholdProgress(
  progress: Extract<TaskProgress, { kind: "threshold" }>,
  current: number,
): Extract<TaskProgress, { kind: "threshold" }> {
  return { ...progress, current: clampMin0(current) };
}

export function setStageProgress(
  progress: Extract<TaskProgress, { kind: "staged" }>,
  currentStage: number,
): Extract<TaskProgress, { kind: "staged" }> {
  return {
    ...progress,
    currentStage: clamp(currentStage, 0, progress.totalStages),
  };
}

export function advanceStageProgress(
  progress: Extract<TaskProgress, { kind: "staged" }>,
  delta = 1,
): Extract<TaskProgress, { kind: "staged" }> {
  return setStageProgress(progress, progress.currentStage + delta);
}

/** Adds or removes `item` from the completed set. Callers are responsible for validating `item` against the task's `CompletionModel.items`. */
export function toggleChecklistItem(
  progress: Extract<TaskProgress, { kind: "checklist" }>,
  item: string,
): Extract<TaskProgress, { kind: "checklist" }> {
  const isCompleted = progress.completedItems.includes(item);
  return {
    kind: "checklist",
    completedItems: isCompleted
      ? progress.completedItems.filter((completed) => completed !== item)
      : [...progress.completedItems, item],
  };
}

export function setManualState(
  state: string,
): Extract<TaskProgress, { kind: "manual" }> {
  return { kind: "manual", state };
}
