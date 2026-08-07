import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  calendarDaysBetween,
  clampDayOfMonth,
  formatDateKey,
  getWallClock,
  parseDateKey,
  wallClockToInstant,
  weekdayOfDateKey,
} from "./server-time.js";

describe("getWallClock", () => {
  it("converts a UTC instant into Asia/Bangkok (UTC+7) wall-clock components", () => {
    const wall = getWallClock(new Date("2026-08-07T20:15:30Z"), "Asia/Bangkok");
    expect(wall).toEqual({
      year: 2026,
      month: 8,
      day: 8,
      hour: 3,
      minute: 15,
      second: 30,
    });
  });
});

describe("wallClockToInstant", () => {
  it("round-trips through getWallClock for a fixed-offset timezone", () => {
    const wallClock = {
      year: 2026,
      month: 8,
      day: 8,
      hour: 3,
      minute: 0,
      second: 0,
    };
    const instant = wallClockToInstant(wallClock, "Asia/Bangkok");
    expect(instant.toISOString()).toBe("2026-08-07T20:00:00.000Z");
    expect(getWallClock(instant, "Asia/Bangkok")).toEqual(wallClock);
  });
});

describe("formatDateKey / parseDateKey", () => {
  it("round-trip and zero-pad single-digit months/days", () => {
    expect(formatDateKey(2026, 1, 5)).toBe("2026-01-05");
    expect(parseDateKey("2026-01-05")).toEqual({
      year: 2026,
      month: 1,
      day: 5,
    });
  });

  it("rejects malformed keys", () => {
    expect(() => parseDateKey("2026/01/05")).toThrow(/Invalid date key/);
  });
});

describe("addCalendarDays", () => {
  it("rolls over month and year boundaries", () => {
    expect(addCalendarDays(2026, 12, 31, 1)).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
    expect(addCalendarDays(2026, 3, 1, -1)).toEqual({
      year: 2026,
      month: 2,
      day: 28,
    });
  });
});

describe("calendarDaysBetween", () => {
  it("returns the signed day difference between two dates", () => {
    expect(
      calendarDaysBetween(
        { year: 2026, month: 8, day: 1 },
        { year: 2026, month: 8, day: 8 },
      ),
    ).toBe(7);
    expect(
      calendarDaysBetween(
        { year: 2026, month: 8, day: 8 },
        { year: 2026, month: 8, day: 1 },
      ),
    ).toBe(-7);
  });
});

describe("clampDayOfMonth", () => {
  it("clamps to the last day of short months", () => {
    expect(clampDayOfMonth(2026, 2, 31)).toBe(28);
    expect(clampDayOfMonth(2024, 2, 31)).toBe(29); // leap year
    expect(clampDayOfMonth(2026, 4, 31)).toBe(30);
    expect(clampDayOfMonth(2026, 1, 31)).toBe(31);
  });
});

describe("weekdayOfDateKey", () => {
  it("returns the correct day of week regardless of timezone", () => {
    // 2026-08-10 is a Monday.
    expect(weekdayOfDateKey("2026-08-10")).toBe(1);
    // 2026-08-08 is a Saturday.
    expect(weekdayOfDateKey("2026-08-08")).toBe(6);
  });
});
