import type { Dependency } from "../../domain/dependency.js";
import { createId } from "../../domain/id.js";
import { storylineChapter1Task, storylineChapter2Task } from "./tasks.js";

/** Matches `storylineChapter2Task`'s `prerequisite-task` requirement. */
export const chapter1UnlocksChapter2: Dependency = {
  id: createId("dependency", "chapter-1-unlocks-chapter-2"),
  kind: "unlocks",
  fromTaskId: storylineChapter1Task.id,
  toTaskId: storylineChapter2Task.id,
};

export const fixtureDependencies: readonly Dependency[] = [
  chapter1UnlocksChapter2,
];
