import type { Character } from "../domain/character.js";
import type { Event, EventPhase } from "../domain/event.js";
import type { EventId, EventPhaseId, TaskId } from "../domain/id.js";
import type { ProgressionState } from "../domain/progression.js";
import type { Requirement } from "../domain/requirement.js";
import type { Scope } from "../domain/scope.js";
import { scopesEqual } from "../domain/scope.js";
import type { Server } from "../domain/server.js";
import type { Task } from "../domain/task.js";
import type { TaskInstance } from "../domain/task-instance.js";
import { parseTimeOfDay } from "../domain/time-of-day.js";
import { isEventActive, isEventPhaseActive } from "../time/event.js";
import { getWallClock } from "../time/server-time.js";
import { isProgressComplete } from "./task-progress.js";

export interface RequirementContext {
  readonly instant: Date;
  /** The scope the requirement is being evaluated for — e.g. one specific character. */
  readonly scope: Scope;
  /** Required to evaluate `character-level` and `server` requirements against a character scope. */
  readonly character?: Character;
  /** Required to evaluate `time-window` requirements. */
  readonly server?: Server;
  readonly events: ReadonlyMap<EventId, Event>;
  readonly eventPhases: ReadonlyMap<EventPhaseId, EventPhase>;
  readonly tasks: ReadonlyMap<TaskId, Task>;
  readonly taskInstances: readonly TaskInstance[];
  readonly progressionStates: readonly ProgressionState[];
  /**
   * Resolves requirement kinds this engine cannot evaluate on its own:
   * `item-ownership` (needs an inventory/resource-ownership concept that
   * doesn't exist until Milestone 11's rewards and loot model) and
   * `manual` (inherently player-decided, not automatically derivable).
   * Evaluating either kind without a resolver throws, rather than
   * silently guessing a result.
   */
  readonly resolveUnsupported?: (requirement: Requirement) => boolean;
}

function isWithinTimeWindow(
  server: Server,
  startTime: string,
  endTime: string,
  instant: Date,
): boolean {
  const wall = getWallClock(instant, server.timezone);
  const nowMinutes = wall.hour * 60 + wall.minute;
  const start = parseTimeOfDay(startTime);
  const end = parseTimeOfDay(endTime);
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // The window wraps past midnight, e.g. 22:00-02:00.
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/**
 * Evaluates a single `Requirement` against player state. Milestone 2
 * deliberately left this unimplemented because it needs player state
 * (characters, task completion, progression) that didn't exist until
 * this milestone.
 */
export function isRequirementSatisfied(
  requirement: Requirement,
  context: RequirementContext,
): boolean {
  switch (requirement.type) {
    case "character-level":
      if (!context.character) {
        throw new Error(
          'Evaluating a "character-level" requirement requires a character in context',
        );
      }
      return context.character.level >= requirement.minLevel;

    case "progression-level": {
      const state = context.progressionStates.find(
        (candidate) =>
          candidate.systemId === requirement.systemId &&
          scopesEqual(candidate.scope, context.scope),
      );
      return (state?.currentLevel ?? 0) >= requirement.minLevel;
    }

    case "prerequisite-task": {
      const prerequisiteTask = context.tasks.get(requirement.taskId);
      if (!prerequisiteTask) {
        throw new Error(
          `Requirement references unknown task "${requirement.taskId}"`,
        );
      }
      const instance = context.taskInstances.find(
        (candidate) =>
          candidate.taskId === requirement.taskId &&
          scopesEqual(candidate.scope, context.scope),
      );
      if (!instance) {
        return false;
      }
      return isProgressComplete(
        instance.progress,
        prerequisiteTask.completionModel,
      );
    }

    case "active-event": {
      const event = context.events.get(requirement.eventId);
      if (!event) {
        throw new Error(
          `Requirement references unknown event "${requirement.eventId}"`,
        );
      }
      return isEventActive(event, context.instant);
    }

    case "event-phase": {
      const phase = context.eventPhases.get(requirement.phaseId);
      if (!phase) {
        throw new Error(
          `Requirement references unknown event phase "${requirement.phaseId}"`,
        );
      }
      return isEventPhaseActive(phase, context.instant);
    }

    case "server":
      if (context.scope.type === "server") {
        return context.scope.serverId === requirement.serverId;
      }
      if (context.scope.type === "character") {
        if (!context.character) {
          throw new Error(
            'Evaluating a "server" requirement for a character scope requires a character in context',
          );
        }
        return context.character.serverId === requirement.serverId;
      }
      return false;

    case "character":
      return (
        context.scope.type === "character" &&
        context.scope.characterId === requirement.characterId
      );

    case "time-window":
      if (!context.server) {
        throw new Error(
          'Evaluating a "time-window" requirement requires a server in context',
        );
      }
      return isWithinTimeWindow(
        context.server,
        requirement.startTime,
        requirement.endTime,
        context.instant,
      );

    case "item-ownership":
    case "manual":
      if (!context.resolveUnsupported) {
        throw new Error(
          `Requirement type "${requirement.type}" needs an explicit resolveUnsupported in context — see RequirementContext`,
        );
      }
      return context.resolveUnsupported(requirement);
  }
}

/** True only if every requirement in the set is satisfied (implicit AND, per `RequirementSet`). */
export function areRequirementsSatisfied(
  requirements: readonly Requirement[] | undefined,
  context: RequirementContext,
): boolean {
  if (!requirements) {
    return true;
  }
  return requirements.every((requirement) =>
    isRequirementSatisfied(requirement, context),
  );
}
