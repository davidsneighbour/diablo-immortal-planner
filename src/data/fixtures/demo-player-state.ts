import type { Character } from "../../domain/character.js";
import type { Goal } from "../../domain/goal.js";
import { createId } from "../../domain/id.js";
import type { ProgressionState } from "../../domain/progression.js";
import type { Server } from "../../domain/server.js";
import { paragonProgressionSystem } from "../game/progression.js";
import { fixtureServerId } from "../game/reset-rules.js";

/**
 * DEMO PLAYER-STATE FIXTURE (Milestone 6) — not real save data. Exists
 * to prove the player-state side of the domain model (independent
 * per-character progress, independent goals) works end to end, combined
 * with `src/data/game/fixture-definitions.ts`.
 */
export const fixtureServer: Server = {
  id: fixtureServerId,
  name: "Sanctuary 1",
  timezone: "Asia/Bangkok",
  dailyResetTime: "03:00",
  active: true,
  notes: "Demo fixture server for Milestone 6 — not a real configured server.",
};

export const fixtureCharacterA: Character = {
  id: createId("character", "barbarian-1"),
  serverId: fixtureServer.id,
  name: "Conan",
  className: "barbarian",
  level: 60,
  paragonLevel: 120,
  status: "active",
  notes: "Demo fixture character for Milestone 6.",
};

export const fixtureCharacterB: Character = {
  id: createId("character", "necromancer-1"),
  serverId: fixtureServer.id,
  name: "Death",
  className: "necromancer",
  level: 58,
  paragonLevel: 40,
  status: "active",
  notes: "Demo fixture character for Milestone 6.",
};

export const fixtureCharacterC: Character = {
  id: createId("character", "monk-1"),
  serverId: fixtureServer.id,
  name: "Zen",
  className: "monk",
  level: 42,
  status: "active",
  notes: "Demo fixture character for Milestone 6.",
};

export const fixtureCharacters: readonly Character[] = [
  fixtureCharacterA,
  fixtureCharacterB,
  fixtureCharacterC,
];

/** Independent goals for two different characters — a third character has none, which is equally valid. */
export const fixtureGoals: readonly Goal[] = [
  {
    id: createId("goal", "upgrade-legendary-gem-a"),
    scope: { type: "character", characterId: fixtureCharacterA.id },
    name: "Upgrade legendary gem to rank 10",
    createdAt: "2026-08-01T00:00:00Z",
  },
  {
    id: createId("goal", "reach-paragon-100-b"),
    scope: { type: "character", characterId: fixtureCharacterB.id },
    name: "Reach Paragon 100",
    targetProgressionSystemId: paragonProgressionSystem.id,
    targetLevel: 100,
    createdAt: "2026-08-01T00:00:00Z",
  },
];

export const fixtureProgressionStates: readonly ProgressionState[] = [
  {
    systemId: paragonProgressionSystem.id,
    scope: { type: "character", characterId: fixtureCharacterA.id },
    currentLevel: fixtureCharacterA.paragonLevel ?? 0,
    updatedAt: "2026-08-08T00:00:00Z",
  },
  {
    systemId: paragonProgressionSystem.id,
    scope: { type: "character", characterId: fixtureCharacterB.id },
    currentLevel: fixtureCharacterB.paragonLevel ?? 0,
    updatedAt: "2026-08-08T00:00:00Z",
  },
];
