import { useState } from "react";
import type { CharacterId } from "../../domain/id.js";
import { usePlayerStateController } from "../../hooks/usePlayerStateController.js";
import {
  addCharacter,
  addServer,
  archiveCharacter,
  type PlayerStateMutationResult,
  reactivateCharacter,
  updateCharacterDetails,
  updateServer,
} from "../../planner/character-management.js";
import { CharacterDetailPanel } from "./CharacterDetailPanel.js";
import { CharacterList } from "./CharacterList.js";
import { ServerList } from "./ServerList.js";

export function CharactersApp() {
  const { controller, snapshot } = usePlayerStateController();
  const [selectedCharacterId, setSelectedCharacterId] =
    useState<CharacterId | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (snapshot.status === "loading") {
    return <p className="text-neutral-400">Loading…</p>;
  }

  if (snapshot.status === "invalid") {
    return (
      <div className="rounded-lg border border-red-900 bg-red-950/40 p-4">
        <h2 className="text-lg font-semibold text-red-300">
          Stored data could not be loaded
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-200">
          {snapshot.errors.map((error) => (
            <li key={`${error.code}:${error.path ?? error.message}`}>
              {error.message}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-4 rounded-md bg-red-900 px-3 py-1.5 text-sm font-medium text-red-100 hover:bg-red-800"
          onClick={() => void controller.reset()}
        >
          Reset local data
        </button>
      </div>
    );
  }

  const { state } = snapshot;

  function applyMutation(result: PlayerStateMutationResult): void {
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormError(null);
    const nextState = result.state;
    void controller.update(() => nextState);
  }

  const selectedCharacter =
    state.characters.find(
      (character) => character.id === selectedCharacterId,
    ) ?? null;

  return (
    <div className="space-y-8">
      {formError && (
        <p
          role="alert"
          className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {formError}
        </p>
      )}

      <ServerList
        servers={state.servers}
        onAddServer={(input) => applyMutation(addServer(state, input))}
        onUpdateServer={(serverId, changes) =>
          applyMutation(updateServer(state, serverId, changes))
        }
      />

      <CharacterList
        servers={state.servers}
        characters={state.characters}
        selectedCharacterId={selectedCharacterId}
        onSelectCharacter={setSelectedCharacterId}
        onAddCharacter={(input) => applyMutation(addCharacter(state, input))}
        onUpdateCharacter={(characterId, changes) =>
          applyMutation(updateCharacterDetails(state, characterId, changes))
        }
        onArchiveCharacter={(characterId) =>
          applyMutation(archiveCharacter(state, characterId))
        }
        onReactivateCharacter={(characterId) =>
          applyMutation(reactivateCharacter(state, characterId))
        }
      />

      {selectedCharacter && (
        <CharacterDetailPanel
          character={selectedCharacter}
          goals={state.goals}
          taskInstances={state.taskInstances}
          progressionStates={state.progressionStates}
        />
      )}
    </div>
  );
}
