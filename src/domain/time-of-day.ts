const timeOfDayPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface TimeOfDay {
  readonly hour: number;
  readonly minute: number;
}

/** True if `value` is a 24-hour "HH:MM" string, e.g. "03:00" or "23:59". */
export function isValidTimeOfDay(value: string): boolean {
  return timeOfDayPattern.test(value);
}

/** Parses a 24-hour "HH:MM" string. Throws if the format is invalid. */
export function parseTimeOfDay(value: string): TimeOfDay {
  const match = timeOfDayPattern.exec(value);
  if (!match?.[1] || !match[2]) {
    throw new Error(`Invalid time of day "${value}": expected 24-hour "HH:MM"`);
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}
