import type { Event, EventPhase } from "../domain/event.js";
import type { EventId, EventPhaseId, ResetRuleId } from "../domain/id.js";
import type { ResetRule } from "../domain/reset-rule.js";
import type { Task } from "../domain/task.js";
import { isEventActive, isEventPhaseActive } from "./event.js";

export interface TaskAvailabilityContext {
  readonly instant: Date;
  readonly events: ReadonlyMap<EventId, Event>;
  readonly eventPhases: ReadonlyMap<EventPhaseId, EventPhase>;
  readonly resetRules: ReadonlyMap<ResetRuleId, ResetRule>;
}

/**
 * Whether `task` is currently available on scheduling grounds alone —
 * its linked event/phase (if any) being active, and its
 * `availabilityResetRuleId`'s schedule window (if bounded) not having
 * closed. This does not evaluate `Task.requirements`: those can depend on
 * character level, prerequisites, item ownership, and other player state
 * that doesn't exist until Milestone 3+.
 *
 * Most `ResetSchedule` kinds describe reset *cadence* (how progress is
 * chunked into periods), not an availability on/off window, so only
 * `fixed-period` and `event-specific` schedules can make this return
 * false via `availabilityResetRuleId` — everything else means the task
 * is continuously available between resets.
 */
export function isTaskAvailable(
  task: Task,
  context: TaskAvailabilityContext,
): boolean {
  if (task.eventId) {
    const event = context.events.get(task.eventId);
    if (!event) {
      throw new Error(
        `Task "${task.id}" references unknown event "${task.eventId}"`,
      );
    }
    if (!isEventActive(event, context.instant)) {
      return false;
    }
    if (task.eventPhaseId) {
      const phase = context.eventPhases.get(task.eventPhaseId);
      if (!phase) {
        throw new Error(
          `Task "${task.id}" references unknown event phase "${task.eventPhaseId}"`,
        );
      }
      if (!isEventPhaseActive(phase, context.instant)) {
        return false;
      }
    }
  }

  if (task.availabilityResetRuleId) {
    const rule = context.resetRules.get(task.availabilityResetRuleId);
    if (!rule) {
      throw new Error(
        `Task "${task.id}" references unknown reset rule "${task.availabilityResetRuleId}"`,
      );
    }
    if (rule.schedule.kind === "fixed-period") {
      const time = context.instant.getTime();
      if (
        time < new Date(rule.schedule.startsAt).getTime() ||
        time >= new Date(rule.schedule.endsAt).getTime()
      ) {
        return false;
      }
    } else if (rule.schedule.kind === "event-specific") {
      const event = context.events.get(rule.schedule.eventId);
      if (!event) {
        throw new Error(
          `Reset rule "${rule.id}" references unknown event "${rule.schedule.eventId}"`,
        );
      }
      if (!isEventActive(event, context.instant)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * True only for tasks with a bounded window (a linked event/phase, or an
 * `availabilityResetRuleId` with a `fixed-period` schedule) once that
 * window has passed. Recurring tasks are never "expired" — they simply
 * await their next reset.
 */
export function isTaskExpired(
  task: Task,
  context: TaskAvailabilityContext,
): boolean {
  const time = context.instant.getTime();

  if (task.eventId) {
    const event = context.events.get(task.eventId);
    if (!event) {
      throw new Error(
        `Task "${task.id}" references unknown event "${task.eventId}"`,
      );
    }
    if (task.eventPhaseId) {
      const phase = context.eventPhases.get(task.eventPhaseId);
      if (!phase) {
        throw new Error(
          `Task "${task.id}" references unknown event phase "${task.eventPhaseId}"`,
        );
      }
      return time >= new Date(phase.endsAt).getTime();
    }
    return time >= new Date(event.endsAt).getTime();
  }

  if (task.availabilityResetRuleId) {
    const rule = context.resetRules.get(task.availabilityResetRuleId);
    if (!rule) {
      throw new Error(
        `Task "${task.id}" references unknown reset rule "${task.availabilityResetRuleId}"`,
      );
    }
    if (rule.schedule.kind === "fixed-period") {
      return time >= new Date(rule.schedule.endsAt).getTime();
    }
  }

  return false;
}
