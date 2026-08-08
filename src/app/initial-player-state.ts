import {
  fixtureCharacters,
  fixtureGoals,
  fixtureProgressionStates,
  fixtureServer,
} from "../data/fixtures/demo-player-state.js";
import {
  createEmptyPlayerState,
  type PlayerState,
} from "../persistence/schema.js";

/**
 * Seeds a brand-new install with the Milestone 6 demo player-state
 * fixture, whose `fixtureServer` id is exactly what the fixture game
 * definitions' reset rules reference (see `reset-rules.ts`). Without
 * this, a fresh account has no server for those reset rules to resolve
 * against, and — once `getAppGameDefinitions()` is wired into
 * validation — starting from `createEmptyPlayerState()` would be
 * rejected as invalid before the player ever gets to add their own
 * server. The seeded data is exactly what `DemoDataBanner` already
 * warns about, so it's never presented as real progress.
 */
export function getInitialPlayerState(): PlayerState {
  return {
    ...createEmptyPlayerState(),
    servers: [fixtureServer],
    characters: fixtureCharacters,
    goals: fixtureGoals,
    progressionStates: fixtureProgressionStates,
  };
}
