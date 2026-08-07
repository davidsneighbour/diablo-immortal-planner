import { createId } from "../../domain/id.js";
import type { ProgressionSystem } from "../../domain/progression.js";

/** SYNTHETIC FIXTURE DATA (Milestone 6). */
export const paragonProgressionSystem: ProgressionSystem = {
  id: createId("progression-system", "paragon"),
  name: "Paragon Level",
  scope: "character",
  maxLevel: 1000,
  confidence: "unknown",
  notes:
    "Synthetic fixture data for Milestone 6 — not verified against real Diablo Immortal mechanics.",
};

export const fixtureProgressionSystems: readonly ProgressionSystem[] = [
  paragonProgressionSystem,
];
