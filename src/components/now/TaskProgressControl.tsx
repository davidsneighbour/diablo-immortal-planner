import type { CompletionModel } from "../../domain/task.js";
import type { TaskProgress } from "../../domain/task-instance.js";
import {
  advanceStageProgress,
  incrementCounterProgress,
  setAccumulatedProgress,
  setBooleanProgress,
  setManualState,
  setThresholdProgress,
  toggleChecklistItem,
} from "../../planner/task-progress.js";

export interface TaskProgressControlProps {
  readonly progress: TaskProgress;
  readonly model: CompletionModel;
  readonly onChange: (next: TaskProgress) => void;
}

const buttonClassName =
  "rounded-md border border-neutral-700 px-2 py-0.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40";

/** One low-friction control per `CompletionModel` kind — the interactive half of PLAN.md's Now dashboard requirement to record progress with minimal effort. */
export function TaskProgressControl({
  progress,
  model,
  onChange,
}: TaskProgressControlProps) {
  switch (progress.kind) {
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={progress.complete}
            onChange={(event) =>
              onChange(setBooleanProgress(event.target.checked))
            }
            className="h-4 w-4 rounded border-neutral-600 bg-neutral-800"
          />
          Done
        </label>
      );

    case "counter":
      return (
        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <span>
            {progress.current} / {progress.target}
          </span>
          {progress.current > 0 && (
            <button
              type="button"
              className={buttonClassName}
              onClick={() => onChange(incrementCounterProgress(progress, -1))}
            >
              −1
            </button>
          )}
          <button
            type="button"
            className={buttonClassName}
            disabled={progress.current >= progress.target}
            onClick={() => onChange(incrementCounterProgress(progress))}
          >
            +1
          </button>
        </div>
      );

    case "accumulated":
      return (
        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <span>
            {progress.current} / {progress.target}
          </span>
          <button
            type="button"
            className={buttonClassName}
            onClick={() =>
              onChange(setAccumulatedProgress(progress, progress.current + 1))
            }
          >
            +1
          </button>
        </div>
      );

    case "threshold":
      return (
        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <span>Current: {progress.current}</span>
          <input
            type="number"
            defaultValue={progress.current}
            className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-sm text-neutral-200"
            onBlur={(event) => {
              const value = Number(event.target.value);
              if (!Number.isNaN(value)) {
                onChange(setThresholdProgress(progress, value));
              }
            }}
          />
        </div>
      );

    case "checklist":
      if (model.kind !== "checklist") {
        return null;
      }
      return (
        <ul className="space-y-1 text-sm text-neutral-300">
          {model.items.map((item) => (
            <li key={item}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={progress.completedItems.includes(item)}
                  onChange={() => onChange(toggleChecklistItem(progress, item))}
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-800"
                />
                {item}
              </label>
            </li>
          ))}
        </ul>
      );

    case "staged":
      return (
        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <span>
            Stage {progress.currentStage} / {progress.totalStages}
          </span>
          <button
            type="button"
            className={buttonClassName}
            disabled={progress.currentStage >= progress.totalStages}
            onClick={() => onChange(advanceStageProgress(progress))}
          >
            Advance
          </button>
        </div>
      );

    case "manual":
      return (
        <input
          type="text"
          value={progress.state}
          placeholder="Notes…"
          onChange={(event) => onChange(setManualState(event.target.value))}
          className="w-full max-w-xs rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-200"
        />
      );
  }
}
