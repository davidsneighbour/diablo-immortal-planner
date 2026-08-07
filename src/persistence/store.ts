import type { GameDefinitionSet } from "../domain/definition-set.js";
import type { ValidationError } from "../domain/validation.js";
import { migratePlayerState } from "./migrate.js";
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyPlayerState,
  type PlayerState,
} from "./schema.js";
import type { DocumentStorage } from "./storage.js";
import {
  isPlayerStateShape,
  validatePlayerState,
} from "./validate-player-state.js";

export type PlayerStateLoadResult =
  | { readonly status: "empty"; readonly state: PlayerState }
  | { readonly status: "ok"; readonly state: PlayerState }
  | {
      readonly status: "migrated";
      readonly state: PlayerState;
      readonly fromVersion: number;
    }
  | { readonly status: "invalid"; readonly errors: readonly ValidationError[] };

/**
 * Loads player state from `storage`, applying migration and validation.
 * Never throws for bad stored data — invalid or unrecognizable data (a
 * corrupted write, or a schema version this app can't migrate from)
 * produces an `'invalid'` result with diagnostic errors instead, so the
 * caller can offer recovery (e.g. import a backup, or reset local data)
 * rather than the planner crashing outright.
 */
export async function loadPlayerState(
  storage: DocumentStorage<unknown>,
  gameDefinitions?: GameDefinitionSet,
): Promise<PlayerStateLoadResult> {
  const raw = await storage.load();
  if (raw === null) {
    return { status: "empty", state: createEmptyPlayerState() };
  }
  if (!isPlayerStateShape(raw)) {
    return {
      status: "invalid",
      errors: [
        {
          code: "malformed",
          message: "Stored player state is not a recognizable object",
        },
      ],
    };
  }

  const fromVersion = raw.schemaVersion;
  let migrated: PlayerState;
  try {
    migrated = migratePlayerState(raw);
  } catch (error) {
    return {
      status: "invalid",
      errors: [
        {
          code: "migration-failed",
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }

  const validation = validatePlayerState(migrated, gameDefinitions);
  if (!validation.valid) {
    return { status: "invalid", errors: validation.errors };
  }

  return fromVersion === CURRENT_SCHEMA_VERSION
    ? { status: "ok", state: migrated }
    : { status: "migrated", state: migrated, fromVersion };
}

/** Persists `state`. Called after every mutation so persistence is automatic rather than an explicit "save" step the player has to remember. */
export async function savePlayerState(
  storage: DocumentStorage<unknown>,
  state: PlayerState,
): Promise<void> {
  await storage.save(state);
}

/** Computes `updater(current)` and immediately persists the result — the standard "mutate and auto-save" pattern for callers. */
export async function updatePlayerState(
  storage: DocumentStorage<unknown>,
  current: PlayerState,
  updater: (state: PlayerState) => PlayerState,
): Promise<PlayerState> {
  const next = updater(current);
  await savePlayerState(storage, next);
  return next;
}

/** Erases all local player data and returns a fresh empty state. */
export async function resetPlayerState(
  storage: DocumentStorage<unknown>,
): Promise<PlayerState> {
  await storage.clear();
  return createEmptyPlayerState();
}
