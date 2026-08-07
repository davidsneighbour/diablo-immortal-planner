import type { Server } from "../domain/server.js";
import { parseTimeOfDay } from "../domain/time-of-day.js";
import {
  addCalendarDays,
  formatDateKey,
  getWallClock,
  parseDateKey,
  wallClockToInstant,
} from "./server-time.js";

/**
 * The game day `instant` belongs to on `server`, as a "YYYY-MM-DD" key.
 * Game days do not start at local midnight — they start at the server's
 * `dailyResetTime`. For the default 03:00 reset, 02:59:59 Monday belongs
 * to Sunday's game day, while 03:00:00 Monday begins Monday's game day.
 */
export function getGameDay(server: Server, instant: Date): string {
  const wall = getWallClock(instant, server.timezone);
  const reset = parseTimeOfDay(server.dailyResetTime);
  const isBeforeReset =
    wall.hour < reset.hour ||
    (wall.hour === reset.hour && wall.minute < reset.minute);
  if (!isBeforeReset) {
    return formatDateKey(wall.year, wall.month, wall.day);
  }
  const previousDay = addCalendarDays(wall.year, wall.month, wall.day, -1);
  return formatDateKey(previousDay.year, previousDay.month, previousDay.day);
}

/** The instant the given "YYYY-MM-DD" game day began, i.e. its daily reset instant, on `server`. */
export function getGameDayStart(server: Server, gameDay: string): Date {
  const { year, month, day } = parseDateKey(gameDay);
  const reset = parseTimeOfDay(server.dailyResetTime);
  return wallClockToInstant(
    { year, month, day, hour: reset.hour, minute: reset.minute, second: 0 },
    server.timezone,
  );
}

/**
 * The next instant after `instant` at which `server`'s daily reset occurs.
 * `getGameDay`'s current game day always started at or before `instant`,
 * so the next reset is simply that game day's successor.
 */
export function getNextDailyReset(server: Server, instant: Date): Date {
  const currentGameDay = getGameDay(server, instant);
  const { year, month, day } = parseDateKey(currentGameDay);
  const nextDay = addCalendarDays(year, month, day, 1);
  return getGameDayStart(
    server,
    formatDateKey(nextDay.year, nextDay.month, nextDay.day),
  );
}
