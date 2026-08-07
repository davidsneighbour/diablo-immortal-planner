/**
 * The storage abstraction the rest of the app depends on. A "document
 * store" — one serializable JSON value per logical database — rather
 * than a generic multi-table repository, proportionate to a single-user
 * personal tool where the entire player state is one coherent document.
 * React components must never touch `IndexedDbDocumentStorage` (or
 * `localStorage`/`indexedDB`) directly; they go through the application
 * services built on this interface instead.
 */
export interface DocumentStorage<T> {
  load(): Promise<T | null>;
  save(value: T): Promise<void>;
  clear(): Promise<void>;
}

/** An in-memory `DocumentStorage`, for tests and any non-browser context. */
export class InMemoryDocumentStorage<T> implements DocumentStorage<T> {
  private value: T | null = null;

  load(): Promise<T | null> {
    return Promise.resolve(this.value);
  }

  save(value: T): Promise<void> {
    this.value = value;
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.value = null;
    return Promise.resolve();
  }
}
