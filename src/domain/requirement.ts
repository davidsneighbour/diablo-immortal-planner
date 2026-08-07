import type {
  CharacterId,
  EventId,
  EventPhaseId,
  ProgressionSystemId,
  ResourceId,
  ServerId,
  TaskId,
} from "./id.js";

/**
 * An extensible requirement rule, rather than a fixed set of booleans on
 * the entity it gates. New requirement kinds can be added as new game
 * mechanics are discovered.
 */
export type Requirement =
  | { readonly type: "character-level"; readonly minLevel: number }
  | {
      readonly type: "progression-level";
      readonly systemId: ProgressionSystemId;
      readonly minLevel: number;
    }
  | { readonly type: "prerequisite-task"; readonly taskId: TaskId }
  | { readonly type: "active-event"; readonly eventId: EventId }
  | {
      readonly type: "event-phase";
      readonly eventId: EventId;
      readonly phaseId: EventPhaseId;
    }
  /** Daily server-local time window, "HH:MM" 24-hour. */
  | {
      readonly type: "time-window";
      readonly startTime: string;
      readonly endTime: string;
    }
  | { readonly type: "server"; readonly serverId: ServerId }
  | { readonly type: "character"; readonly characterId: CharacterId }
  | {
      readonly type: "item-ownership";
      readonly resourceId: ResourceId;
      readonly minQuantity?: number;
    }
  /** An escape hatch for conditions the model doesn't yet represent structurally. */
  | { readonly type: "manual"; readonly description: string };

/** A set of requirements, all of which must hold (implicit AND). */
export type RequirementSet = readonly Requirement[];
