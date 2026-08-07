import type { ServerId } from "./id.js";

/**
 * A Diablo Immortal server/container. Characters belong to exactly one
 * server, and a server's timezone and daily reset time govern game-time
 * calculations for everything associated with it. Do not assume all
 * configured servers share a timezone or reset time.
 */
export interface Server {
  readonly id: ServerId;
  readonly name: string;
  /** IANA timezone name, e.g. "Asia/Bangkok". */
  readonly timezone: string;
  /** 24-hour server-local time, "HH:MM", e.g. "03:00". */
  readonly dailyResetTime: string;
  readonly active: boolean;
  readonly notes?: string;
}

export const MAX_CHARACTERS_PER_SERVER = 5;
