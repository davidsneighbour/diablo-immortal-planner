/** The wall-clock calendar date/time components of an instant, in some timezone. */
export interface WallClock {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number; // 1-31
  readonly hour: number; // 0-23
  readonly minute: number;
  readonly second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timezone);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  formatterCache.set(timezone, formatter);
  return formatter;
}

function partValue(
  parts: readonly Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const part = parts.find((p) => p.type === type);
  if (!part) {
    throw new Error(`Missing "${type}" part while formatting time`);
  }
  return Number(part.value);
}

/** Returns the wall-clock calendar date/time for `instant` in `timezone`. */
export function getWallClock(instant: Date, timezone: string): WallClock {
  const parts = getFormatter(timezone).formatToParts(instant);
  return {
    year: partValue(parts, "year"),
    month: partValue(parts, "month"),
    day: partValue(parts, "day"),
    hour: partValue(parts, "hour"),
    minute: partValue(parts, "minute"),
    second: partValue(parts, "second"),
  };
}

/**
 * Converts wall-clock calendar date/time components in `timezone` back to
 * an instant, using the standard "guess against UTC, then correct by the
 * observed offset" technique (no manual millisecond/offset-table
 * arithmetic). A single correction is exact for fixed-offset zones (e.g.
 * Asia/Bangkok) and correct for almost all instants in DST-observing
 * zones; it can be off by the DST delta for wall-clock times that fall
 * inside a DST transition's spring-forward gap or fall-back overlap.
 */
export function wallClockToInstant(
  wallClock: WallClock,
  timezone: string,
): Date {
  const guessMs = Date.UTC(
    wallClock.year,
    wallClock.month - 1,
    wallClock.day,
    wallClock.hour,
    wallClock.minute,
    wallClock.second,
  );
  const observed = getWallClock(new Date(guessMs), timezone);
  const observedAsUtcMs = Date.UTC(
    observed.year,
    observed.month - 1,
    observed.day,
    observed.hour,
    observed.minute,
    observed.second,
  );
  const offsetMs = observedAsUtcMs - guessMs;
  return new Date(guessMs - offsetMs);
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Formats a calendar date as a stable "YYYY-MM-DD" key. */
export function formatDateKey(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Parses a "YYYY-MM-DD" key produced by `formatDateKey`. */
export function parseDateKey(dateKey: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error(`Invalid date key "${dateKey}": expected "YYYY-MM-DD"`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/** The number of days in `month` (1-12) of `year`. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Clamps `day` to the last valid day of `month`/`year`, for months shorter than `day`. */
export function clampDayOfMonth(
  year: number,
  month: number,
  day: number,
): number {
  return Math.min(day, daysInMonth(year, month));
}

/** The day-of-week (0 = Sunday .. 6 = Saturday) of a plain calendar date, independent of any timezone. */
export function weekdayOfDateKey(dateKey: string): number {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Adds `days` calendar days to a plain (year, month, day) triple, independent of any timezone. */
export function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** The whole-day difference between two plain (year, month, day) triples (b - a), independent of any timezone. */
export function calendarDaysBetween(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const aMs = Date.UTC(a.year, a.month - 1, a.day);
  const bMs = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((bMs - aMs) / msPerDay);
}
