import type { ResourceId } from "./id.js";
import type { GameDefinitionMetadata } from "./metadata.js";

/**
 * An open-ended taxonomy for loot/resources. This list is illustrative,
 * not exhaustive — new categories can be added without restructuring
 * `Resource` itself.
 */
export type ResourceCategory =
  | "currency"
  | "crafting-material"
  | "equipment"
  | "gem"
  | "legendary-gem"
  | "crest"
  | "key"
  | "token"
  | "event-currency"
  | "experience"
  | "battle-pass-point"
  | "upgrade-material"
  | "other";

export type ResourceOwnership = "account" | "character";

export interface Resource extends GameDefinitionMetadata {
  readonly id: ResourceId;
  readonly name: string;
  readonly category: ResourceCategory;
  readonly ownership: ResourceOwnership;
  readonly description?: string;
}
