import type { GameDefinitionSet } from "../domain/definition-set.js";
import type { ValidationError } from "../domain/validation.js";
import { migratePlayerState } from "./migrate.js";
import { CURRENT_SCHEMA_VERSION, type PlayerState } from "./schema.js";
import {
  isPlayerStateShape,
  validatePlayerState,
} from "./validate-player-state.js";

/** Identifies the JSON document as a player-state export from this app, not arbitrary JSON. */
export const PLAYER_STATE_EXPORT_FORMAT =
  "diablo-immortal-planner-player-state";

/**
 * The export wrapper's own version, independent of `CURRENT_SCHEMA_VERSION`
 * (the wrapper shape — `format`/`formatVersion`/`exportedAt`/`playerState`
 * — could change without the embedded `PlayerState` schema changing, or
 * vice versa).
 */
export const CURRENT_EXPORT_FORMAT_VERSION = 1;

/**
 * A complete, human-inspectable JSON export of the player's local data.
 * Game definitions are deliberately excluded — they're bundled with the
 * app and versioned separately, per PLAN.md's Milestone 5 notes.
 */
export interface PlayerStateExport {
  readonly format: typeof PLAYER_STATE_EXPORT_FORMAT;
  readonly formatVersion: number;
  readonly exportedAt: string;
  readonly playerState: PlayerState;
}

export function exportPlayerState(
  state: PlayerState,
  exportedAt: Date,
): PlayerStateExport {
  return {
    format: PLAYER_STATE_EXPORT_FORMAT,
    formatVersion: CURRENT_EXPORT_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    playerState: state,
  };
}

export type PlayerStateImportResult =
  | { readonly status: "ok"; readonly state: PlayerState }
  | {
      readonly status: "migrated";
      readonly state: PlayerState;
      readonly fromVersion: number;
    }
  | { readonly status: "invalid"; readonly errors: readonly ValidationError[] };

function invalid(code: string, message: string): PlayerStateImportResult {
  return { status: "invalid", errors: [{ code, message }] };
}

interface RawExportLike {
  readonly format: unknown;
  readonly formatVersion: unknown;
  readonly playerState: unknown;
}

function isExportShape(value: unknown): value is RawExportLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    "format" in record && "formatVersion" in record && "playerState" in record
  );
}

/**
 * Parses and validates a previously exported document. Never throws for
 * bad input — a corrupted file, a file from a newer export format or
 * player-state schema version than this app supports, or a file that
 * isn't a recognizable export at all all produce an `'invalid'` result
 * with diagnostic errors, mirroring `loadPlayerState`.
 */
export function importPlayerState(
  raw: unknown,
  gameDefinitions?: GameDefinitionSet,
): PlayerStateImportResult {
  if (!isExportShape(raw)) {
    return invalid(
      "malformed",
      "Import file is not a recognizable player state export",
    );
  }
  if (raw.format !== PLAYER_STATE_EXPORT_FORMAT) {
    return invalid(
      "unrecognized-format",
      `Import file has an unrecognized format "${String(raw.format)}"`,
    );
  }
  if (
    typeof raw.formatVersion !== "number" ||
    raw.formatVersion > CURRENT_EXPORT_FORMAT_VERSION
  ) {
    return invalid(
      "unsupported-format-version",
      `Import file's export format version (${String(raw.formatVersion)}) is newer than this app supports (${CURRENT_EXPORT_FORMAT_VERSION})`,
    );
  }
  if (!isPlayerStateShape(raw.playerState)) {
    return invalid(
      "malformed",
      "Import file does not contain a recognizable player state",
    );
  }

  const fromVersion = raw.playerState.schemaVersion;
  let migrated: PlayerState;
  try {
    migrated = migratePlayerState(raw.playerState);
  } catch (error) {
    return invalid(
      "migration-failed",
      error instanceof Error ? error.message : String(error),
    );
  }

  const validation = validatePlayerState(migrated, gameDefinitions);
  if (!validation.valid) {
    return { status: "invalid", errors: validation.errors };
  }

  return fromVersion === CURRENT_SCHEMA_VERSION
    ? { status: "ok", state: migrated }
    : { status: "migrated", state: migrated, fromVersion };
}
