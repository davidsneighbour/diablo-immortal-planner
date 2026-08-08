import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createAppStorage } from "../app/app-storage.js";
import { getAppGameDefinitions } from "../app/game-definitions.js";
import { getInitialPlayerState } from "../app/initial-player-state.js";
import {
  PlayerStateController,
  type PlayerStateSnapshot,
} from "../app/player-state-controller.js";

export interface UsePlayerStateControllerResult {
  readonly controller: PlayerStateController;
  readonly snapshot: PlayerStateSnapshot;
}

/** Creates (once) and initializes the app's `PlayerStateController`, and subscribes the component to its state. Only safe to call from a client-only component — it touches IndexedDB. */
export function usePlayerStateController(): UsePlayerStateControllerResult {
  const controller = useMemo(
    () =>
      new PlayerStateController(
        createAppStorage(),
        getAppGameDefinitions(),
        getInitialPlayerState(),
      ),
    [],
  );

  useEffect(() => {
    void controller.initialize();
  }, [controller]);

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );

  return { controller, snapshot };
}
