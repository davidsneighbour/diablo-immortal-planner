import type { DependencyId, TaskId } from "./id.js";

export type DependencyKind =
  | "requires"
  | "unlocks"
  | "progresses"
  | "blocks"
  | "supersedes";

/**
 * A directed edge in the task dependency graph. A storyline is therefore
 * a graph (or ordered sequence, via `progresses`/`unlocks` chains) of
 * tasks rather than a hard-coded module. The graph must not contain
 * cycles — see `validateDependencyGraph`.
 */
export interface Dependency {
  readonly id: DependencyId;
  readonly kind: DependencyKind;
  readonly fromTaskId: TaskId;
  readonly toTaskId: TaskId;
}
