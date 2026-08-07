import type { Event, EventPhase } from "../../domain/event.js";
import { createId } from "../../domain/id.js";

const fixtureNotes =
  "Synthetic fixture data for Milestone 6 — not verified against real Diablo Immortal mechanics.";

/** A multi-day event with two phases. */
export const shadowInvasionEvent: Event = {
  id: createId("event", "shadow-invasion"),
  name: "Shadow Invasion",
  startsAt: "2026-08-10T03:00:00+07:00",
  endsAt: "2026-08-17T03:00:00+07:00",
  hasPhases: true,
  confidence: "unknown",
  notes: fixtureNotes,
};

export const shadowInvasionPhase1: EventPhase = {
  id: createId("event-phase", "shadow-invasion-phase-1"),
  eventId: shadowInvasionEvent.id,
  name: "Phase 1: Incursion",
  startsAt: "2026-08-10T03:00:00+07:00",
  endsAt: "2026-08-13T03:00:00+07:00",
  order: 1,
};

export const shadowInvasionPhase2: EventPhase = {
  id: createId("event-phase", "shadow-invasion-phase-2"),
  eventId: shadowInvasionEvent.id,
  name: "Phase 2: Reckoning",
  startsAt: "2026-08-13T03:00:00+07:00",
  endsAt: "2026-08-17T03:00:00+07:00",
  order: 2,
};

export const fixtureEvents: readonly Event[] = [shadowInvasionEvent];
export const fixtureEventPhases: readonly EventPhase[] = [
  shadowInvasionPhase1,
  shadowInvasionPhase2,
];
