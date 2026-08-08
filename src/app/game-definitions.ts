import { getFixtureDefinitionSet } from "../data/game/fixture-definitions.js";
import type { GameDefinitionSet } from "../domain/definition-set.js";

/**
 * The game definitions the live app currently runs on. PLAN.md's
 * Milestone 16 ("Replace synthetic fixtures with progressively verified
 * game definitions") frames the fixtures as the interim dataset the app
 * uses until real, verified content lands — not test-only data. This
 * function is the single place that decides what the app loads; when
 * real data arrives, only this function changes.
 *
 * The fixtures are still synthetic and unverified — see
 * `DemoDataBanner.astro`, which must be shown anywhere this data
 * reaches the UI, so nothing is presented as fact.
 */
export function getAppGameDefinitions(): GameDefinitionSet {
  return getFixtureDefinitionSet();
}
