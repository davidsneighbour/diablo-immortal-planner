import { describe, expect, it } from "vitest";
import type { Event } from "../domain/event.js";
import { createId } from "../domain/id.js";
import type { ResetRule } from "../domain/reset-rule.js";
import type { Server } from "../domain/server.js";
import { getCurrentResetPeriod, getNextReset } from "./reset-period.js";

const server: Server = {
  id: createId("server", "sanctuary-1"),
  name: "Sanctuary 1",
  timezone: "Asia/Bangkok",
  dailyResetTime: "03:00",
  active: true,
};

function rule(schedule: ResetRule["schedule"]): ResetRule {
  return { id: createId("reset-rule", "test"), serverId: server.id, schedule };
}

describe("getCurrentResetPeriod: every-game-day", () => {
  it("spans one game day, from reset to reset", () => {
    const period = getCurrentResetPeriod(
      rule({ kind: "every-game-day" }),
      server,
      new Date("2026-08-09T21:00:00Z"),
    );
    expect(period.periodKey).toBe("2026-08-10");
    expect(period.startsAt.toISOString()).toBe("2026-08-09T20:00:00.000Z");
    expect(period.endsAt.toISOString()).toBe("2026-08-10T20:00:00.000Z");
  });
});

describe("getCurrentResetPeriod: every-n-game-days", () => {
  it("groups game days into fixed-size windows anchored to anchorDate", () => {
    const schedule = {
      kind: "every-n-game-days" as const,
      n: 3,
      anchorDate: "2026-08-01",
    };
    // 2026-08-08 is 7 game days after the anchor -> period index floor(7/3) = 2 -> starts 2026-08-07.
    const period = getCurrentResetPeriod(
      rule(schedule),
      server,
      new Date("2026-08-08T10:00:00Z"),
    );
    expect(period.periodKey).toBe("2026-08-07");
    expect(period.startsAt.toISOString()).toBe("2026-08-06T20:00:00.000Z");
    expect(period.endsAt.toISOString()).toBe("2026-08-09T20:00:00.000Z");
  });
});

describe("getCurrentResetPeriod: weekly", () => {
  it("spans from the most recent matching weekday reset to the next one", () => {
    // weekday 1 = Monday. 2026-08-10 is a Monday.
    const schedule = { kind: "weekly" as const, weekday: 1 };
    const midWeek = getCurrentResetPeriod(
      rule(schedule),
      server,
      new Date("2026-08-12T10:00:00Z"),
    );
    expect(midWeek.periodKey).toBe("2026-08-10");
    expect(midWeek.startsAt.toISOString()).toBe("2026-08-09T20:00:00.000Z");
    expect(midWeek.endsAt.toISOString()).toBe("2026-08-16T20:00:00.000Z");
  });
});

describe("getCurrentResetPeriod: weekdays", () => {
  it("spans from the most recent qualifying weekday to the next one, skipping non-qualifying days", () => {
    // Monday (1) and Thursday (4). 2026-08-13 is a Thursday.
    const schedule = { kind: "weekdays" as const, weekdays: [1, 4] };
    // Friday 2026-08-14, mid-way to the next Monday.
    const period = getCurrentResetPeriod(
      rule(schedule),
      server,
      new Date("2026-08-14T10:00:00Z"),
    );
    expect(period.periodKey).toBe("2026-08-13");
    expect(period.endsAt.toISOString()).toBe("2026-08-16T20:00:00.000Z"); // next Monday's reset
  });
});

describe("getCurrentResetPeriod: multiple-per-day", () => {
  it("spans between consecutive same-day reset times", () => {
    const schedule = {
      kind: "multiple-per-day" as const,
      times: ["03:00", "15:00"],
    };
    // 10:00 local (03:00 UTC) is between 03:00 and 15:00.
    const period = getCurrentResetPeriod(
      rule(schedule),
      server,
      new Date("2026-08-10T03:00:00Z"),
    );
    expect(period.startsAt.toISOString()).toBe("2026-08-09T20:00:00.000Z"); // 03:00 local
    expect(period.endsAt.toISOString()).toBe("2026-08-10T08:00:00.000Z"); // 15:00 local
  });

  it("wraps to the previous day's last time when queried before the first time of the day", () => {
    const schedule = {
      kind: "multiple-per-day" as const,
      times: ["03:00", "15:00"],
    };
    // 01:00 local, before today's first reset time.
    const period = getCurrentResetPeriod(
      rule(schedule),
      server,
      new Date("2026-08-09T18:00:00Z"),
    );
    expect(period.startsAt.toISOString()).toBe("2026-08-09T08:00:00.000Z"); // yesterday 15:00 local
    expect(period.endsAt.toISOString()).toBe("2026-08-09T20:00:00.000Z"); // today 03:00 local
  });
});

describe("getCurrentResetPeriod: monthly", () => {
  it("spans a calendar month anchored to dayOfMonth", () => {
    const schedule = { kind: "monthly" as const, dayOfMonth: 1 };
    const period = getCurrentResetPeriod(
      rule(schedule),
      server,
      new Date("2026-08-15T10:00:00Z"),
    );
    expect(period.periodKey).toBe("2026-08");
    expect(period.startsAt.toISOString()).toBe("2026-07-31T20:00:00.000Z"); // 2026-08-01 03:00 local
    expect(period.endsAt.toISOString()).toBe("2026-08-31T20:00:00.000Z"); // 2026-09-01 03:00 local
  });

  it("clamps dayOfMonth to the last day of shorter months", () => {
    const schedule = { kind: "monthly" as const, dayOfMonth: 31 };
    const period = getCurrentResetPeriod(
      rule(schedule),
      server,
      new Date("2026-02-15T10:00:00Z"),
    );
    expect(period.startsAt.toISOString()).toBe("2026-01-30T20:00:00.000Z"); // 2026-01-31 03:00 local
    expect(period.endsAt.toISOString()).toBe("2026-02-27T20:00:00.000Z"); // 2026-02-28 03:00 local (clamped)
  });
});

describe("getCurrentResetPeriod: fixed-period", () => {
  it("uses the schedule's own absolute bounds", () => {
    const schedule = {
      kind: "fixed-period" as const,
      startsAt: "2026-08-10T03:00:00+07:00",
      endsAt: "2026-08-17T03:00:00+07:00",
    };
    const period = getCurrentResetPeriod(
      rule(schedule),
      server,
      new Date("2026-08-12T00:00:00Z"),
    );
    expect(period.startsAt.toISOString()).toBe("2026-08-09T20:00:00.000Z");
    expect(period.endsAt.toISOString()).toBe("2026-08-16T20:00:00.000Z");
  });
});

describe("getCurrentResetPeriod: event-specific", () => {
  const event: Event = {
    id: createId("event", "shadow-invasion"),
    name: "Shadow Invasion",
    startsAt: "2026-08-10T03:00:00+07:00",
    endsAt: "2026-08-17T03:00:00+07:00",
    hasPhases: false,
  };

  it("uses the referenced event's bounds", () => {
    const period = getCurrentResetPeriod(
      rule({ kind: "event-specific", eventId: event.id }),
      server,
      new Date("2026-08-12T00:00:00Z"),
      { event },
    );
    expect(period.periodKey).toBe(event.id);
    expect(period.startsAt.toISOString()).toBe("2026-08-09T20:00:00.000Z");
  });

  it("throws when no event is supplied in context", () => {
    expect(() =>
      getCurrentResetPeriod(
        rule({ kind: "event-specific", eventId: event.id }),
        server,
        new Date("2026-08-12T00:00:00Z"),
      ),
    ).toThrow(/no event was provided/);
  });
});

describe("getCurrentResetPeriod: rolling", () => {
  it("computes repeating windows from the supplied anchor", () => {
    const anchor = new Date("2026-08-01T00:00:00Z");
    const schedule = { kind: "rolling" as const, durationHours: 48 };
    // 100 hours after anchor -> window index floor(100/48) = 2 -> starts at anchor + 96h.
    const period = getCurrentResetPeriod(
      rule(schedule),
      server,
      new Date("2026-08-05T04:00:00Z"),
      {
        rollingAnchor: anchor,
      },
    );
    expect(period.startsAt.toISOString()).toBe("2026-08-05T00:00:00.000Z");
    expect(period.endsAt.toISOString()).toBe("2026-08-07T00:00:00.000Z");
  });

  it("throws when no rollingAnchor is supplied in context", () => {
    expect(() =>
      getCurrentResetPeriod(
        rule({ kind: "rolling", durationHours: 48 }),
        server,
        new Date(),
      ),
    ).toThrow(/no rollingAnchor was provided/);
  });
});

describe("getCurrentResetPeriod: none / manual", () => {
  it("throws for schedules with no periodic reset", () => {
    expect(() =>
      getCurrentResetPeriod(rule({ kind: "none" }), server, new Date()),
    ).toThrow(/no reset period/);
    expect(() =>
      getCurrentResetPeriod(rule({ kind: "manual" }), server, new Date()),
    ).toThrow(/no reset period/);
  });
});

describe("getNextReset", () => {
  it("equals the current period's end for periodic schedules", () => {
    const next = getNextReset(
      rule({ kind: "every-game-day" }),
      server,
      new Date("2026-08-09T21:00:00Z"),
    );
    expect(next?.toISOString()).toBe("2026-08-10T20:00:00.000Z");
  });

  it("returns null for none and manual schedules", () => {
    expect(getNextReset(rule({ kind: "none" }), server, new Date())).toBeNull();
    expect(
      getNextReset(rule({ kind: "manual" }), server, new Date()),
    ).toBeNull();
  });

  it("recovers correctly after being closed across several missed daily resets", () => {
    const dailyRule = rule({ kind: "every-game-day" });
    const reopenedAt = new Date("2026-08-20T05:00:00Z");
    const period = getCurrentResetPeriod(dailyRule, server, reopenedAt);
    expect(period.periodKey).toBe("2026-08-20");
    expect(getNextReset(dailyRule, server, reopenedAt)?.toISOString()).toBe(
      "2026-08-20T20:00:00.000Z",
    );
  });
});
