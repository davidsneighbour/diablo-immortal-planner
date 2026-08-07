import type { Event } from "../domain/event.js";
import type { ResetRule, ResetSchedule } from "../domain/reset-rule.js";
import type { Server } from "../domain/server.js";
import { parseTimeOfDay } from "../domain/time-of-day.js";
import { getGameDay, getGameDayStart } from "./game-day.js";
import {
  addCalendarDays,
  calendarDaysBetween,
  clampDayOfMonth,
  formatDateKey,
  getWallClock,
  pad2,
  parseDateKey,
  wallClockToInstant,
  weekdayOfDateKey,
} from "./server-time.js";

export interface ResetPeriod {
  readonly periodKey: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
}

export interface ResetPeriodContext {
  /** Required to evaluate an `event-specific` schedule. */
  readonly event?: Event;
  /** Required to evaluate a `rolling` schedule: the instant its window is measured from. */
  readonly rollingAnchor?: Date;
}

function weekdaysPeriod(
  server: Server,
  weekdays: readonly number[],
  instant: Date,
): ResetPeriod {
  let cursor = getGameDay(server, instant);
  for (let i = 0; i < 7 && !weekdays.includes(weekdayOfDateKey(cursor)); i++) {
    const { year, month, day } = parseDateKey(cursor);
    const previous = addCalendarDays(year, month, day, -1);
    cursor = formatDateKey(previous.year, previous.month, previous.day);
  }
  const startsAt = getGameDayStart(server, cursor);

  let next = cursor;
  do {
    const { year, month, day } = parseDateKey(next);
    const following = addCalendarDays(year, month, day, 1);
    next = formatDateKey(following.year, following.month, following.day);
  } while (!weekdays.includes(weekdayOfDateKey(next)));
  const endsAt = getGameDayStart(server, next);

  return { periodKey: cursor, startsAt, endsAt };
}

function multiplePerDayPeriod(
  server: Server,
  times: readonly string[],
  instant: Date,
): ResetPeriod {
  const sortedTimes = [...times]
    .map(parseTimeOfDay)
    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  const wall = getWallClock(instant, server.timezone);
  const nowMinutes = wall.hour * 60 + wall.minute;

  let startDate = { year: wall.year, month: wall.month, day: wall.day };
  let startIndex = -1;
  for (let i = sortedTimes.length - 1; i >= 0; i--) {
    const time = sortedTimes[i];
    if (time && time.hour * 60 + time.minute <= nowMinutes) {
      startIndex = i;
      break;
    }
  }
  if (startIndex === -1) {
    startDate = addCalendarDays(wall.year, wall.month, wall.day, -1);
    startIndex = sortedTimes.length - 1;
  }
  const startTime = sortedTimes[startIndex];
  if (!startTime) {
    throw new Error("multiple-per-day schedule has no times");
  }
  const startsAt = wallClockToInstant(
    { ...startDate, hour: startTime.hour, minute: startTime.minute, second: 0 },
    server.timezone,
  );

  let endDate = startDate;
  let endIndex = startIndex + 1;
  if (endIndex >= sortedTimes.length) {
    endDate = addCalendarDays(
      startDate.year,
      startDate.month,
      startDate.day,
      1,
    );
    endIndex = 0;
  }
  const endTime = sortedTimes[endIndex];
  if (!endTime) {
    throw new Error("multiple-per-day schedule has no times");
  }
  const endsAt = wallClockToInstant(
    { ...endDate, hour: endTime.hour, minute: endTime.minute, second: 0 },
    server.timezone,
  );

  const periodKey = `${formatDateKey(startDate.year, startDate.month, startDate.day)}T${pad2(startTime.hour)}:${pad2(startTime.minute)}`;
  return { periodKey, startsAt, endsAt };
}

function monthlyPeriod(
  server: Server,
  dayOfMonth: number,
  instant: Date,
): ResetPeriod {
  const wall = getWallClock(instant, server.timezone);
  const reset = parseTimeOfDay(server.dailyResetTime);

  const thisMonthDay = clampDayOfMonth(wall.year, wall.month, dayOfMonth);
  const thisMonthResetInstant = wallClockToInstant(
    {
      year: wall.year,
      month: wall.month,
      day: thisMonthDay,
      hour: reset.hour,
      minute: reset.minute,
      second: 0,
    },
    server.timezone,
  );

  let startYear = wall.year;
  let startMonth = wall.month;
  let startsAt = thisMonthResetInstant;
  if (thisMonthResetInstant.getTime() > instant.getTime()) {
    startMonth = wall.month === 1 ? 12 : wall.month - 1;
    startYear = wall.month === 1 ? wall.year - 1 : wall.year;
    const day = clampDayOfMonth(startYear, startMonth, dayOfMonth);
    startsAt = wallClockToInstant(
      {
        year: startYear,
        month: startMonth,
        day,
        hour: reset.hour,
        minute: reset.minute,
        second: 0,
      },
      server.timezone,
    );
  }

  const endMonth = startMonth === 12 ? 1 : startMonth + 1;
  const endYear = startMonth === 12 ? startYear + 1 : startYear;
  const endDay = clampDayOfMonth(endYear, endMonth, dayOfMonth);
  const endsAt = wallClockToInstant(
    {
      year: endYear,
      month: endMonth,
      day: endDay,
      hour: reset.hour,
      minute: reset.minute,
      second: 0,
    },
    server.timezone,
  );

  return { periodKey: `${startYear}-${pad2(startMonth)}`, startsAt, endsAt };
}

function everyNGameDaysPeriod(
  server: Server,
  n: number,
  anchorDate: string,
  instant: Date,
): ResetPeriod {
  const anchor = parseDateKey(anchorDate);
  const current = parseDateKey(getGameDay(server, instant));
  const diffDays = calendarDaysBetween(anchor, current);
  const periodIndex = Math.floor(diffDays / n);
  const startDate = addCalendarDays(
    anchor.year,
    anchor.month,
    anchor.day,
    periodIndex * n,
  );
  const endDate = addCalendarDays(
    startDate.year,
    startDate.month,
    startDate.day,
    n,
  );
  const startKey = formatDateKey(
    startDate.year,
    startDate.month,
    startDate.day,
  );
  const endKey = formatDateKey(endDate.year, endDate.month, endDate.day);
  return {
    periodKey: startKey,
    startsAt: getGameDayStart(server, startKey),
    endsAt: getGameDayStart(server, endKey),
  };
}

function rollingPeriod(
  durationHours: number,
  anchor: Date,
  instant: Date,
): ResetPeriod {
  const durationMs = durationHours * 60 * 60 * 1000;
  const periodIndex = Math.floor(
    (instant.getTime() - anchor.getTime()) / durationMs,
  );
  const startsAt = new Date(anchor.getTime() + periodIndex * durationMs);
  const endsAt = new Date(startsAt.getTime() + durationMs);
  return {
    periodKey: `${anchor.toISOString()}+${periodIndex}`,
    startsAt,
    endsAt,
  };
}

/**
 * Determines the reset period `instant` currently falls in for `rule`,
 * deriving it directly from `instant` and the schedule's own definition —
 * never by replaying missed resets. `'none'` and `'manual'` schedules
 * have no periodic reset and are not valid inputs; check for those kinds
 * before calling this.
 */
export function getCurrentResetPeriod(
  rule: ResetRule,
  server: Server,
  instant: Date,
  context: ResetPeriodContext = {},
): ResetPeriod {
  const schedule: ResetSchedule = rule.schedule;
  switch (schedule.kind) {
    case "every-game-day": {
      const gameDay = getGameDay(server, instant);
      const { year, month, day } = parseDateKey(gameDay);
      const nextDay = addCalendarDays(year, month, day, 1);
      return {
        periodKey: gameDay,
        startsAt: getGameDayStart(server, gameDay),
        endsAt: getGameDayStart(
          server,
          formatDateKey(nextDay.year, nextDay.month, nextDay.day),
        ),
      };
    }
    case "every-n-game-days":
      return everyNGameDaysPeriod(
        server,
        schedule.n,
        schedule.anchorDate,
        instant,
      );
    case "weekdays":
      return weekdaysPeriod(server, schedule.weekdays, instant);
    case "weekly":
      return weekdaysPeriod(server, [schedule.weekday], instant);
    case "multiple-per-day":
      return multiplePerDayPeriod(server, schedule.times, instant);
    case "monthly":
      return monthlyPeriod(server, schedule.dayOfMonth, instant);
    case "fixed-period":
      return {
        periodKey: schedule.startsAt,
        startsAt: new Date(schedule.startsAt),
        endsAt: new Date(schedule.endsAt),
      };
    case "event-specific":
      if (!context.event) {
        throw new Error(
          `Reset rule "${rule.id}" is event-specific but no event was provided`,
        );
      }
      return {
        periodKey: context.event.id,
        startsAt: new Date(context.event.startsAt),
        endsAt: new Date(context.event.endsAt),
      };
    case "rolling":
      if (!context.rollingAnchor) {
        throw new Error(
          `Reset rule "${rule.id}" is rolling but no rollingAnchor was provided`,
        );
      }
      return rollingPeriod(
        schedule.durationHours,
        context.rollingAnchor,
        instant,
      );
    case "none":
    case "manual":
      throw new Error(
        `Reset rule "${rule.id}" has schedule kind "${schedule.kind}", which has no reset period`,
      );
  }
}

/**
 * The next instant `rule` resets after `instant`, or `null` if the
 * schedule never resets on its own (`'none'`) or resets only by explicit
 * player action (`'manual'`).
 */
export function getNextReset(
  rule: ResetRule,
  server: Server,
  instant: Date,
  context: ResetPeriodContext = {},
): Date | null {
  if (rule.schedule.kind === "none" || rule.schedule.kind === "manual") {
    return null;
  }
  return getCurrentResetPeriod(rule, server, instant, context).endsAt;
}
