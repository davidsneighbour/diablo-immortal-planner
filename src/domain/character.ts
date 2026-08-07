import type { CharacterId, ServerId } from "./id.js";

export type CharacterStatus = "active" | "inactive" | "archived";

/**
 * A character belongs to exactly one server. Character progression is
 * deliberately not modeled as a fixed set of fields here — see
 * `ProgressionSystem` and `ProgressionState` for extensible progression
 * tracking, and `Goal` for character-specific goals.
 */
export interface Character {
  readonly id: CharacterId;
  readonly serverId: ServerId;
  readonly name: string;
  readonly className: string;
  readonly level: number;
  readonly paragonLevel?: number;
  readonly status: CharacterStatus;
  readonly notes?: string;
}
