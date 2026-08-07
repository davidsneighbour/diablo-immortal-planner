import type { Character, CharacterStatus } from "../domain/character.js";
import type { CharacterId, Id, ServerId } from "../domain/id.js";
import { createId, slugify } from "../domain/id.js";
import type { Server } from "../domain/server.js";
import { MAX_CHARACTERS_PER_SERVER } from "../domain/server.js";
import { isValidTimeOfDay } from "../domain/time-of-day.js";
import type { PlayerState } from "../persistence/schema.js";

export type PlayerStateMutationResult =
  | { readonly ok: true; readonly state: PlayerState }
  | { readonly ok: false; readonly error: string };

function ok(state: PlayerState): PlayerStateMutationResult {
  return { ok: true, state };
}

function fail(error: string): PlayerStateMutationResult {
  return { ok: false, error };
}

/**
 * Generates an ID for a player-created entity: a name-derived slug plus
 * a short unique suffix. Unlike game-definition/fixture IDs (which are
 * deterministic so re-deriving the same input yields the same ID),
 * player-created entities need genuine uniqueness — two characters can
 * share a display name.
 */
function generateEntityId<Kind extends string>(
  kind: Kind,
  name: string,
): Id<Kind> {
  const base = slugify(name) || "unnamed";
  const suffix = crypto.randomUUID().slice(0, 8);
  return createId(kind, `${base}-${suffix}`);
}

export interface NewServerInput {
  readonly name: string;
  readonly timezone: string;
  readonly dailyResetTime: string;
  readonly notes?: string;
}

export function addServer(
  state: PlayerState,
  input: NewServerInput,
): PlayerStateMutationResult {
  if (input.name.trim().length === 0) {
    return fail("Server name is required.");
  }
  if (!isValidTimeOfDay(input.dailyResetTime)) {
    return fail('Daily reset time must be a 24-hour "HH:MM" value.');
  }
  const server: Server = {
    id: generateEntityId("server", input.name),
    name: input.name.trim(),
    timezone: input.timezone,
    dailyResetTime: input.dailyResetTime,
    active: true,
    ...(input.notes ? { notes: input.notes } : {}),
  };
  return ok({ ...state, servers: [...state.servers, server] });
}

export type ServerEdits = Partial<
  Pick<Server, "name" | "timezone" | "dailyResetTime" | "active" | "notes">
>;

export function updateServer(
  state: PlayerState,
  serverId: ServerId,
  changes: ServerEdits,
): PlayerStateMutationResult {
  const server = state.servers.find((candidate) => candidate.id === serverId);
  if (!server) {
    return fail(`Server "${serverId}" was not found.`);
  }
  if (changes.name !== undefined && changes.name.trim().length === 0) {
    return fail("Server name is required.");
  }
  if (
    changes.dailyResetTime !== undefined &&
    !isValidTimeOfDay(changes.dailyResetTime)
  ) {
    return fail('Daily reset time must be a 24-hour "HH:MM" value.');
  }
  const updated: Server = { ...server, ...changes };
  return ok({
    ...state,
    servers: state.servers.map((candidate) =>
      candidate.id === serverId ? updated : candidate,
    ),
  });
}

function countNonArchivedCharacters(
  state: PlayerState,
  serverId: ServerId,
  excludingCharacterId?: CharacterId,
): number {
  return state.characters.filter(
    (character) =>
      character.serverId === serverId &&
      character.status !== "archived" &&
      character.id !== excludingCharacterId,
  ).length;
}

export interface NewCharacterInput {
  readonly serverId: ServerId;
  readonly name: string;
  readonly className: string;
  readonly level: number;
  readonly paragonLevel?: number;
  readonly notes?: string;
}

/** Enforces PLAN.md's rule: no server may have more than five active/configured character slots. */
export function addCharacter(
  state: PlayerState,
  input: NewCharacterInput,
): PlayerStateMutationResult {
  if (input.name.trim().length === 0) {
    return fail("Character name is required.");
  }
  if (!state.servers.some((server) => server.id === input.serverId)) {
    return fail(`Server "${input.serverId}" was not found.`);
  }
  if (
    countNonArchivedCharacters(state, input.serverId) >=
    MAX_CHARACTERS_PER_SERVER
  ) {
    return fail(
      `This server already has ${MAX_CHARACTERS_PER_SERVER} characters.`,
    );
  }
  const character: Character = {
    id: generateEntityId("character", input.name),
    serverId: input.serverId,
    name: input.name.trim(),
    className: input.className,
    level: input.level,
    status: "active",
    ...(input.paragonLevel !== undefined
      ? { paragonLevel: input.paragonLevel }
      : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };
  return ok({ ...state, characters: [...state.characters, character] });
}

export type CharacterDetailEdits = Partial<
  Pick<Character, "name" | "className" | "level" | "paragonLevel" | "notes">
>;

/** Edits character details. Does not change `serverId` or `status` — see `setCharacterStatus` for status changes, which have five-character-limit implications this function deliberately doesn't handle. */
export function updateCharacterDetails(
  state: PlayerState,
  characterId: CharacterId,
  changes: CharacterDetailEdits,
): PlayerStateMutationResult {
  const character = state.characters.find(
    (candidate) => candidate.id === characterId,
  );
  if (!character) {
    return fail(`Character "${characterId}" was not found.`);
  }
  if (changes.name !== undefined && changes.name.trim().length === 0) {
    return fail("Character name is required.");
  }
  const updated: Character = { ...character, ...changes };
  return ok({
    ...state,
    characters: state.characters.map((candidate) =>
      candidate.id === characterId ? updated : candidate,
    ),
  });
}

/**
 * Sets a character's status. Archiving always succeeds and frees a
 * character slot. Setting any other status (including reactivating an
 * archived character) re-checks the five-character limit, since it can
 * put a server back over capacity.
 */
export function setCharacterStatus(
  state: PlayerState,
  characterId: CharacterId,
  status: CharacterStatus,
): PlayerStateMutationResult {
  const character = state.characters.find(
    (candidate) => candidate.id === characterId,
  );
  if (!character) {
    return fail(`Character "${characterId}" was not found.`);
  }
  if (
    status !== "archived" &&
    countNonArchivedCharacters(state, character.serverId, characterId) >=
      MAX_CHARACTERS_PER_SERVER
  ) {
    return fail(
      `This server already has ${MAX_CHARACTERS_PER_SERVER} characters.`,
    );
  }
  const updated: Character = { ...character, status };
  return ok({
    ...state,
    characters: state.characters.map((candidate) =>
      candidate.id === characterId ? updated : candidate,
    ),
  });
}

export function archiveCharacter(
  state: PlayerState,
  characterId: CharacterId,
): PlayerStateMutationResult {
  return setCharacterStatus(state, characterId, "archived");
}

export function reactivateCharacter(
  state: PlayerState,
  characterId: CharacterId,
): PlayerStateMutationResult {
  return setCharacterStatus(state, characterId, "active");
}
