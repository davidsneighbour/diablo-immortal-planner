import type { EventId, EventPhaseId } from "./id.js";
import type { GameDefinitionMetadata } from "./metadata.js";

/**
 * A stage within an event whose available activities or rewards change
 * over its lifetime. Events are not required to have phases.
 */
export interface EventPhase {
  readonly id: EventPhaseId;
  readonly eventId: EventId;
  readonly name: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly order: number;
}

/**
 * A first-class object with its own arbitrary start/end datetimes — not
 * merely a category attached to tasks. Tasks reference an event (see
 * `Task.eventId`) rather than the event embedding its own task list, so
 * an event's daily and cumulative tasks use the same task/task-instance
 * machinery as everything else.
 */
export interface Event extends GameDefinitionMetadata {
  readonly id: EventId;
  readonly name: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly hasPhases: boolean;
  readonly description?: string;
}
