import { useState } from "react";
import type { Character } from "../../domain/character.js";
import type { CharacterId } from "../../domain/id.js";
import { MAX_CHARACTERS_PER_SERVER, type Server } from "../../domain/server.js";
import type {
  CharacterDetailEdits,
  NewCharacterInput,
} from "../../planner/character-management.js";

export interface CharacterListProps {
  readonly servers: readonly Server[];
  readonly characters: readonly Character[];
  readonly selectedCharacterId: CharacterId | null;
  readonly onSelectCharacter: (characterId: CharacterId) => void;
  readonly onAddCharacter: (input: NewCharacterInput) => void;
  readonly onUpdateCharacter: (
    characterId: CharacterId,
    changes: CharacterDetailEdits,
  ) => void;
  readonly onArchiveCharacter: (characterId: CharacterId) => void;
  readonly onReactivateCharacter: (characterId: CharacterId) => void;
}

interface ParsedCharacterForm {
  readonly name: string;
  readonly className: string;
  readonly level: number;
  readonly paragonLevel: number | undefined;
  readonly notes: string;
}

function readCharacterForm(form: HTMLFormElement): ParsedCharacterForm {
  const data = new FormData(form);
  const paragonLevelRaw = data.get("paragonLevel");
  const paragonLevel =
    paragonLevelRaw && String(paragonLevelRaw).length > 0
      ? Number(paragonLevelRaw)
      : undefined;
  return {
    name: String(data.get("name") ?? ""),
    className: String(data.get("className") ?? ""),
    level: Number(data.get("level") ?? 1),
    paragonLevel,
    notes: String(data.get("notes") ?? ""),
  };
}

export function CharacterList({
  servers,
  characters,
  selectedCharacterId,
  onSelectCharacter,
  onAddCharacter,
  onUpdateCharacter,
  onArchiveCharacter,
  onReactivateCharacter,
}: CharacterListProps) {
  const [editingCharacterId, setEditingCharacterId] =
    useState<CharacterId | null>(null);

  return (
    <section aria-labelledby="characters-heading" className="space-y-3">
      <h2
        id="characters-heading"
        className="text-lg font-semibold text-neutral-100"
      >
        Characters
      </h2>

      {servers.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Add a server before creating characters.
        </p>
      ) : (
        servers.map((server) => {
          const serverCharacters = characters.filter(
            (character) => character.serverId === server.id,
          );
          const activeCount = serverCharacters.filter(
            (character) => character.status !== "archived",
          ).length;
          const atCapacity = activeCount >= MAX_CHARACTERS_PER_SERVER;

          return (
            <div
              key={server.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3"
            >
              <h3 className="text-sm font-semibold text-neutral-200">
                {server.name}{" "}
                <span className="font-normal text-neutral-500">
                  ({activeCount}/{MAX_CHARACTERS_PER_SERVER})
                </span>
              </h3>

              <ul className="mt-2 space-y-2">
                {serverCharacters.map((character) => (
                  <li key={character.id}>
                    {editingCharacterId === character.id ? (
                      <form
                        className="flex flex-wrap items-end gap-2 rounded-md border border-neutral-700 p-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const parsed = readCharacterForm(event.currentTarget);
                          onUpdateCharacter(character.id, {
                            name: parsed.name,
                            className: parsed.className,
                            level: parsed.level,
                            ...(parsed.paragonLevel !== undefined
                              ? { paragonLevel: parsed.paragonLevel }
                              : {}),
                            ...(parsed.notes ? { notes: parsed.notes } : {}),
                          });
                          setEditingCharacterId(null);
                        }}
                      >
                        <label className="flex flex-col text-xs text-neutral-400">
                          Name
                          <input
                            name="name"
                            defaultValue={character.name}
                            required
                            className="mt-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                          />
                        </label>
                        <label className="flex flex-col text-xs text-neutral-400">
                          Class
                          <input
                            name="className"
                            defaultValue={character.className}
                            required
                            className="mt-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                          />
                        </label>
                        <label className="flex flex-col text-xs text-neutral-400">
                          Level
                          <input
                            name="level"
                            type="number"
                            min={1}
                            defaultValue={character.level}
                            required
                            className="mt-1 w-20 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                          />
                        </label>
                        <label className="flex flex-col text-xs text-neutral-400">
                          Paragon
                          <input
                            name="paragonLevel"
                            type="number"
                            min={0}
                            defaultValue={character.paragonLevel}
                            className="mt-1 w-20 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                          />
                        </label>
                        <button
                          type="submit"
                          className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-neutral-950"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-100"
                          onClick={() => setEditingCharacterId(null)}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 ${
                          selectedCharacterId === character.id
                            ? "bg-neutral-800"
                            : "hover:bg-neutral-900"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectCharacter(character.id)}
                          aria-pressed={selectedCharacterId === character.id}
                          className="flex-1 rounded-sm text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                        >
                          <span
                            className={
                              character.status === "archived"
                                ? "text-neutral-500 line-through"
                                : "text-neutral-100"
                            }
                          >
                            {character.name}
                          </span>{" "}
                          <span className="text-sm text-neutral-400">
                            {character.className} · level {character.level}
                            {character.paragonLevel !== undefined
                              ? ` · Paragon ${character.paragonLevel}`
                              : ""}
                          </span>
                          {character.status !== "active" && (
                            <span className="ml-2 rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                              {character.status}
                            </span>
                          )}
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                            onClick={() => setEditingCharacterId(character.id)}
                          >
                            Edit
                          </button>
                          {character.status === "archived" ? (
                            <button
                              type="button"
                              className="rounded-md px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                              onClick={() =>
                                onReactivateCharacter(character.id)
                              }
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="rounded-md px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                              onClick={() => onArchiveCharacter(character.id)}
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
                {serverCharacters.length === 0 && (
                  <p className="text-sm text-neutral-500">No characters yet.</p>
                )}
              </ul>

              <details className="mt-3">
                <summary
                  className={`cursor-pointer text-sm ${atCapacity ? "text-neutral-600" : "text-neutral-300"}`}
                >
                  Add a character
                </summary>
                {atCapacity ? (
                  <p className="mt-2 text-sm text-neutral-500">
                    This server already has {MAX_CHARACTERS_PER_SERVER}{" "}
                    characters. Archive one to add another.
                  </p>
                ) : (
                  <form
                    className="mt-2 flex flex-wrap items-end gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const parsed = readCharacterForm(event.currentTarget);
                      onAddCharacter({
                        serverId: server.id,
                        name: parsed.name,
                        className: parsed.className,
                        level: parsed.level,
                        ...(parsed.paragonLevel !== undefined
                          ? { paragonLevel: parsed.paragonLevel }
                          : {}),
                      });
                      event.currentTarget.reset();
                    }}
                  >
                    <label className="flex flex-col text-xs text-neutral-400">
                      Name
                      <input
                        name="name"
                        required
                        className="mt-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                      />
                    </label>
                    <label className="flex flex-col text-xs text-neutral-400">
                      Class
                      <input
                        name="className"
                        required
                        placeholder="barbarian"
                        className="mt-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                      />
                    </label>
                    <label className="flex flex-col text-xs text-neutral-400">
                      Level
                      <input
                        name="level"
                        type="number"
                        min={1}
                        defaultValue={1}
                        required
                        className="mt-1 w-20 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                      />
                    </label>
                    <label className="flex flex-col text-xs text-neutral-400">
                      Paragon
                      <input
                        name="paragonLevel"
                        type="number"
                        min={0}
                        className="mt-1 w-20 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-neutral-950"
                    >
                      Add character
                    </button>
                  </form>
                )}
              </details>
            </div>
          );
        })
      )}
    </section>
  );
}
