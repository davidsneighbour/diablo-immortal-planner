import type { Character } from "../domain/character.js";
import type {
  ResetRuleId,
  ServerId,
  TaskId,
  TaskInstanceId,
} from "../domain/id.js";
import { createId, slugify } from "../domain/id.js";
import type { ResetRule } from "../domain/reset-rule.js";
import type { Scope } from "../domain/scope.js";
import { scopesEqual } from "../domain/scope.js";
import type { Server } from "../domain/server.js";
import type { Task } from "../domain/task.js";
import type { TaskInstance } from "../domain/task-instance.js";
import {
  getCurrentResetPeriod,
  type ResetPeriodContext,
} from "../time/reset-period.js";
import { createInitialProgress } from "./task-progress.js";

/**
 * The concrete scope targets a task's `ScopeKind` resolves to right now:
 * the single account target for `'account'`, one target per active
 * server for `'server'`, or one target per non-archived character for
 * `'character'`.
 */
export function resolveTaskScopeTargets(
  task: Task,
  servers: readonly Server[],
  characters: readonly Character[],
): readonly Scope[] {
  switch (task.scope) {
    case "account":
      return [{ type: "account" }];
    case "server":
      return servers
        .filter((server) => server.active)
        .map((server) => ({ type: "server", serverId: server.id }));
    case "character":
      return characters
        .filter((character) => character.status !== "archived")
        .map((character) => ({ type: "character", characterId: character.id }));
  }
}

/**
 * The current reset-period key a task's progress belongs to, using its
 * `completionResetRuleId` (falling back to `availabilityResetRuleId` if
 * completion has no rule of its own). Tasks with neither, or whose rule
 * has no periodic reset (`'none'`/`'manual'`), use the constant
 * `'lifetime'` key — permanent tasks get a single instance for their
 * entire lifetime rather than being special-cased outside the normal
 * `TaskInstance` shape.
 */
export function resolveTaskPeriodKey(
  task: Task,
  resetRules: ReadonlyMap<ResetRuleId, ResetRule>,
  servers: ReadonlyMap<ServerId, Server>,
  instant: Date,
  context: ResetPeriodContext = {},
): string {
  const ruleId = task.completionResetRuleId ?? task.availabilityResetRuleId;
  if (!ruleId) {
    return "lifetime";
  }
  const rule = resetRules.get(ruleId);
  if (!rule) {
    throw new Error(
      `Task "${task.id}" references unknown reset rule "${ruleId}"`,
    );
  }
  if (rule.schedule.kind === "none" || rule.schedule.kind === "manual") {
    return "lifetime";
  }
  const server = servers.get(rule.serverId);
  if (!server) {
    throw new Error(
      `Reset rule "${rule.id}" references unknown server "${rule.serverId}"`,
    );
  }
  return getCurrentResetPeriod(rule, server, instant, context).periodKey;
}

function scopeSlug(scope: Scope): string {
  switch (scope.type) {
    case "account":
      return "account";
    case "server":
      return slugify(scope.serverId);
    case "character":
      return slugify(scope.characterId);
  }
}

/** A deterministic id for the (task, scope, period) triple — re-deriving the same triple always yields the same id. */
export function deriveTaskInstanceId(
  taskId: TaskId,
  scope: Scope,
  periodKey: string,
): TaskInstanceId {
  return createId(
    "task-instance",
    `${slugify(taskId)}-${scopeSlug(scope)}-${slugify(periodKey)}`,
  );
}

/** Finds the existing instance (if any) for the given (task, scope, period) triple among prior history. */
export function findExistingTaskInstance(
  existingInstances: readonly TaskInstance[],
  taskId: TaskId,
  scope: Scope,
  periodKey: string,
): TaskInstance | undefined {
  return existingInstances.find(
    (instance) =>
      instance.taskId === taskId &&
      instance.periodKey === periodKey &&
      scopesEqual(instance.scope, scope),
  );
}

export interface TaskInstanceResolutionContext {
  readonly servers: readonly Server[];
  readonly characters: readonly Character[];
  readonly resetRules: ReadonlyMap<ResetRuleId, ResetRule>;
  /** All previously recorded instances for this task, across every past period — never mutated or dropped. */
  readonly existingInstances: readonly TaskInstance[];
  readonly instant: Date;
  readonly periodContext?: ResetPeriodContext;
}

/**
 * Derives the current-period `TaskInstance`(s) for `task`: one per scope
 * target (see `resolveTaskScopeTargets`). Where a matching instance
 * already exists in `context.existingInstances` for the current period,
 * it is returned unchanged; otherwise a new instance is created with
 * initial progress. This function never mutates or removes prior-period
 * instances — callers persist newly created instances alongside existing
 * history, so closing the application across several resets and
 * reopening it later re-derives the correct current instances without
 * having run any intermediate timers.
 */
export function resolveTaskInstances(
  task: Task,
  context: TaskInstanceResolutionContext,
): readonly TaskInstance[] {
  const serversById = new Map(
    context.servers.map((server) => [server.id, server]),
  );
  const targets = resolveTaskScopeTargets(
    task,
    context.servers,
    context.characters,
  );
  const periodKey = resolveTaskPeriodKey(
    task,
    context.resetRules,
    serversById,
    context.instant,
    context.periodContext,
  );
  const createdAt = context.instant.toISOString();

  return targets.map((scope) => {
    const existing = findExistingTaskInstance(
      context.existingInstances,
      task.id,
      scope,
      periodKey,
    );
    if (existing) {
      return existing;
    }
    return {
      id: deriveTaskInstanceId(task.id, scope, periodKey),
      taskId: task.id,
      scope,
      periodKey,
      progress: createInitialProgress(task.completionModel),
      createdAt,
    };
  });
}
