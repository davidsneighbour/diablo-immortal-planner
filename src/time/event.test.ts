import { describe, expect, it } from "vitest";
import type { Event, EventPhase } from "../domain/event.js";
import { createId } from "../domain/id.js";
import {
  getActiveEventPhase,
  getActiveEvents,
  isEventActive,
  isEventPhaseActive,
} from "./event.js";

const event: Event = {
  id: createId("event", "shadow-invasion"),
  name: "Shadow Invasion",
  startsAt: "2026-08-10T03:00:00+07:00",
  endsAt: "2026-08-17T03:00:00+07:00",
  hasPhases: true,
};

describe("isEventActive", () => {
  it("is inclusive of startsAt and exclusive of endsAt", () => {
    expect(isEventActive(event, new Date(event.startsAt))).toBe(true);
    expect(isEventActive(event, new Date(event.endsAt))).toBe(false);
  });

  it("is false before the event starts and after it ends", () => {
    expect(isEventActive(event, new Date("2026-08-09T00:00:00Z"))).toBe(false);
    expect(isEventActive(event, new Date("2026-08-18T00:00:00Z"))).toBe(false);
  });

  it("is true during the event", () => {
    expect(isEventActive(event, new Date("2026-08-12T00:00:00Z"))).toBe(true);
  });
});

describe("getActiveEvents", () => {
  const other: Event = {
    id: createId("event", "double-xp"),
    name: "Double XP",
    startsAt: "2026-09-01T03:00:00+07:00",
    endsAt: "2026-09-08T03:00:00+07:00",
    hasPhases: false,
  };

  it("returns only currently active events", () => {
    expect(
      getActiveEvents([event, other], new Date("2026-08-12T00:00:00Z")),
    ).toEqual([event]);
    expect(
      getActiveEvents([event, other], new Date("2026-09-03T00:00:00Z")),
    ).toEqual([other]);
    expect(
      getActiveEvents([event, other], new Date("2026-01-01T00:00:00Z")),
    ).toEqual([]);
  });
});

describe("event phases", () => {
  const phase1: EventPhase = {
    id: createId("event-phase", "shadow-invasion-1"),
    eventId: event.id,
    name: "Phase 1",
    startsAt: "2026-08-10T03:00:00+07:00",
    endsAt: "2026-08-13T03:00:00+07:00",
    order: 1,
  };
  const phase2: EventPhase = {
    id: createId("event-phase", "shadow-invasion-2"),
    eventId: event.id,
    name: "Phase 2",
    startsAt: "2026-08-13T03:00:00+07:00",
    endsAt: "2026-08-17T03:00:00+07:00",
    order: 2,
  };

  it("isEventPhaseActive follows the same [start, end) rule as events", () => {
    expect(isEventPhaseActive(phase1, new Date("2026-08-12T00:00:00Z"))).toBe(
      true,
    );
    expect(isEventPhaseActive(phase1, new Date(phase1.endsAt))).toBe(false);
  });

  it("getActiveEventPhase finds the phase covering the given instant", () => {
    const active = getActiveEventPhase(
      [phase1, phase2],
      event.id,
      new Date("2026-08-15T00:00:00Z"),
    );
    expect(active?.id).toBe(phase2.id);
  });

  it("getActiveEventPhase returns undefined between phases or for unrelated events", () => {
    expect(
      getActiveEventPhase(
        [phase1, phase2],
        event.id,
        new Date("2026-01-01T00:00:00Z"),
      ),
    ).toBeUndefined();
    expect(
      getActiveEventPhase(
        [phase1, phase2],
        createId("event", "other"),
        new Date("2026-08-12T00:00:00Z"),
      ),
    ).toBeUndefined();
  });
});
