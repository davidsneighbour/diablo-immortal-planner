import type { Character } from "../domain/character.js";
import type { GameDefinitionSet } from "../domain/definition-set.js";
import type { Event } from "../domain/event.js";
import type { Goal } from "../domain/goal.js";
import type { ResetRuleId, ServerId, TaskId } from "../domain/id.js";
import type { ResetRule } from "../domain/reset-rule.js";
import {
  isAccountScope,
  isCharacterScope,
  isServerScope,
  type Scope,
} from "../domain/scope.js";
import type { Server } from "../domain/server.js";
import type { Task } from "../domain/task.js";
import type { TaskInstance } from "../domain/task-instance.js";
import type { PlayerState } from "../persistence/schema.js";
import { getActiveEvents } from "../time/event.js";
import { getGameDay, getNextDailyReset } from "../time/game-day.js";
import { getCurrentResetPeriod } from "../time/reset-period.js";
import {
  isTaskAvailable,
  type TaskAvailabilityContext,
} from "../time/task-availability.js";
import {
  areRequirementsSatisfied,
  type RequirementContext,
} from "./requirements.js";
import { resolveTaskInstances } from "./task-instances.js";
import { isProgressComplete } from "./task-progress.js";

export interface ServerTimeSummary {
  readonly server: Server;
  readonly gameDay: string;
  readonly nextReset: Date;
}

export interface TaskEntry {
  readonly task: Task;
  readonly instance: TaskInstance;
  /** When this task's current period ends, if it's on a bounded schedule; `null` for lifetime/manual tasks. */
  readonly periodEndsAt: Date | null;
}

/**
 * PLAN.md's example task groups. "expiring-soon" uses a fixed,
 * documented threshold (`EXPIRING_SOON_THRESHOLD_MS`) — a simple
 * grouping rule, not the scored prioritisation PLAN.md defers to
 * Milestone 14.
 */
export type TaskGroupName =
  | "expiring-soon"
  | "daily"
  | "weekly"
  | "events"
  | "permanent";

export interface TaskGroup {
  readonly name: TaskGroupName;
  readonly entries: readonly TaskEntry[];
}

export interface DashboardSection {
  readonly scope: Scope;
  readonly label: string;
  readonly groups: readonly TaskGroup[];
  readonly goals: readonly Goal[];
}

export interface DashboardData {
  readonly serverTimes: readonly ServerTimeSummary[];
  readonly activeEvents: readonly Event[];
  /** One "Account" section (always present), one per active character (always present), and server sections only when they have content — the direct implementation of PLAN.md's Account/Character A/Character B distinction. */
  readonly sections: readonly DashboardSection[];
}

export const EXPIRING_SOON_THRESHOLD_MS = 3 * 60 * 60 * 1000;

function resolveTaskPeriodEnd(
  task: Task,
  resetRules: ReadonlyMap<ResetRuleId, ResetRule>,
  servers: ReadonlyMap<ServerId, Server>,
  instant: Date,
): Date | null {
  const ruleId = task.completionResetRuleId ?? task.availabilityResetRuleId;
  if (!ruleId) {
    return null;
  }
  const rule = resetRules.get(ruleId);
  if (
    !rule ||
    rule.schedule.kind === "none" ||
    rule.schedule.kind === "manual"
  ) {
    return null;
  }
  const server = servers.get(rule.serverId);
  if (!server) {
    return null;
  }
  return getCurrentResetPeriod(rule, server, instant).endsAt;
}

function categorizeTask(
  task: Task,
  resetRules: ReadonlyMap<ResetRuleId, ResetRule>,
  periodEndsAt: Date | null,
  instant: Date,
): TaskGroupName {
  if (
    periodEndsAt &&
    periodEndsAt.getTime() - instant.getTime() <= EXPIRING_SOON_THRESHOLD_MS
  ) {
    return "expiring-soon";
  }
  if (task.eventId) {
    return "events";
  }
  const ruleId = task.completionResetRuleId ?? task.availabilityResetRuleId;
  if (!ruleId) {
    return "permanent";
  }
  const rule = resetRules.get(ruleId);
  if (!rule) {
    return "permanent";
  }
  switch (rule.schedule.kind) {
    case "every-game-day":
    case "every-n-game-days":
    case "weekdays":
    case "multiple-per-day":
      return "daily";
    case "weekly":
    case "monthly":
      return "weekly";
    case "fixed-period":
    case "event-specific":
      return "events";
    case "rolling":
    case "none":
    case "manual":
      return "permanent";
  }
}

const GROUP_ORDER: readonly TaskGroupName[] = [
  "expiring-soon",
  "daily",
  "weekly",
  "events",
  "permanent",
];

function buildGroups(
  entries: readonly TaskEntry[],
  resetRules: ReadonlyMap<ResetRuleId, ResetRule>,
  instant: Date,
): readonly TaskGroup[] {
  const byGroup = new Map<TaskGroupName, TaskEntry[]>();
  for (const entry of entries) {
    const name = categorizeTask(
      entry.task,
      resetRules,
      entry.periodEndsAt,
      instant,
    );
    const list = byGroup.get(name);
    if (list) {
      list.push(entry);
    } else {
      byGroup.set(name, [entry]);
    }
  }
  const groups: TaskGroup[] = [];
  for (const name of GROUP_ORDER) {
    const groupEntries = byGroup.get(name);
    if (groupEntries && groupEntries.length > 0) {
      groups.push({ name, entries: groupEntries });
    }
  }
  return groups;
}

function scopeKey(scope: Scope): string {
  if (scope.type === "account") {
    return "account";
  }
  if (scope.type === "server") {
    return `server:${scope.serverId}`;
  }
  return `character:${scope.characterId}`;
}

/** Only one server is ever unambiguously "the" server for account/server-scoped requirement evaluation; character scope always resolves to that character's own server. */
function resolveContextServer(
  scope: Scope,
  activeCharacters: readonly Character[],
  serversById: ReadonlyMap<ServerId, Server>,
): Server | undefined {
  if (scope.type === "character") {
    const character = activeCharacters.find(
      (candidate) => candidate.id === scope.characterId,
    );
    return character ? serversById.get(character.serverId) : undefined;
  }
  if (scope.type === "server") {
    return serversById.get(scope.serverId);
  }
  return serversById.size === 1 ? [...serversById.values()][0] : undefined;
}

/**
 * Derives everything the Now dashboard needs from game definitions,
 * player state, and the current instant: per-server time/reset info,
 * active events, and per-scope sections of outstanding (available,
 * not-yet-complete) tasks grouped by urgency/cadence, alongside that
 * scope's goals. Deterministic — re-run this after any gap (including
 * the app being closed across several resets) and it derives the
 * correct current state directly, per PLAN.md's "Reset behaviour"
 * section.
 */
export function buildDashboard(
  gameDefinitions: GameDefinitionSet,
  playerState: PlayerState,
  instant: Date,
): DashboardData {
  const activeServers = playerState.servers.filter((server) => server.active);
  const activeCharacters = playerState.characters.filter(
    (character) => character.status !== "archived",
  );

  const serversById = new Map(
    playerState.servers.map((server) => [server.id, server]),
  );
  const resetRulesById = new Map(
    gameDefinitions.resetRules.map((rule) => [rule.id, rule]),
  );
  const eventsById = new Map(
    gameDefinitions.events.map((event) => [event.id, event]),
  );
  const eventPhasesById = new Map(
    gameDefinitions.eventPhases.map((phase) => [phase.id, phase]),
  );
  const tasksById = new Map<TaskId, Task>(
    gameDefinitions.tasks.map((task) => [task.id, task]),
  );

  const serverTimes: ServerTimeSummary[] = activeServers.map((server) => ({
    server,
    gameDay: getGameDay(server, instant),
    nextReset: getNextDailyReset(server, instant),
  }));

  const activeEvents = getActiveEvents(gameDefinitions.events, instant);

  const availabilityContext: TaskAvailabilityContext = {
    instant,
    events: eventsById,
    eventPhases: eventPhasesById,
    resetRules: resetRulesById,
  };

  const entriesByScopeKey = new Map<string, TaskEntry[]>();
  function pushEntry(scope: Scope, entry: TaskEntry): void {
    const key = scopeKey(scope);
    const list = entriesByScopeKey.get(key);
    if (list) {
      list.push(entry);
    } else {
      entriesByScopeKey.set(key, [entry]);
    }
  }

  for (const task of gameDefinitions.tasks) {
    if (!isTaskAvailable(task, availabilityContext)) {
      continue;
    }
    const instances = resolveTaskInstances(task, {
      servers: activeServers,
      characters: activeCharacters,
      resetRules: resetRulesById,
      existingInstances: playerState.taskInstances,
      instant,
    });
    const periodEndsAt = resolveTaskPeriodEnd(
      task,
      resetRulesById,
      serversById,
      instant,
    );
    for (const instance of instances) {
      if (isProgressComplete(instance.progress, task.completionModel)) {
        continue;
      }
      const instanceScope = instance.scope;
      const character =
        instanceScope.type === "character"
          ? activeCharacters.find(
              (candidate) => candidate.id === instanceScope.characterId,
            )
          : undefined;
      const server = resolveContextServer(
        instanceScope,
        activeCharacters,
        serversById,
      );
      const requirementContext: RequirementContext = {
        instant,
        scope: instance.scope,
        events: eventsById,
        eventPhases: eventPhasesById,
        tasks: tasksById,
        taskInstances: playerState.taskInstances,
        progressionStates: playerState.progressionStates,
        ...(character ? { character } : {}),
        ...(server ? { server } : {}),
      };
      if (!areRequirementsSatisfied(task.requirements, requirementContext)) {
        continue;
      }
      pushEntry(instance.scope, { task, instance, periodEndsAt });
    }
  }

  const sections: DashboardSection[] = [];

  sections.push({
    scope: { type: "account" },
    label: "Account",
    groups: buildGroups(
      entriesByScopeKey.get("account") ?? [],
      resetRulesById,
      instant,
    ),
    goals: playerState.goals.filter((goal) => isAccountScope(goal.scope)),
  });

  for (const server of activeServers) {
    const entries = entriesByScopeKey.get(`server:${server.id}`) ?? [];
    const goals = playerState.goals.filter(
      (goal) => isServerScope(goal.scope) && goal.scope.serverId === server.id,
    );
    if (entries.length === 0 && goals.length === 0) {
      continue;
    }
    sections.push({
      scope: { type: "server", serverId: server.id },
      label: server.name,
      groups: buildGroups(entries, resetRulesById, instant),
      goals,
    });
  }

  for (const character of activeCharacters) {
    const entries = entriesByScopeKey.get(`character:${character.id}`) ?? [];
    const goals = playerState.goals.filter(
      (goal) =>
        isCharacterScope(goal.scope) && goal.scope.characterId === character.id,
    );
    sections.push({
      scope: { type: "character", characterId: character.id },
      label: character.name,
      groups: buildGroups(entries, resetRulesById, instant),
      goals,
    });
  }

  return { serverTimes, activeEvents, sections };
}
