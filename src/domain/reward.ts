import type { ResetRuleId, ResourceId, RewardCapId, RewardId } from "./id.js";
import type { GameDefinitionMetadata } from "./metadata.js";

/** How much of a resource a reward grants. Quantities are not always known or fixed. */
export type RewardQuantity =
  | { readonly kind: "fixed"; readonly amount: number }
  | { readonly kind: "range"; readonly min: number; readonly max: number }
  | { readonly kind: "unknown" };

export interface RewardEntry {
  readonly resourceId: ResourceId;
  readonly quantity: RewardQuantity;
  /** True if this entry is one of several possible drops rather than guaranteed. */
  readonly optional?: boolean;
}

/**
 * A limit on how many times a reward's meaningful payout can be earned,
 * modeled independently of whether the activity/task granting it remains
 * playable. An activity can stay playable after its tracked rewards are
 * exhausted — that distinction lives here, not in availability.
 */
export type RewardCapPeriod =
  | "per-run"
  | "daily"
  | "weekly"
  | "per-event"
  | "lifetime"
  | "custom";

export interface RewardCap {
  readonly id: RewardCapId;
  readonly period: RewardCapPeriod;
  /** The number of rewarded occurrences allowed within `period`. */
  readonly limit: number;
  /** Required when `period` is `'custom'`: the schedule the cap itself resets on. */
  readonly resetRuleId?: ResetRuleId;
}

export interface Reward extends GameDefinitionMetadata {
  readonly id: RewardId;
  readonly entries: readonly RewardEntry[];
  readonly capId?: RewardCapId;
  /** True if this reward represents a container/milestone payout rather than a direct grant. */
  readonly isContainer?: boolean;
}
