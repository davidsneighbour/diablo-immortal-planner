/**
 * A source of "now". Reset/availability logic must depend on a `Clock`
 * rather than calling `new Date()` or `Date.now()` directly, so tests can
 * use a `FixedClock` and never depend on the real current time.
 */
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  private readonly instant: Date;

  constructor(instant: Date | string) {
    this.instant = typeof instant === "string" ? new Date(instant) : instant;
  }

  now(): Date {
    return this.instant;
  }
}
