import type { EventId, ResetRuleId, ServerId } from "./id.js";

/**
 * The recurrence pattern a reset rule follows. This is data, not
 * behaviour — the engine that evaluates these against server time is
 * Milestone 2. Do not assume every schedule begins at local midnight or
 * that every game day is 24 hours from the player's perspective: a
 * server's `dailyResetTime` (see `Server`) defines where one game day
 * ends and the next begins.
 */
export type ResetSchedule =
  | { readonly kind: "every-game-day" }
  | {
      readonly kind: "every-n-game-days";
      readonly n: number;
      readonly anchorDate: string;
    }
  | {
      readonly kind: "weekdays";
      /** 0 = Sunday .. 6 = Saturday, evaluated in the owning server's timezone. */
      readonly weekdays: readonly number[];
    }
  | { readonly kind: "multiple-per-day"; readonly timesPerDay: number }
  | { readonly kind: "weekly"; readonly weekday: number }
  | { readonly kind: "monthly"; readonly dayOfMonth: number }
  | { readonly kind: "seasonal" }
  | { readonly kind: "event-specific"; readonly eventId: EventId }
  | {
      readonly kind: "fixed-period";
      readonly startsAt: string;
      readonly endsAt: string;
    }
  | { readonly kind: "rolling"; readonly durationHours: number }
  /** Never resets — permanent/lifetime progress. */
  | { readonly kind: "none" }
  /** Reset only via explicit player action, not on a schedule. */
  | { readonly kind: "manual" };

export interface ResetRule {
  readonly id: ResetRuleId;
  /** The server whose timezone and daily reset time this rule is evaluated against. */
  readonly serverId: ServerId;
  readonly schedule: ResetSchedule;
}
