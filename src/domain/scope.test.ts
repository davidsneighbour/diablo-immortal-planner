import { describe, expect, it } from "vitest";
import { createId } from "./id.js";
import {
  isAccountScope,
  isCharacterScope,
  isServerScope,
  scopesEqual,
} from "./scope.js";

describe("scope type guards", () => {
  it("identify each scope variant", () => {
    const account = { type: "account" } as const;
    const server = {
      type: "server",
      serverId: createId("server", "sanctuary-1"),
    } as const;
    const character = {
      type: "character",
      characterId: createId("character", "barbarian-1"),
    } as const;

    expect(isAccountScope(account)).toBe(true);
    expect(isServerScope(account)).toBe(false);
    expect(isCharacterScope(account)).toBe(false);

    expect(isServerScope(server)).toBe(true);
    expect(isAccountScope(server)).toBe(false);

    expect(isCharacterScope(character)).toBe(true);
    expect(isAccountScope(character)).toBe(false);
  });
});

describe("scopesEqual", () => {
  it("treats two account scopes as equal", () => {
    expect(scopesEqual({ type: "account" }, { type: "account" })).toBe(true);
  });

  it("compares server scopes by serverId", () => {
    const a = {
      type: "server",
      serverId: createId("server", "sanctuary-1"),
    } as const;
    const b = {
      type: "server",
      serverId: createId("server", "sanctuary-1"),
    } as const;
    const c = {
      type: "server",
      serverId: createId("server", "sanctuary-2"),
    } as const;
    expect(scopesEqual(a, b)).toBe(true);
    expect(scopesEqual(a, c)).toBe(false);
  });

  it("never treats one character scope as equal to a different character, even on the same server", () => {
    const characterA = {
      type: "character",
      characterId: createId("character", "barbarian-1"),
    } as const;
    const characterB = {
      type: "character",
      characterId: createId("character", "necromancer-1"),
    } as const;
    expect(scopesEqual(characterA, characterB)).toBe(false);
  });

  it("never treats scopes of different types as equal", () => {
    const account = { type: "account" } as const;
    const character = {
      type: "character",
      characterId: createId("character", "barbarian-1"),
    } as const;
    expect(scopesEqual(account, character)).toBe(false);
  });
});
