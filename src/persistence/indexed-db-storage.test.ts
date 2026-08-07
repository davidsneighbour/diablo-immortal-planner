import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbDocumentStorage } from "./indexed-db-storage.js";

interface Sample {
  readonly value: number;
}

describe("IndexedDbDocumentStorage", () => {
  it("returns null before anything has been saved", async () => {
    const storage = new IndexedDbDocumentStorage<Sample>(
      "test-db-empty",
      "store",
    );
    expect(await storage.load()).toBeNull();
  });

  it("persists and retrieves a saved value", async () => {
    const storage = new IndexedDbDocumentStorage<Sample>(
      "test-db-save",
      "store",
    );
    await storage.save({ value: 42 });
    expect(await storage.load()).toEqual({ value: 42 });
  });

  it("overwrites the previous value on save", async () => {
    const storage = new IndexedDbDocumentStorage<Sample>(
      "test-db-overwrite",
      "store",
    );
    await storage.save({ value: 1 });
    await storage.save({ value: 2 });
    expect(await storage.load()).toEqual({ value: 2 });
  });

  it("returns null after clear", async () => {
    const storage = new IndexedDbDocumentStorage<Sample>(
      "test-db-clear",
      "store",
    );
    await storage.save({ value: 1 });
    await storage.clear();
    expect(await storage.load()).toBeNull();
  });

  it("retains data across separate storage instances against the same database — simulating a page reload", async () => {
    const databaseName = "test-db-reload";
    const first = new IndexedDbDocumentStorage<Sample>(databaseName, "store");
    await first.save({ value: 7 });

    const second = new IndexedDbDocumentStorage<Sample>(databaseName, "store");
    expect(await second.load()).toEqual({ value: 7 });
  });
});
