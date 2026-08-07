import type { GameDefinitionSet } from "../domain/definition-set.js";
import type { ValidationError } from "../domain/validation.js";
import {
  createEmptyPlayerState,
  type PlayerState,
} from "../persistence/schema.js";
import type { DocumentStorage } from "../persistence/storage.js";
import {
  loadPlayerState,
  resetPlayerState,
  updatePlayerState,
} from "../persistence/store.js";

export type PlayerStateSnapshot =
  | { readonly status: "loading"; readonly state: PlayerState }
  | { readonly status: "ready"; readonly state: PlayerState }
  | {
      readonly status: "invalid";
      readonly state: PlayerState;
      readonly errors: readonly ValidationError[];
    };

/**
 * The "application/domain services" layer between UI and persistence
 * (see `PLAN.md`'s persistence architecture diagram: UI → application/
 * domain services → repository/storage interface → IndexedDB
 * implementation). React components subscribe to this and call its
 * methods; they never import `DocumentStorage`/IndexedDB themselves.
 *
 * Framework-independent by design — nothing here is React-specific, but
 * its `subscribe`/`getSnapshot` shape matches what React's
 * `useSyncExternalStore` expects, so no extra state-management
 * dependency is needed to consume it from a component.
 */
export class PlayerStateController {
  private readonly storage: DocumentStorage<unknown>;
  private readonly gameDefinitions: GameDefinitionSet | undefined;
  private snapshot: PlayerStateSnapshot;
  private readonly listeners: Set<() => void>;

  constructor(
    storage: DocumentStorage<unknown>,
    gameDefinitions?: GameDefinitionSet,
  ) {
    this.storage = storage;
    this.gameDefinitions = gameDefinitions;
    this.snapshot = { status: "loading", state: createEmptyPlayerState() };
    this.listeners = new Set();
  }

  getSnapshot = (): PlayerStateSnapshot => {
    return this.snapshot;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  async initialize(): Promise<void> {
    const result = await loadPlayerState(this.storage, this.gameDefinitions);
    if (result.status === "invalid") {
      this.setSnapshot({
        status: "invalid",
        state: createEmptyPlayerState(),
        errors: result.errors,
      });
      return;
    }
    this.setSnapshot({ status: "ready", state: result.state });
  }

  /** Applies a `PlayerState` transformation and persists the result — the standard "mutate and auto-save" path every character/server action goes through. */
  async update(updater: (state: PlayerState) => PlayerState): Promise<void> {
    const next = await updatePlayerState(
      this.storage,
      this.snapshot.state,
      updater,
    );
    this.setSnapshot({ status: "ready", state: next });
  }

  async reset(): Promise<void> {
    const next = await resetPlayerState(this.storage);
    this.setSnapshot({ status: "ready", state: next });
  }

  private setSnapshot(next: PlayerStateSnapshot): void {
    this.snapshot = next;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
