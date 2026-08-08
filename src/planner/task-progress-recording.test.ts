import { describe, expect, it } from "vitest";
import { createId } from "../domain/id.js";
import type { CompletionModel } from "../domain/task.js";
import type { TaskInstance } from "../domain/task-instance.js";
import { createEmptyPlayerState } from "../persistence/schema.js";
import {
  recordProgress,
  upsertTaskInstance,
} from "./task-progress-recording.js";

const instant = new Date("2026-08-08T10:00:00Z");

function counterInstance(current: number): TaskInstance {
  return {
    id: createId("task-instance", "daily-bounties-lifetime"),
    taskId: createId("task", "daily-bounties"),
    scope: { type: "account" },
    periodKey: "2026-08-08",
    progress: { kind: "counter", current, target: 3 },
    createdAt: "2026-08-08T03:00:00Z",
  };
}

const counterModel: CompletionModel = { kind: "counter", target: 3 };

describe("recordProgress", () => {
  it("sets completedAt the moment progress becomes complete", () => {
    const instance = counterInstance(2);
    const updated = recordProgress(
      instance,
      { kind: "counter", current: 3, target: 3 },
      counterModel,
      instant,
    );
    expect(updated.completedAt).toBe(instant.toISOString());
  });

  it("leaves completedAt unset while progress is incomplete", () => {
    const instance = counterInstance(0);
    const updated = recordProgress(
      instance,
      { kind: "counter", current: 1, target: 3 },
      counterModel,
      instant,
    );
    expect(updated.completedAt).toBeUndefined();
  });

  it("clears a stale completedAt when progress moves back to incomplete", () => {
    const instance = {
      ...counterInstance(3),
      completedAt: "2026-08-08T09:00:00Z",
    };
    const updated = recordProgress(
      instance,
      { kind: "counter", current: 1, target: 3 },
      counterModel,
      instant,
    );
    expect(updated.completedAt).toBeUndefined();
  });

  it("does not mutate the original instance", () => {
    const instance = counterInstance(0);
    recordProgress(
      instance,
      { kind: "counter", current: 3, target: 3 },
      counterModel,
      instant,
    );
    expect(instance.progress).toEqual({
      kind: "counter",
      current: 0,
      target: 3,
    });
    expect(instance.completedAt).toBeUndefined();
  });
});

describe("upsertTaskInstance", () => {
  it("inserts a new instance not previously in state", () => {
    const instance = counterInstance(1);
    const state = upsertTaskInstance(createEmptyPlayerState(), instance);
    expect(state.taskInstances).toEqual([instance]);
  });

  it("replaces an existing instance with the same id", () => {
    const original = counterInstance(1);
    const state = upsertTaskInstance(createEmptyPlayerState(), original);
    const updated = {
      ...original,
      progress: { kind: "counter" as const, current: 2, target: 3 },
    };
    const nextState = upsertTaskInstance(state, updated);
    expect(nextState.taskInstances).toEqual([updated]);
  });

  it("leaves other instances untouched", () => {
    const other: TaskInstance = {
      ...counterInstance(0),
      id: createId("task-instance", "other"),
    };
    const state = upsertTaskInstance(createEmptyPlayerState(), other);
    const updated = upsertTaskInstance(state, counterInstance(2));
    expect(updated.taskInstances).toHaveLength(2);
    expect(updated.taskInstances.find((i) => i.id === other.id)).toEqual(other);
  });
});
