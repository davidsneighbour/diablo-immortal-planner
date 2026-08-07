import { describe, expect, it } from "vitest";
import {
  createEmptyPlayerState,
  type PlayerState,
} from "../persistence/schema.js";
import {
  addCharacter,
  addServer,
  archiveCharacter,
  reactivateCharacter,
  setCharacterStatus,
  updateCharacterDetails,
  updateServer,
} from "./character-management.js";

function withServer(
  state: PlayerState = createEmptyPlayerState(),
): PlayerState {
  const result = addServer(state, {
    name: "Sanctuary 1",
    timezone: "Asia/Bangkok",
    dailyResetTime: "03:00",
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.state;
}

describe("addServer", () => {
  it("adds a server with a generated id and active: true", () => {
    const result = addServer(createEmptyPlayerState(), {
      name: "Sanctuary 1",
      timezone: "Asia/Bangkok",
      dailyResetTime: "03:00",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.servers).toHaveLength(1);
    expect(result.state.servers[0]?.active).toBe(true);
    expect(result.state.servers[0]?.id).toMatch(
      /^server:sanctuary-1-[0-9a-f]{8}$/,
    );
  });

  it("rejects an empty name", () => {
    const result = addServer(createEmptyPlayerState(), {
      name: "  ",
      timezone: "Asia/Bangkok",
      dailyResetTime: "03:00",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed daily reset time", () => {
    const result = addServer(createEmptyPlayerState(), {
      name: "Sanctuary 1",
      timezone: "Asia/Bangkok",
      dailyResetTime: "3am",
    });
    expect(result.ok).toBe(false);
  });
});

describe("updateServer", () => {
  it("applies edits to an existing server", () => {
    const state = withServer();
    const serverId = state.servers[0]?.id;
    if (!serverId) throw new Error("expected a server");
    const result = updateServer(state, serverId, {
      active: false,
      name: "Sanctuary 1 (renamed)",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.servers[0]).toMatchObject({
      active: false,
      name: "Sanctuary 1 (renamed)",
    });
  });

  it("fails for an unknown server", () => {
    const result = updateServer(
      createEmptyPlayerState(),
      "server:does-not-exist" as never,
      { active: false },
    );
    expect(result.ok).toBe(false);
  });
});

describe("addCharacter and the five-character limit", () => {
  it("allows exactly five non-archived characters on one server", () => {
    let state = withServer();
    const serverId = state.servers[0]?.id;
    if (!serverId) throw new Error("expected a server");
    for (let index = 0; index < 5; index += 1) {
      const result = addCharacter(state, {
        serverId,
        name: `Hero ${index}`,
        className: "barbarian",
        level: 1,
      });
      expect(result.ok).toBe(true);
      if (result.ok) state = result.state;
    }
    expect(state.characters).toHaveLength(5);
  });

  it("rejects a sixth non-archived character on the same server", () => {
    let state = withServer();
    const serverId = state.servers[0]?.id;
    if (!serverId) throw new Error("expected a server");
    for (let index = 0; index < 5; index += 1) {
      const result = addCharacter(state, {
        serverId,
        name: `Hero ${index}`,
        className: "barbarian",
        level: 1,
      });
      if (result.ok) state = result.state;
    }
    const sixth = addCharacter(state, {
      serverId,
      name: "Hero 5",
      className: "barbarian",
      level: 1,
    });
    expect(sixth.ok).toBe(false);
    expect(state.characters).toHaveLength(5);
  });

  it("rejects a character assigned to an unknown server", () => {
    const result = addCharacter(createEmptyPlayerState(), {
      serverId: "server:does-not-exist" as never,
      name: "Orphan",
      className: "barbarian",
      level: 1,
    });
    expect(result.ok).toBe(false);
  });
});

describe("updateCharacterDetails", () => {
  it("edits character fields without touching serverId or status", () => {
    let state = withServer();
    const serverId = state.servers[0]?.id;
    if (!serverId) throw new Error("expected a server");
    const created = addCharacter(state, {
      serverId,
      name: "Conan",
      className: "barbarian",
      level: 1,
    });
    if (!created.ok) throw new Error(created.error);
    state = created.state;
    const characterId = state.characters[0]?.id;
    if (!characterId) throw new Error("expected a character");

    const result = updateCharacterDetails(state, characterId, {
      level: 60,
      paragonLevel: 120,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.characters[0]).toMatchObject({
      level: 60,
      paragonLevel: 120,
      serverId,
      status: "active",
    });
  });

  it("fails for an unknown character", () => {
    const result = updateCharacterDetails(
      createEmptyPlayerState(),
      "character:does-not-exist" as never,
      { level: 2 },
    );
    expect(result.ok).toBe(false);
  });
});

describe("archiveCharacter / reactivateCharacter", () => {
  it("archiving always succeeds and frees a slot for a new character", () => {
    let state = withServer();
    const serverId = state.servers[0]?.id;
    if (!serverId) throw new Error("expected a server");
    for (let index = 0; index < 5; index += 1) {
      const result = addCharacter(state, {
        serverId,
        name: `Hero ${index}`,
        className: "barbarian",
        level: 1,
      });
      if (result.ok) state = result.state;
    }
    const firstCharacterId = state.characters[0]?.id;
    if (!firstCharacterId) throw new Error("expected a character");

    const archived = archiveCharacter(state, firstCharacterId);
    expect(archived.ok).toBe(true);
    if (!archived.ok) return;
    expect(
      archived.state.characters.find((c) => c.id === firstCharacterId)?.status,
    ).toBe("archived");

    const sixth = addCharacter(archived.state, {
      serverId,
      name: "Hero 5",
      className: "barbarian",
      level: 1,
    });
    expect(sixth.ok).toBe(true);
  });

  it("reactivating re-checks the five-character limit", () => {
    let state = withServer();
    const serverId = state.servers[0]?.id;
    if (!serverId) throw new Error("expected a server");
    for (let index = 0; index < 5; index += 1) {
      const result = addCharacter(state, {
        serverId,
        name: `Hero ${index}`,
        className: "barbarian",
        level: 1,
      });
      if (result.ok) state = result.state;
    }
    const firstCharacterId = state.characters[0]?.id;
    if (!firstCharacterId) throw new Error("expected a character");
    const archived = archiveCharacter(state, firstCharacterId);
    if (!archived.ok) throw new Error(archived.error);

    // Server is back at 4 non-archived characters, so reactivating should succeed...
    const reactivated = reactivateCharacter(archived.state, firstCharacterId);
    expect(reactivated.ok).toBe(true);
    if (!reactivated.ok) return;

    // ...but archiving and then filling the freed slot with someone else should block reactivation.
    const archivedAgain = archiveCharacter(reactivated.state, firstCharacterId);
    if (!archivedAgain.ok) throw new Error(archivedAgain.error);
    const filled = addCharacter(archivedAgain.state, {
      serverId,
      name: "Hero 5",
      className: "barbarian",
      level: 1,
    });
    if (!filled.ok) throw new Error(filled.error);
    const blockedReactivation = reactivateCharacter(
      filled.state,
      firstCharacterId,
    );
    expect(blockedReactivation.ok).toBe(false);
  });

  it("setCharacterStatus fails for an unknown character", () => {
    const result = setCharacterStatus(
      createEmptyPlayerState(),
      "character:does-not-exist" as never,
      "inactive",
    );
    expect(result.ok).toBe(false);
  });
});
