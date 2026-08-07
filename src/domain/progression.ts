import type { ProgressionSystemId } from "./id.js";
import type { GameDefinitionMetadata } from "./metadata.js";
import type { Scope } from "./scope.js";

export type ProgressionScope = "account" | "character";

/**
 * A persistent character/account upgrade system (character level, gear,
 * legendary gems, Paragon, ...). This list is illustrative, not
 * exhaustive. The definition describes the system; `ProgressionState`
 * (player state) records where a given account/character currently
 * stands within it.
 */
export interface ProgressionSystem extends GameDefinitionMetadata {
  readonly id: ProgressionSystemId;
  readonly name: string;
  readonly scope: ProgressionScope;
  readonly maxLevel?: number;
  readonly description?: string;
}

/** A recorded current level for one progression system, at one scope. */
export interface ProgressionState {
  readonly systemId: ProgressionSystemId;
  readonly scope: Scope;
  readonly currentLevel: number;
  readonly updatedAt: string;
}
