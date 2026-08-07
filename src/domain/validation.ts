import type { GameDefinitionSet } from "./definition-set.js";
import type { Id } from "./id.js";
import type { RequirementSet } from "./requirement.js";
import { MAX_CHARACTERS_PER_SERVER } from "./server.js";
import { isValidTimeOfDay } from "./time-of-day.js";

export interface ValidationError {
  readonly code: string;
  readonly message: string;
  /** A rough locator for the offending record, e.g. `task:daily-bounties`. */
  readonly path?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

function findDuplicateIds(
  ids: readonly Id<string>[],
  entityName: string,
): ValidationError[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  return [...duplicates].map((id) => ({
    code: "duplicate-id",
    message: `Duplicate ${entityName} id "${id}"`,
    path: id,
  }));
}

function validateUniqueIds(definitions: GameDefinitionSet): ValidationError[] {
  return [
    ...findDuplicateIds(
      definitions.servers.map((e) => e.id),
      "server",
    ),
    ...findDuplicateIds(
      definitions.characters.map((e) => e.id),
      "character",
    ),
    ...findDuplicateIds(
      definitions.activities.map((e) => e.id),
      "activity",
    ),
    ...findDuplicateIds(
      definitions.tasks.map((e) => e.id),
      "task",
    ),
    ...findDuplicateIds(
      definitions.events.map((e) => e.id),
      "event",
    ),
    ...findDuplicateIds(
      definitions.eventPhases.map((e) => e.id),
      "event phase",
    ),
    ...findDuplicateIds(
      definitions.resources.map((e) => e.id),
      "resource",
    ),
    ...findDuplicateIds(
      definitions.rewards.map((e) => e.id),
      "reward",
    ),
    ...findDuplicateIds(
      definitions.rewardCaps.map((e) => e.id),
      "reward cap",
    ),
    ...findDuplicateIds(
      definitions.resetRules.map((e) => e.id),
      "reset rule",
    ),
    ...findDuplicateIds(
      definitions.progressionSystems.map((e) => e.id),
      "progression system",
    ),
    ...findDuplicateIds(
      definitions.dependencies.map((e) => e.id),
      "dependency",
    ),
  ];
}

function validateCharacterLimits(
  definitions: GameDefinitionSet,
): ValidationError[] {
  const countByServer = new Map<string, number>();
  for (const character of definitions.characters) {
    if (character.status === "archived") {
      continue;
    }
    countByServer.set(
      character.serverId,
      (countByServer.get(character.serverId) ?? 0) + 1,
    );
  }
  const errors: ValidationError[] = [];
  for (const [serverId, count] of countByServer) {
    if (count > MAX_CHARACTERS_PER_SERVER) {
      errors.push({
        code: "too-many-characters",
        message: `Server "${serverId}" has ${count} non-archived characters, exceeding the limit of ${MAX_CHARACTERS_PER_SERVER}`,
        path: serverId,
      });
    }
  }
  return errors;
}

interface ReferenceIndex {
  readonly serverIds: ReadonlySet<string>;
  readonly characterIds: ReadonlySet<string>;
  readonly activityIds: ReadonlySet<string>;
  readonly taskIds: ReadonlySet<string>;
  readonly eventIds: ReadonlySet<string>;
  readonly eventPhaseIds: ReadonlySet<string>;
  readonly resourceIds: ReadonlySet<string>;
  readonly rewardIds: ReadonlySet<string>;
  readonly rewardCapIds: ReadonlySet<string>;
  readonly resetRuleIds: ReadonlySet<string>;
  readonly progressionSystemIds: ReadonlySet<string>;
}

function buildReferenceIndex(definitions: GameDefinitionSet): ReferenceIndex {
  return {
    serverIds: new Set(definitions.servers.map((e) => e.id)),
    characterIds: new Set(definitions.characters.map((e) => e.id)),
    activityIds: new Set(definitions.activities.map((e) => e.id)),
    taskIds: new Set(definitions.tasks.map((e) => e.id)),
    eventIds: new Set(definitions.events.map((e) => e.id)),
    eventPhaseIds: new Set(definitions.eventPhases.map((e) => e.id)),
    resourceIds: new Set(definitions.resources.map((e) => e.id)),
    rewardIds: new Set(definitions.rewards.map((e) => e.id)),
    rewardCapIds: new Set(definitions.rewardCaps.map((e) => e.id)),
    resetRuleIds: new Set(definitions.resetRules.map((e) => e.id)),
    progressionSystemIds: new Set(
      definitions.progressionSystems.map((e) => e.id),
    ),
  };
}

function checkRef(
  exists: boolean,
  kind: string,
  id: string,
  path: string,
  errors: ValidationError[],
): void {
  if (!exists) {
    errors.push({
      code: "unknown-reference",
      message: `Unknown ${kind} reference "${id}"`,
      path,
    });
  }
}

function validateRequirementRefs(
  requirements: RequirementSet | undefined,
  index: ReferenceIndex,
  pathPrefix: string,
  errors: ValidationError[],
): void {
  if (!requirements) {
    return;
  }
  requirements.forEach((requirement, position) => {
    const path = `${pathPrefix}.requirements[${position}]`;
    switch (requirement.type) {
      case "progression-level":
        checkRef(
          index.progressionSystemIds.has(requirement.systemId),
          "progression system",
          requirement.systemId,
          path,
          errors,
        );
        break;
      case "prerequisite-task":
        checkRef(
          index.taskIds.has(requirement.taskId),
          "task",
          requirement.taskId,
          path,
          errors,
        );
        break;
      case "active-event":
        checkRef(
          index.eventIds.has(requirement.eventId),
          "event",
          requirement.eventId,
          path,
          errors,
        );
        break;
      case "event-phase":
        checkRef(
          index.eventIds.has(requirement.eventId),
          "event",
          requirement.eventId,
          path,
          errors,
        );
        checkRef(
          index.eventPhaseIds.has(requirement.phaseId),
          "event phase",
          requirement.phaseId,
          path,
          errors,
        );
        break;
      case "server":
        checkRef(
          index.serverIds.has(requirement.serverId),
          "server",
          requirement.serverId,
          path,
          errors,
        );
        break;
      case "character":
        checkRef(
          index.characterIds.has(requirement.characterId),
          "character",
          requirement.characterId,
          path,
          errors,
        );
        break;
      case "item-ownership":
        checkRef(
          index.resourceIds.has(requirement.resourceId),
          "resource",
          requirement.resourceId,
          path,
          errors,
        );
        break;
      case "character-level":
      case "time-window":
      case "manual":
        break;
    }
  });
}

function validateReferences(definitions: GameDefinitionSet): ValidationError[] {
  const index = buildReferenceIndex(definitions);
  const errors: ValidationError[] = [];

  for (const character of definitions.characters) {
    checkRef(
      index.serverIds.has(character.serverId),
      "server",
      character.serverId,
      character.id,
      errors,
    );
  }

  for (const activity of definitions.activities) {
    validateRequirementRefs(activity.requirements, index, activity.id, errors);
  }

  for (const task of definitions.tasks) {
    for (const activityId of task.activityIds) {
      checkRef(
        index.activityIds.has(activityId),
        "activity",
        activityId,
        task.id,
        errors,
      );
    }
    if (task.availabilityResetRuleId) {
      checkRef(
        index.resetRuleIds.has(task.availabilityResetRuleId),
        "reset rule",
        task.availabilityResetRuleId,
        task.id,
        errors,
      );
    }
    if (task.completionResetRuleId) {
      checkRef(
        index.resetRuleIds.has(task.completionResetRuleId),
        "reset rule",
        task.completionResetRuleId,
        task.id,
        errors,
      );
    }
    if (task.rewardId) {
      checkRef(
        index.rewardIds.has(task.rewardId),
        "reward",
        task.rewardId,
        task.id,
        errors,
      );
    }
    if (task.eventId) {
      checkRef(
        index.eventIds.has(task.eventId),
        "event",
        task.eventId,
        task.id,
        errors,
      );
    }
    if (task.eventPhaseId) {
      checkRef(
        index.eventPhaseIds.has(task.eventPhaseId),
        "event phase",
        task.eventPhaseId,
        task.id,
        errors,
      );
    }
    validateRequirementRefs(task.requirements, index, task.id, errors);
  }

  for (const eventPhase of definitions.eventPhases) {
    checkRef(
      index.eventIds.has(eventPhase.eventId),
      "event",
      eventPhase.eventId,
      eventPhase.id,
      errors,
    );
  }

  for (const reward of definitions.rewards) {
    for (const entry of reward.entries) {
      checkRef(
        index.resourceIds.has(entry.resourceId),
        "resource",
        entry.resourceId,
        reward.id,
        errors,
      );
    }
    if (reward.capId) {
      checkRef(
        index.rewardCapIds.has(reward.capId),
        "reward cap",
        reward.capId,
        reward.id,
        errors,
      );
    }
  }

  for (const rewardCap of definitions.rewardCaps) {
    if (rewardCap.period === "custom") {
      if (!rewardCap.resetRuleId) {
        errors.push({
          code: "missing-reset-rule",
          message: `Reward cap "${rewardCap.id}" has period "custom" but no resetRuleId`,
          path: rewardCap.id,
        });
      } else {
        checkRef(
          index.resetRuleIds.has(rewardCap.resetRuleId),
          "reset rule",
          rewardCap.resetRuleId,
          rewardCap.id,
          errors,
        );
      }
    }
  }

  for (const resetRule of definitions.resetRules) {
    checkRef(
      index.serverIds.has(resetRule.serverId),
      "server",
      resetRule.serverId,
      resetRule.id,
      errors,
    );
    if (resetRule.schedule.kind === "event-specific") {
      checkRef(
        index.eventIds.has(resetRule.schedule.eventId),
        "event",
        resetRule.schedule.eventId,
        resetRule.id,
        errors,
      );
    }
  }

  for (const dependency of definitions.dependencies) {
    checkRef(
      index.taskIds.has(dependency.fromTaskId),
      "task",
      dependency.fromTaskId,
      dependency.id,
      errors,
    );
    checkRef(
      index.taskIds.has(dependency.toTaskId),
      "task",
      dependency.toTaskId,
      dependency.id,
      errors,
    );
  }

  return errors;
}

function validateResetRules(definitions: GameDefinitionSet): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const resetRule of definitions.resetRules) {
    const { schedule } = resetRule;
    switch (schedule.kind) {
      case "every-n-game-days":
        if (schedule.n <= 0) {
          errors.push({
            code: "invalid-reset-rule",
            message: `Reset rule "${resetRule.id}" has non-positive "n" (${schedule.n})`,
            path: resetRule.id,
          });
        }
        break;
      case "weekdays":
        if (
          schedule.weekdays.length === 0 ||
          schedule.weekdays.some((day) => day < 0 || day > 6)
        ) {
          errors.push({
            code: "invalid-reset-rule",
            message: `Reset rule "${resetRule.id}" has an invalid weekdays list`,
            path: resetRule.id,
          });
        }
        break;
      case "multiple-per-day":
        if (
          schedule.times.length === 0 ||
          schedule.times.some((time) => !isValidTimeOfDay(time))
        ) {
          errors.push({
            code: "invalid-reset-rule",
            message: `Reset rule "${resetRule.id}" has an invalid or empty times list`,
            path: resetRule.id,
          });
        }
        break;
      case "weekly":
        if (schedule.weekday < 0 || schedule.weekday > 6) {
          errors.push({
            code: "invalid-reset-rule",
            message: `Reset rule "${resetRule.id}" has an out-of-range weekday (${schedule.weekday})`,
            path: resetRule.id,
          });
        }
        break;
      case "monthly":
        if (schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
          errors.push({
            code: "invalid-reset-rule",
            message: `Reset rule "${resetRule.id}" has an out-of-range dayOfMonth (${schedule.dayOfMonth})`,
            path: resetRule.id,
          });
        }
        break;
      case "fixed-period":
        if (schedule.endsAt <= schedule.startsAt) {
          errors.push({
            code: "invalid-reset-rule",
            message: `Reset rule "${resetRule.id}" has endsAt not after startsAt`,
            path: resetRule.id,
          });
        }
        break;
      case "rolling":
        if (schedule.durationHours <= 0) {
          errors.push({
            code: "invalid-reset-rule",
            message: `Reset rule "${resetRule.id}" has non-positive durationHours (${schedule.durationHours})`,
            path: resetRule.id,
          });
        }
        break;
      case "every-game-day":
      case "event-specific":
      case "none":
      case "manual":
        break;
    }
  }
  return errors;
}

/**
 * Detects cycles in the task dependency graph via depth-first search with
 * a three-colour visited set. Dependencies must form a DAG regardless of
 * kind (`requires`, `unlocks`, `progresses`, `blocks`, `supersedes`).
 */
function validateDependencyGraph(
  definitions: GameDefinitionSet,
): ValidationError[] {
  const edges = new Map<string, string[]>();
  for (const dependency of definitions.dependencies) {
    const existing = edges.get(dependency.fromTaskId);
    if (existing) {
      existing.push(dependency.toTaskId);
    } else {
      edges.set(dependency.fromTaskId, [dependency.toTaskId]);
    }
  }

  const unvisited = 0;
  const visiting = 1;
  const visited = 2;
  const state = new Map<string, 0 | 1 | 2>();
  const errors: ValidationError[] = [];
  let cycleReported = false;

  function visit(taskId: string, path: string[]): void {
    if (cycleReported) {
      return;
    }
    const current = state.get(taskId) ?? unvisited;
    if (current === visiting) {
      errors.push({
        code: "circular-dependency",
        message: `Circular task dependency detected: ${[...path, taskId].join(" -> ")}`,
        path: taskId,
      });
      cycleReported = true;
      return;
    }
    if (current === visited) {
      return;
    }
    state.set(taskId, visiting);
    for (const next of edges.get(taskId) ?? []) {
      visit(next, [...path, taskId]);
      if (cycleReported) {
        return;
      }
    }
    state.set(taskId, visited);
  }

  for (const taskId of edges.keys()) {
    if ((state.get(taskId) ?? unvisited) === unvisited) {
      visit(taskId, []);
    }
  }

  return errors;
}

/**
 * Validates a full game-definition set: duplicate IDs, unknown
 * references, invalid dependency graphs, more-than-five-characters per
 * server, and structurally invalid reset configurations. Intended to run
 * at build/dev time so invalid game data fails loudly rather than
 * producing mysterious runtime behaviour.
 */
export function validateDefinitionSet(
  definitions: GameDefinitionSet,
): ValidationResult {
  const errors = [
    ...validateUniqueIds(definitions),
    ...validateCharacterLimits(definitions),
    ...validateReferences(definitions),
    ...validateResetRules(definitions),
    ...validateDependencyGraph(definitions),
  ];
  return { valid: errors.length === 0, errors };
}
