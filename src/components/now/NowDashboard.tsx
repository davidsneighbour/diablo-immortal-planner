import { useEffect, useState } from "react";
import { getAppGameDefinitions } from "../../app/game-definitions.js";
import type { TaskInstance } from "../../domain/task-instance.js";
import { usePlayerStateController } from "../../hooks/usePlayerStateController.js";
import {
  buildDashboard,
  type DashboardSection,
  type TaskEntry,
  type TaskGroup,
  type TaskGroupName,
} from "../../planner/now-dashboard.js";
import {
  recordProgress,
  upsertTaskInstance,
} from "../../planner/task-progress-recording.js";
import { TaskProgressControl } from "./TaskProgressControl.js";

const CLOCK_TICK_MS = 30_000;

const GROUP_LABELS: Record<TaskGroupName, string> = {
  "expiring-soon": "Expiring soon",
  daily: "Daily",
  weekly: "Weekly",
  events: "Events",
  permanent: "Permanent",
};

function formatCountdown(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return "any moment now";
  }
  const totalMinutes = Math.ceil(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

const gameDefinitions = getAppGameDefinitions();

export function NowDashboard() {
  const { controller, snapshot } = usePlayerStateController();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  if (snapshot.status === "loading") {
    return <p className="text-neutral-400">Loading…</p>;
  }

  if (snapshot.status === "invalid") {
    return (
      <div className="rounded-lg border border-red-900 bg-red-950/40 p-4">
        <h2 className="text-lg font-semibold text-red-300">
          Stored data could not be loaded
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-200">
          {snapshot.errors.map((error) => (
            <li key={`${error.code}:${error.path ?? error.message}`}>
              {error.message}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-4 rounded-md bg-red-900 px-3 py-1.5 text-sm font-medium text-red-100 hover:bg-red-800"
          onClick={() => void controller.reset()}
        >
          Reset local data
        </button>
      </div>
    );
  }

  const { state } = snapshot;
  const dashboard = buildDashboard(gameDefinitions, state, now);

  function handleProgressChange(
    entry: TaskEntry,
    next: TaskInstance["progress"],
  ): void {
    const updated = recordProgress(
      entry.instance,
      next,
      entry.task.completionModel,
      new Date(),
    );
    void controller.update((current) => upsertTaskInstance(current, updated));
  }

  if (state.servers.length === 0 || state.characters.length === 0) {
    return (
      <p className="text-neutral-400">
        Add a server and at least one character on the{" "}
        <a href="/characters" className="text-amber-300 underline">
          Characters
        </a>{" "}
        page to see your Now dashboard.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2">
        {dashboard.serverTimes.map((summary) => (
          <div
            key={summary.server.id}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
          >
            <h2 className="text-sm font-semibold text-neutral-100">
              {summary.server.name}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Game day {summary.gameDay} — resets in{" "}
              {formatCountdown(summary.nextReset, now)}
            </p>
          </div>
        ))}
      </section>

      {dashboard.activeEvents.length > 0 && (
        <section className="rounded-lg border border-purple-900/60 bg-purple-950/20 p-4">
          <h2 className="text-sm font-semibold text-purple-200">
            Active events
          </h2>
          <ul className="mt-1 space-y-1 text-sm text-purple-100">
            {dashboard.activeEvents.map((event) => (
              <li key={event.id}>{event.name}</li>
            ))}
          </ul>
        </section>
      )}

      {dashboard.sections.map((section) => (
        <DashboardSectionView
          key={`${section.scope.type}:${section.label}`}
          section={section}
          now={now}
          onProgressChange={handleProgressChange}
        />
      ))}
    </div>
  );
}

interface DashboardSectionViewProps {
  readonly section: DashboardSection;
  readonly now: Date;
  readonly onProgressChange: (
    entry: TaskEntry,
    next: TaskInstance["progress"],
  ) => void;
}

function DashboardSectionView({
  section,
  now,
  onProgressChange,
}: DashboardSectionViewProps) {
  const hasContent = section.groups.length > 0 || section.goals.length > 0;

  return (
    <section className="rounded-lg border border-neutral-800 p-4">
      <h2 className="text-lg font-semibold text-neutral-100">
        {section.label}
      </h2>

      {!hasContent && (
        <p className="mt-2 text-sm text-neutral-500">
          Nothing outstanding right now.
        </p>
      )}

      {section.groups.map((group) => (
        <TaskGroupView
          key={group.name}
          group={group}
          now={now}
          onProgressChange={onProgressChange}
        />
      ))}

      {section.goals.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Goals
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-neutral-300">
            {section.goals.map((goal) => (
              <li key={goal.id}>{goal.name}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

interface TaskGroupViewProps {
  readonly group: TaskGroup;
  readonly now: Date;
  readonly onProgressChange: (
    entry: TaskEntry,
    next: TaskInstance["progress"],
  ) => void;
}

function TaskGroupView({ group, now, onProgressChange }: TaskGroupViewProps) {
  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
        {GROUP_LABELS[group.name]}
      </h3>
      <ul className="mt-2 space-y-2">
        {group.entries.map((entry) => (
          <li
            key={entry.instance.id}
            className="flex flex-col gap-1 rounded-md border border-neutral-800 bg-neutral-900/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm text-neutral-200">{entry.task.name}</p>
              {entry.periodEndsAt && (
                <p className="text-xs text-neutral-500">
                  resets in {formatCountdown(entry.periodEndsAt, now)}
                </p>
              )}
            </div>
            <TaskProgressControl
              progress={entry.instance.progress}
              model={entry.task.completionModel}
              onChange={(next) => onProgressChange(entry, next)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
