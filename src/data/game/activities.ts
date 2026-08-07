import type { Activity } from "../../domain/activity.js";
import { createId } from "../../domain/id.js";

/**
 * SYNTHETIC FIXTURE DATA (Milestone 6) — not verified against real
 * Diablo Immortal mechanics.
 */
const fixtureNotes =
  "Synthetic fixture data for Milestone 6 — not verified against real Diablo Immortal mechanics.";

/** Referenced by three tasks (daily, weekly, and an event task) to demonstrate one activity progressing several tasks simultaneously. */
export const elderRiftActivity: Activity = {
  id: createId("activity", "elder-rift"),
  name: "Run Elder Rift",
  categories: ["dungeon", "elder-rift"],
  estimatedDurationMinutes: 5,
  confidence: "unknown",
  notes: fixtureNotes,
};

export const bountyActivity: Activity = {
  id: createId("activity", "bounty"),
  name: "Complete a Bounty",
  categories: ["bounty"],
  estimatedDurationMinutes: 10,
  confidence: "unknown",
  notes: fixtureNotes,
};

export const fixtureActivities: readonly Activity[] = [
  elderRiftActivity,
  bountyActivity,
];
