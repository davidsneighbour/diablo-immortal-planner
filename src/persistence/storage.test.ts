import { describe, expect, it } from "vitest";
import { InMemoryDocumentStorage } from "./storage.js";

describe("InMemoryDocumentStorage", () => {
  it("returns null before anything has been saved", async () => {
    const storage = new InMemoryDocumentStorage<{ value: number }>();
    expect(await storage.load()).toBeNull();
  });

  it("persists and retrieves a saved value", async () => {
    const storage = new InMemoryDocumentStorage<{ value: number }>();
    await storage.save({ value: 42 });
    expect(await storage.load()).toEqual({ value: 42 });
  });

  it("overwrites the previous value on save", async () => {
    const storage = new InMemoryDocumentStorage<{ value: number }>();
    await storage.save({ value: 1 });
    await storage.save({ value: 2 });
    expect(await storage.load()).toEqual({ value: 2 });
  });

  it("returns null after clear", async () => {
    const storage = new InMemoryDocumentStorage<{ value: number }>();
    await storage.save({ value: 1 });
    await storage.clear();
    expect(await storage.load()).toBeNull();
  });
});
