import { describe, expect, it } from "vitest";
import {
  applyMigrations,
  type Migration,
  migratePlayerState,
} from "./migrate.js";
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyPlayerState,
  type PlayerState,
} from "./schema.js";

/** Simulates data coming out of storage as an untyped document. */
function asRawDocument(
  state: PlayerState,
): { schemaVersion: number } & Record<string, unknown> {
  return state as unknown as { schemaVersion: number } & Record<
    string,
    unknown
  >;
}

describe("applyMigrations", () => {
  it("leaves data already at the target version unchanged", () => {
    const raw = { schemaVersion: 3, value: "unchanged" };
    expect(applyMigrations(raw, [], 3)).toEqual(raw);
  });

  it("walks a document forward through several migration steps in order", () => {
    const addFoo: Migration = (state) => ({ ...state, foo: true });
    const addBar: Migration = (state) => ({ ...state, bar: true });
    const migrations: Migration[] = [addFoo, addBar];

    const raw = { schemaVersion: 1 };
    const result = applyMigrations(raw, migrations, 3);

    expect(result).toEqual({ schemaVersion: 3, foo: true, bar: true });
  });

  it("throws when the stored data is newer than the target version", () => {
    const raw = { schemaVersion: 5 };
    expect(() => applyMigrations(raw, [], 3)).toThrow(
      /newer than this app supports/,
    );
  });

  it("throws when a required migration step is missing from the registry", () => {
    const raw = { schemaVersion: 1 };
    expect(() => applyMigrations(raw, [], 3)).toThrow(
      /No migration registered from schema version 1/,
    );
  });
});

describe("migratePlayerState", () => {
  it("is a no-op for data already at the current schema version", () => {
    const state = createEmptyPlayerState();
    expect(migratePlayerState(asRawDocument(state))).toEqual(state);
  });

  it("rejects data from a newer, unsupported schema version", () => {
    const fromTheFuture = asRawDocument({
      ...createEmptyPlayerState(),
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    });
    expect(() => migratePlayerState(fromTheFuture)).toThrow(
      /newer than this app supports/,
    );
  });
});
