import type { GameDefinitionSet } from "../domain/definition-set.js";
import { MAX_CHARACTERS_PER_SERVER } from "../domain/server.js";
import type {
  ValidationError,
  ValidationResult,
} from "../domain/validation.js";
import { findDuplicateIds } from "../domain/validation.js";
import type { PlayerState } from "./schema.js";

/**
 * A minimal structural check for data coming out of storage as
 * `unknown` — enough to trust it's safe to index into before migration
 * and deeper validation run. Corrupted/malformed JSON (wrong type,
 * missing fields) is rejected here rather than causing a confusing crash
 * partway through migration.
 */
export function isPlayerStateShape(
  value: unknown,
): value is { schemaVersion: number } & Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record["schemaVersion"] === "number" &&
    Array.isArray(record["servers"]) &&
    Array.isArray(record["characters"]) &&
    Array.isArray(record["taskInstances"]) &&
    Array.isArray(record["goals"]) &&
    Array.isArray(record["progressionStates"])
  );
}

/**
 * Semantic validation of an already-migrated `PlayerState`: duplicate
 * IDs, the five-characters-per-server limit, character→server
 * references, and task-instance/goal scope references. When
 * `gameDefinitions` is supplied, also cross-checks player data against
 * it (task instances referencing a real task, reset rules' `serverId`
 * referencing a real server) — the combined check PLAN.md's
 * game-definitions/player-state split otherwise leaves to the layer that
 * has both loaded at once.
 */
export function validatePlayerState(
  state: PlayerState,
  gameDefinitions?: GameDefinitionSet,
): ValidationResult {
  const errors: ValidationError[] = [];

  errors.push(
    ...findDuplicateIds(
      state.servers.map((server) => server.id),
      "server",
    ),
  );
  errors.push(
    ...findDuplicateIds(
      state.characters.map((character) => character.id),
      "character",
    ),
  );
  errors.push(
    ...findDuplicateIds(
      state.taskInstances.map((instance) => instance.id),
      "task instance",
    ),
  );
  errors.push(
    ...findDuplicateIds(
      state.goals.map((goal) => goal.id),
      "goal",
    ),
  );

  const serverIds = new Set<string>(state.servers.map((server) => server.id));
  const characterIds = new Set<string>(
    state.characters.map((character) => character.id),
  );

  const countByServer = new Map<string, number>();
  for (const character of state.characters) {
    if (!serverIds.has(character.serverId)) {
      errors.push({
        code: "unknown-reference",
        message: `Character "${character.id}" references unknown server "${character.serverId}"`,
        path: character.id,
      });
    }
    if (character.status !== "archived") {
      countByServer.set(
        character.serverId,
        (countByServer.get(character.serverId) ?? 0) + 1,
      );
    }
  }
  for (const [serverId, count] of countByServer) {
    if (count > MAX_CHARACTERS_PER_SERVER) {
      errors.push({
        code: "too-many-characters",
        message: `Server "${serverId}" has ${count} non-archived characters, exceeding the limit of ${MAX_CHARACTERS_PER_SERVER}`,
        path: serverId,
      });
    }
  }

  const taskIds = gameDefinitions
    ? new Set<string>(gameDefinitions.tasks.map((task) => task.id))
    : null;
  for (const instance of state.taskInstances) {
    if (
      instance.scope.type === "server" &&
      !serverIds.has(instance.scope.serverId)
    ) {
      errors.push({
        code: "unknown-reference",
        message: `Task instance "${instance.id}" references unknown server "${instance.scope.serverId}"`,
        path: instance.id,
      });
    }
    if (
      instance.scope.type === "character" &&
      !characterIds.has(instance.scope.characterId)
    ) {
      errors.push({
        code: "unknown-reference",
        message: `Task instance "${instance.id}" references unknown character "${instance.scope.characterId}"`,
        path: instance.id,
      });
    }
    if (taskIds && !taskIds.has(instance.taskId)) {
      errors.push({
        code: "unknown-reference",
        message: `Task instance "${instance.id}" references unknown task "${instance.taskId}"`,
        path: instance.id,
      });
    }
  }

  for (const goal of state.goals) {
    if (goal.scope.type === "server" && !serverIds.has(goal.scope.serverId)) {
      errors.push({
        code: "unknown-reference",
        message: `Goal "${goal.id}" references unknown server "${goal.scope.serverId}"`,
        path: goal.id,
      });
    }
    if (
      goal.scope.type === "character" &&
      !characterIds.has(goal.scope.characterId)
    ) {
      errors.push({
        code: "unknown-reference",
        message: `Goal "${goal.id}" references unknown character "${goal.scope.characterId}"`,
        path: goal.id,
      });
    }
  }

  if (gameDefinitions) {
    for (const resetRule of gameDefinitions.resetRules) {
      if (!serverIds.has(resetRule.serverId)) {
        errors.push({
          code: "unknown-reference",
          message: `Reset rule "${resetRule.id}" references unknown server "${resetRule.serverId}"`,
          path: resetRule.id,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
