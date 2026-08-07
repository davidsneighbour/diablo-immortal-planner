import type { Character } from "../../domain/character.js";
import type { Goal } from "../../domain/goal.js";
import type { CharacterId } from "../../domain/id.js";
import type { ProgressionState } from "../../domain/progression.js";
import { isCharacterScope, type Scope } from "../../domain/scope.js";
import type { TaskInstance } from "../../domain/task-instance.js";

export interface CharacterDetailPanelProps {
  readonly character: Character;
  readonly goals: readonly Goal[];
  readonly taskInstances: readonly TaskInstance[];
  readonly progressionStates: readonly ProgressionState[];
}

function belongsToCharacter(scope: Scope, characterId: CharacterId): boolean {
  return isCharacterScope(scope) && scope.characterId === characterId;
}

/**
 * Read-only summary proving character-scoped state stays independent —
 * one character's goals/progress/tasks never leak into another's. Goal
 * creation (Milestone 12) and task-recording UI (later milestones) are
 * out of scope here; this only displays whatever's already in
 * `PlayerState`.
 */
export function CharacterDetailPanel({
  character,
  goals,
  taskInstances,
  progressionStates,
}: CharacterDetailPanelProps) {
  const characterGoals = goals.filter((goal) =>
    belongsToCharacter(goal.scope, character.id),
  );
  const characterTaskInstances = taskInstances.filter((instance) =>
    belongsToCharacter(instance.scope, character.id),
  );
  const characterProgression = progressionStates.filter((state) =>
    belongsToCharacter(state.scope, character.id),
  );

  return (
    <section
      aria-labelledby="character-detail-heading"
      className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
    >
      <h2
        id="character-detail-heading"
        className="text-lg font-semibold text-amber-400"
      >
        {character.name}
      </h2>
      <p className="text-sm text-neutral-400">
        {character.className} · level {character.level}
        {character.paragonLevel !== undefined
          ? ` · Paragon ${character.paragonLevel}`
          : ""}
      </p>
      {character.notes && (
        <p className="mt-2 text-sm text-neutral-400">{character.notes}</p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">
            Progression
          </h3>
          {characterProgression.length === 0 ? (
            <p className="mt-1 text-sm text-neutral-500">
              Nothing tracked yet.
            </p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm text-neutral-300">
              {characterProgression.map((state) => (
                <li key={state.systemId}>
                  {state.systemId}: level {state.currentLevel}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-neutral-200">Goals</h3>
          {characterGoals.length === 0 ? (
            <p className="mt-1 text-sm text-neutral-500">No goals yet.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm text-neutral-300">
              {characterGoals.map((goal) => (
                <li key={goal.id}>{goal.name}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-neutral-200">Task state</h3>
          {characterTaskInstances.length === 0 ? (
            <p className="mt-1 text-sm text-neutral-500">
              No tracked tasks yet.
            </p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm text-neutral-300">
              {characterTaskInstances.map((instance) => (
                <li key={instance.id}>
                  {instance.taskId} ({instance.periodKey})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
