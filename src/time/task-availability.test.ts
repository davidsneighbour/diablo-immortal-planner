import { describe, expect, it } from "vitest";
import type { Event, EventPhase } from "../domain/event.js";
import { createId } from "../domain/id.js";
import type { ResetRule } from "../domain/reset-rule.js";
import type { Task } from "../domain/task.js";
import {
  isTaskAvailable,
  isTaskExpired,
  type TaskAvailabilityContext,
} from "./task-availability.js";

function contextAt(
  instant: Date,
  overrides: Partial<Omit<TaskAvailabilityContext, "instant">> = {},
): TaskAvailabilityContext {
  return {
    instant,
    events: new Map(),
    eventPhases: new Map(),
    resetRules: new Map(),
    ...overrides,
  };
}

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: createId("task", "daily-bounties"),
    name: "Daily bounties",
    scope: { type: "account" },
    activityIds: [],
    completionModel: { kind: "boolean" },
    repeatable: true,
    ...overrides,
  };
}

describe("isTaskAvailable", () => {
  it("is available with no event or availabilityResetRuleId", () => {
    expect(isTaskAvailable(baseTask(), contextAt(new Date()))).toBe(true);
  });

  it("is available continuously for a recurring availabilityResetRuleId (every-game-day)", () => {
    const rule: ResetRule = {
      id: createId("reset-rule", "daily"),
      serverId: createId("server", "sanctuary-1"),
      schedule: { kind: "every-game-day" },
    };
    const task = baseTask({ availabilityResetRuleId: rule.id });
    const context = contextAt(new Date(), {
      resetRules: new Map([[rule.id, rule]]),
    });
    expect(isTaskAvailable(task, context)).toBe(true);
  });

  it("is unavailable outside a fixed-period availabilityResetRuleId window", () => {
    const rule: ResetRule = {
      id: createId("reset-rule", "window"),
      serverId: createId("server", "sanctuary-1"),
      schedule: {
        kind: "fixed-period",
        startsAt: "2026-08-10T00:00:00Z",
        endsAt: "2026-08-17T00:00:00Z",
      },
    };
    const task = baseTask({ availabilityResetRuleId: rule.id });
    const resetRules = new Map([[rule.id, rule]]);
    expect(
      isTaskAvailable(
        task,
        contextAt(new Date("2026-08-12T00:00:00Z"), { resetRules }),
      ),
    ).toBe(true);
    expect(
      isTaskAvailable(
        task,
        contextAt(new Date("2026-08-01T00:00:00Z"), { resetRules }),
      ),
    ).toBe(false);
    expect(
      isTaskAvailable(
        task,
        contextAt(new Date("2026-08-20T00:00:00Z"), { resetRules }),
      ),
    ).toBe(false);
  });

  it("is unavailable when the linked event is not active", () => {
    const event: Event = {
      id: createId("event", "shadow-invasion"),
      name: "Shadow Invasion",
      startsAt: "2026-08-10T00:00:00Z",
      endsAt: "2026-08-17T00:00:00Z",
      hasPhases: false,
    };
    const task = baseTask({ eventId: event.id });
    const events = new Map([[event.id, event]]);
    expect(
      isTaskAvailable(
        task,
        contextAt(new Date("2026-08-12T00:00:00Z"), { events }),
      ),
    ).toBe(true);
    expect(
      isTaskAvailable(
        task,
        contextAt(new Date("2026-01-01T00:00:00Z"), { events }),
      ),
    ).toBe(false);
  });

  it("is unavailable when the linked event phase is not active, even if the event is", () => {
    const event: Event = {
      id: createId("event", "shadow-invasion"),
      name: "Shadow Invasion",
      startsAt: "2026-08-10T00:00:00Z",
      endsAt: "2026-08-17T00:00:00Z",
      hasPhases: true,
    };
    const phase: EventPhase = {
      id: createId("event-phase", "phase-1"),
      eventId: event.id,
      name: "Phase 1",
      startsAt: "2026-08-10T00:00:00Z",
      endsAt: "2026-08-13T00:00:00Z",
      order: 1,
    };
    const task = baseTask({ eventId: event.id, eventPhaseId: phase.id });
    const context = contextAt(new Date("2026-08-15T00:00:00Z"), {
      events: new Map([[event.id, event]]),
      eventPhases: new Map([[phase.id, phase]]),
    });
    // Event is still active on 08-15, but phase 1 ended on 08-13.
    expect(isTaskAvailable(task, context)).toBe(false);
  });

  it("throws when the task references an unknown event", () => {
    const task = baseTask({ eventId: createId("event", "does-not-exist") });
    expect(() => isTaskAvailable(task, contextAt(new Date()))).toThrow(
      /unknown event/,
    );
  });
});

describe("isTaskExpired", () => {
  it("is never expired without a bounded window", () => {
    expect(isTaskExpired(baseTask(), contextAt(new Date()))).toBe(false);
  });

  it("is not expired for a recurring availabilityResetRuleId", () => {
    const rule: ResetRule = {
      id: createId("reset-rule", "daily"),
      serverId: createId("server", "sanctuary-1"),
      schedule: { kind: "every-game-day" },
    };
    const task = baseTask({ availabilityResetRuleId: rule.id });
    const context = contextAt(new Date("2100-01-01T00:00:00Z"), {
      resetRules: new Map([[rule.id, rule]]),
    });
    expect(isTaskExpired(task, context)).toBe(false);
  });

  it("is expired once a fixed-period availabilityResetRuleId window has passed", () => {
    const rule: ResetRule = {
      id: createId("reset-rule", "window"),
      serverId: createId("server", "sanctuary-1"),
      schedule: {
        kind: "fixed-period",
        startsAt: "2026-08-10T00:00:00Z",
        endsAt: "2026-08-17T00:00:00Z",
      },
    };
    const task = baseTask({ availabilityResetRuleId: rule.id });
    const resetRules = new Map([[rule.id, rule]]);
    expect(
      isTaskExpired(
        task,
        contextAt(new Date("2026-08-12T00:00:00Z"), { resetRules }),
      ),
    ).toBe(false);
    expect(
      isTaskExpired(
        task,
        contextAt(new Date("2026-08-20T00:00:00Z"), { resetRules }),
      ),
    ).toBe(true);
  });

  it("is expired once the linked event has ended", () => {
    const event: Event = {
      id: createId("event", "shadow-invasion"),
      name: "Shadow Invasion",
      startsAt: "2026-08-10T00:00:00Z",
      endsAt: "2026-08-17T00:00:00Z",
      hasPhases: false,
    };
    const task = baseTask({ eventId: event.id });
    const events = new Map([[event.id, event]]);
    expect(
      isTaskExpired(
        task,
        contextAt(new Date("2026-08-12T00:00:00Z"), { events }),
      ),
    ).toBe(false);
    expect(
      isTaskExpired(
        task,
        contextAt(new Date("2026-08-20T00:00:00Z"), { events }),
      ),
    ).toBe(true);
  });
});
