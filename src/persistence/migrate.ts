import { CURRENT_SCHEMA_VERSION, type PlayerState } from "./schema.js";

/** Transforms a stored document from one schema version to the next. */
export type Migration = (
  state: Record<string, unknown>,
) => Record<string, unknown>;

/**
 * Registered migrations, in order: `migrations[0]` transforms schema
 * version 1 to version 2, `migrations[1]` transforms version 2 to
 * version 3, and so on. Empty for now — `CURRENT_SCHEMA_VERSION` is
 * still 1, so nothing has needed a migration yet.
 */
export const PLAYER_STATE_MIGRATIONS: readonly Migration[] = [];

/**
 * Walks `raw` forward from its own `schemaVersion` to `targetVersion` by
 * applying `migrations` in sequence. Throws — rather than guessing —
 * if `raw` is newer than `targetVersion` (the data came from a newer
 * app version than this one supports) or if a required migration step
 * isn't registered.
 */
export function applyMigrations(
  raw: { schemaVersion: number } & Record<string, unknown>,
  migrations: readonly Migration[],
  targetVersion: number,
): Record<string, unknown> {
  let state: Record<string, unknown> = raw;
  let version = raw.schemaVersion;
  if (version > targetVersion) {
    throw new Error(
      `Stored data is schema version ${version}, newer than this app supports (version ${targetVersion})`,
    );
  }
  while (version < targetVersion) {
    const migration = migrations[version - 1];
    if (!migration) {
      throw new Error(
        `No migration registered from schema version ${version} to ${version + 1}`,
      );
    }
    state = migration(state);
    version += 1;
  }
  return { ...state, schemaVersion: targetVersion };
}

/** Migrates a raw stored document to the current `PlayerState` schema. */
export function migratePlayerState(
  raw: { schemaVersion: number } & Record<string, unknown>,
): PlayerState {
  return applyMigrations(
    raw,
    PLAYER_STATE_MIGRATIONS,
    CURRENT_SCHEMA_VERSION,
  ) as unknown as PlayerState;
}
