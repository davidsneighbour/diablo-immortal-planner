import { describe, expect, it } from "vitest";
import { createId } from "../domain/id.js";
import type { Server } from "../domain/server.js";
import { getGameDay, getGameDayStart, getNextDailyReset } from "./game-day.js";

const server: Server = {
  id: createId("server", "sanctuary-1"),
  name: "Sanctuary 1",
  timezone: "Asia/Bangkok",
  dailyResetTime: "03:00",
  active: true,
};

describe("getGameDay", () => {
  it("treats 02:59:59 server time as still belonging to the previous game day", () => {
    // 2026-08-10T02:59:59+07:00
    expect(getGameDay(server, new Date("2026-08-09T19:59:59Z"))).toBe(
      "2026-08-09",
    );
  });

  it("treats 03:00:00 server time as the start of the new game day", () => {
    // 2026-08-10T03:00:00+07:00
    expect(getGameDay(server, new Date("2026-08-09T20:00:00Z"))).toBe(
      "2026-08-10",
    );
  });

  it("treats 03:00:01 server time as within the new game day", () => {
    expect(getGameDay(server, new Date("2026-08-09T20:00:01Z"))).toBe(
      "2026-08-10",
    );
  });

  it("handles a non-zero-minute reset time boundary", () => {
    const lateServer: Server = { ...server, dailyResetTime: "03:30" };
    expect(getGameDay(lateServer, new Date("2026-08-09T20:29:59Z"))).toBe(
      "2026-08-09",
    );
    expect(getGameDay(lateServer, new Date("2026-08-09T20:30:00Z"))).toBe(
      "2026-08-10",
    );
  });
});

describe("getGameDayStart", () => {
  it("round-trips with getGameDay", () => {
    const gameDay = getGameDay(server, new Date("2026-08-09T20:00:00Z"));
    const start = getGameDayStart(server, gameDay);
    expect(start.toISOString()).toBe("2026-08-09T20:00:00.000Z");
    expect(getGameDay(server, start)).toBe(gameDay);
  });
});

describe("getNextDailyReset", () => {
  it("returns the same day at the reset time when called before it", () => {
    const next = getNextDailyReset(server, new Date("2026-08-09T19:59:59Z"));
    expect(next.toISOString()).toBe("2026-08-09T20:00:00.000Z");
  });

  it("returns the following day at the reset time when called exactly at, or just after, a reset", () => {
    expect(
      getNextDailyReset(server, new Date("2026-08-09T20:00:00Z")).toISOString(),
    ).toBe("2026-08-10T20:00:00.000Z");
    expect(
      getNextDailyReset(server, new Date("2026-08-09T20:00:01Z")).toISOString(),
    ).toBe("2026-08-10T20:00:00.000Z");
  });

  it("recovers correctly after the application has been closed for several days", () => {
    // Simulates reopening several resets later: no timers were run in between.
    const reopenedAt = new Date("2026-08-15T10:00:00Z");
    expect(getGameDay(server, reopenedAt)).toBe("2026-08-15");
    expect(getNextDailyReset(server, reopenedAt).toISOString()).toBe(
      "2026-08-15T20:00:00.000Z",
    );
  });
});
