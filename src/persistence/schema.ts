import type { Character } from "../domain/character.js";
import type { Goal } from "../domain/goal.js";
import type { ProgressionState } from "../domain/progression.js";
import type { Server } from "../domain/server.js";
import type { TaskInstance } from "../domain/task-instance.js";

/**
 * Bumped whenever `PlayerState`'s shape changes in a way that requires a
 * migration (see `migrate.ts`). Never change persisted structures without
 * also registering a migration — existing browser data must not be
 * assumed to already conform.
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Everything about this specific player that is persisted locally:
 * their own account-scoped configuration (servers, characters) and
 * recorded state (task progress, goals, progression). This is
 * deliberately distinct from `GameDefinitionSet` — see its doc comment —
 * and only covers the player-state entities this codebase currently
 * models; inventory/tracked resources and manual overrides described in
 * `PLAN.md` aren't modeled yet.
 */
export interface PlayerState {
  readonly schemaVersion: number;
  readonly servers: readonly Server[];
  readonly characters: readonly Character[];
  readonly taskInstances: readonly TaskInstance[];
  readonly goals: readonly Goal[];
  readonly progressionStates: readonly ProgressionState[];
}

export function createEmptyPlayerState(): PlayerState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    servers: [],
    characters: [],
    taskInstances: [],
    goals: [],
    progressionStates: [],
  };
}
