import type { Event, EventPhase } from "../domain/event.js";

/** True if `instant` falls within `event`'s [startsAt, endsAt) window. */
export function isEventActive(event: Event, instant: Date): boolean {
  const time = instant.getTime();
  return (
    time >= new Date(event.startsAt).getTime() &&
    time < new Date(event.endsAt).getTime()
  );
}

/** True if `instant` falls within `phase`'s [startsAt, endsAt) window. */
export function isEventPhaseActive(phase: EventPhase, instant: Date): boolean {
  const time = instant.getTime();
  return (
    time >= new Date(phase.startsAt).getTime() &&
    time < new Date(phase.endsAt).getTime()
  );
}

/** All events active at `instant`. */
export function getActiveEvents(
  events: readonly Event[],
  instant: Date,
): readonly Event[] {
  return events.filter((event) => isEventActive(event, instant));
}

/** The phase of `event` active at `instant`, if any. */
export function getActiveEventPhase(
  phases: readonly EventPhase[],
  eventId: Event["id"],
  instant: Date,
): EventPhase | undefined {
  return phases.find(
    (phase) => phase.eventId === eventId && isEventPhaseActive(phase, instant),
  );
}
