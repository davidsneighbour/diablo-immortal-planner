import type { CharacterId, ServerId } from "./id.js";

/**
 * The ownership scope of a task, goal, or progression record. Scope is a
 * first-class concept: completion, progress, and goals must never be
 * assumed to apply to any character other than the one named here unless
 * the scope itself is `account` or `server`.
 */
export type Scope =
  | { readonly type: "account" }
  | { readonly type: "server"; readonly serverId: ServerId }
  | { readonly type: "character"; readonly characterId: CharacterId };

export function isAccountScope(scope: Scope): scope is { type: "account" } {
  return scope.type === "account";
}

export function isServerScope(
  scope: Scope,
): scope is { type: "server"; serverId: ServerId } {
  return scope.type === "server";
}

export function isCharacterScope(
  scope: Scope,
): scope is { type: "character"; characterId: CharacterId } {
  return scope.type === "character";
}

/** Structural equality for two scopes (same type and, where applicable, same target ID). */
export function scopesEqual(a: Scope, b: Scope): boolean {
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === "server" && b.type === "server") {
    return a.serverId === b.serverId;
  }
  if (a.type === "character" && b.type === "character") {
    return a.characterId === b.characterId;
  }
  return true;
}
