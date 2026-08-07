import { createId } from "../../domain/id.js";
import type { Resource } from "../../domain/resource.js";

/**
 * SYNTHETIC FIXTURE DATA (Milestone 6). Demonstrates the resource
 * taxonomy — not verified against real Diablo Immortal loot tables.
 */
const fixtureNotes =
  "Synthetic fixture data for Milestone 6 — not verified against real Diablo Immortal mechanics.";

export const goldResource: Resource = {
  id: createId("resource", "gold"),
  name: "Gold",
  category: "currency",
  ownership: "account",
  confidence: "unknown",
  notes: fixtureNotes,
};

export const telluricPearlResource: Resource = {
  id: createId("resource", "telluric-pearl"),
  name: "Telluric Pearl",
  category: "crafting-material",
  ownership: "account",
  confidence: "unknown",
  notes: fixtureNotes,
};

export const battlePassPointResource: Resource = {
  id: createId("resource", "battle-pass-point"),
  name: "Battle Pass Point",
  category: "battle-pass-point",
  ownership: "account",
  confidence: "unknown",
  notes: fixtureNotes,
};

export const fixtureResources: readonly Resource[] = [
  goldResource,
  telluricPearlResource,
  battlePassPointResource,
];
