import { describe, expect, it } from "vitest";
import type { CompletionModel } from "../domain/task.js";
import {
  advanceStageProgress,
  createInitialProgress,
  incrementCounterProgress,
  isProgressComplete,
  setAccumulatedProgress,
  setBooleanProgress,
  setManualState,
  setStageProgress,
  setThresholdProgress,
  toggleChecklistItem,
} from "./task-progress.js";

describe("createInitialProgress", () => {
  it("creates a zero-value progress record matching each completion model", () => {
    expect(createInitialProgress({ kind: "boolean" })).toEqual({
      kind: "boolean",
      complete: false,
    });
    expect(createInitialProgress({ kind: "counter", target: 3 })).toEqual({
      kind: "counter",
      current: 0,
      target: 3,
    });
    expect(createInitialProgress({ kind: "accumulated", target: 100 })).toEqual(
      {
        kind: "accumulated",
        current: 0,
        target: 100,
      },
    );
    expect(createInitialProgress({ kind: "threshold", target: 500 })).toEqual({
      kind: "threshold",
      current: 0,
      target: 500,
    });
    expect(
      createInitialProgress({ kind: "checklist", items: ["a", "b"] }),
    ).toEqual({
      kind: "checklist",
      completedItems: [],
    });
    expect(createInitialProgress({ kind: "staged", totalStages: 10 })).toEqual({
      kind: "staged",
      currentStage: 0,
      totalStages: 10,
    });
    expect(createInitialProgress({ kind: "manual" })).toEqual({
      kind: "manual",
      state: "",
    });
  });
});

describe("isProgressComplete", () => {
  it("boolean: complete flag drives completeness", () => {
    const model: CompletionModel = { kind: "boolean" };
    expect(isProgressComplete(setBooleanProgress(false), model)).toBe(false);
    expect(isProgressComplete(setBooleanProgress(true), model)).toBe(true);
  });

  it("counter/accumulated/threshold: complete once current reaches target", () => {
    const counterModel: CompletionModel = { kind: "counter", target: 3 };
    expect(
      isProgressComplete(
        { kind: "counter", current: 2, target: 3 },
        counterModel,
      ),
    ).toBe(false);
    expect(
      isProgressComplete(
        { kind: "counter", current: 3, target: 3 },
        counterModel,
      ),
    ).toBe(true);

    const accumulatedModel: CompletionModel = {
      kind: "accumulated",
      target: 100,
    };
    expect(
      isProgressComplete(
        { kind: "accumulated", current: 150, target: 100 },
        accumulatedModel,
      ),
    ).toBe(true);
  });

  it("staged: complete once currentStage reaches totalStages", () => {
    const model: CompletionModel = { kind: "staged", totalStages: 4 };
    expect(
      isProgressComplete(
        { kind: "staged", currentStage: 3, totalStages: 4 },
        model,
      ),
    ).toBe(false);
    expect(
      isProgressComplete(
        { kind: "staged", currentStage: 4, totalStages: 4 },
        model,
      ),
    ).toBe(true);
  });

  it("checklist: complete once every model item is in completedItems", () => {
    const model: CompletionModel = {
      kind: "checklist",
      items: ["a", "b", "c"],
    };
    expect(
      isProgressComplete(
        { kind: "checklist", completedItems: ["a", "b"] },
        model,
      ),
    ).toBe(false);
    expect(
      isProgressComplete(
        { kind: "checklist", completedItems: ["a", "b", "c"] },
        model,
      ),
    ).toBe(true);
  });

  it("manual: never automatically complete", () => {
    const model: CompletionModel = { kind: "manual" };
    expect(isProgressComplete(setManualState("done"), model)).toBe(false);
  });
});

describe("counter mutations", () => {
  it("increments and clamps to [0, target]", () => {
    const progress: Extract<
      ReturnType<typeof createInitialProgress>,
      { kind: "counter" }
    > = {
      kind: "counter",
      current: 0,
      target: 3,
    };
    const once = incrementCounterProgress(progress);
    expect(once.current).toBe(1);
    const overshoot = incrementCounterProgress({
      kind: "counter",
      current: 3,
      target: 3,
    });
    expect(overshoot.current).toBe(3);
    const undershoot = incrementCounterProgress(
      { kind: "counter", current: 0, target: 3 },
      -1,
    );
    expect(undershoot.current).toBe(0);
  });
});

describe("accumulated/threshold mutations", () => {
  it("allow exceeding target but not going below 0", () => {
    expect(
      setAccumulatedProgress(
        { kind: "accumulated", current: 0, target: 100 },
        150,
      ).current,
    ).toBe(150);
    expect(
      setAccumulatedProgress(
        { kind: "accumulated", current: 0, target: 100 },
        -10,
      ).current,
    ).toBe(0);
    expect(
      setThresholdProgress({ kind: "threshold", current: 0, target: 500 }, 550)
        .current,
    ).toBe(550);
  });
});

describe("staged mutations", () => {
  it("advances and clamps to [0, totalStages]", () => {
    const progress: Extract<
      ReturnType<typeof createInitialProgress>,
      { kind: "staged" }
    > = {
      kind: "staged",
      currentStage: 0,
      totalStages: 4,
    };
    expect(advanceStageProgress(progress).currentStage).toBe(1);
    expect(setStageProgress(progress, 10).currentStage).toBe(4);
    expect(setStageProgress(progress, -5).currentStage).toBe(0);
  });
});

describe("toggleChecklistItem", () => {
  it("adds an item not yet completed, and removes one already completed", () => {
    const empty: Extract<
      ReturnType<typeof createInitialProgress>,
      { kind: "checklist" }
    > = {
      kind: "checklist",
      completedItems: [],
    };
    const added = toggleChecklistItem(empty, "a");
    expect(added.completedItems).toEqual(["a"]);
    const removed = toggleChecklistItem(added, "a");
    expect(removed.completedItems).toEqual([]);
  });
});
