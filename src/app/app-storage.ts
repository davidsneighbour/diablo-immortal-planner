import { IndexedDbDocumentStorage } from "../persistence/indexed-db-storage.js";
import type { DocumentStorage } from "../persistence/storage.js";

const DATABASE_NAME = "diablo-immortal-planner";
const STORE_NAME = "player-state";

/** The real app's player-state storage. Only usable in a browser — never import this from server-rendered or build-time code. */
export function createAppStorage(): DocumentStorage<unknown> {
  return new IndexedDbDocumentStorage(DATABASE_NAME, STORE_NAME);
}
