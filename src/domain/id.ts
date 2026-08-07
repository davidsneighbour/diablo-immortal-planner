declare const idBrand: unique symbol;

/**
 * A stable, machine-readable identifier of the form `${kind}:${slug}`
 * (e.g. `activity:elder-rift`, `resource:telluric-pearl`).
 *
 * Branded per `Kind` so an `Id<'activity'>` cannot be used where an
 * `Id<'resource'>` is expected, even though both are plain strings at
 * runtime. IDs are independent of display names: renaming a label must
 * never change or invalidate its ID.
 */
export type Id<Kind extends string> = `${Kind}:${string}` & {
  readonly [idBrand]: Kind;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Builds a stable ID from a kind and slug. The slug must be lowercase
 * kebab-case so IDs stay predictable and diff-friendly across the
 * game-definition dataset.
 */
export function createId<Kind extends string>(
  kind: Kind,
  slug: string,
): Id<Kind> {
  if (!slugPattern.test(slug)) {
    throw new Error(
      `Invalid slug "${slug}" for id kind "${kind}": expected lowercase kebab-case`,
    );
  }
  return `${kind}:${slug}` as Id<Kind>;
}

/** Returns the `kind` prefix of an ID (the part before the first colon). */
export function idKind(id: Id<string>): string {
  const separatorIndex = id.indexOf(":");
  return id.slice(0, separatorIndex);
}

/** Returns true if `id` was created with the given `kind`. */
export function isIdOfKind<Kind extends string>(
  id: Id<string>,
  kind: Kind,
): id is Id<Kind> {
  return idKind(id) === kind;
}

/**
 * Converts an arbitrary string into a lowercase kebab-case slug suitable
 * for `createId`, by lowercasing and collapsing every run of
 * non-alphanumeric characters into a single "-". Intended for composing
 * deterministic IDs from other IDs/keys (e.g. a `TaskInstance` id derived
 * from a task id, scope, and period key), not for turning display names
 * into IDs — see the "IDs" section of `PLAN.md`.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Entity ID aliases. Centralized here (rather than in each entity's own
// module) so that types needing IDs of multiple kinds — e.g. `Scope`
// referencing both `ServerId` and `CharacterId` — don't create import
// cycles between entity modules.
export type ServerId = Id<"server">;
export type CharacterId = Id<"character">;
export type ActivityId = Id<"activity">;
export type TaskId = Id<"task">;
export type TaskInstanceId = Id<"task-instance">;
export type EventId = Id<"event">;
export type EventPhaseId = Id<"event-phase">;
export type ResourceId = Id<"resource">;
export type RewardId = Id<"reward">;
export type RewardCapId = Id<"reward-cap">;
export type ResetRuleId = Id<"reset-rule">;
export type ProgressionSystemId = Id<"progression-system">;
export type GoalId = Id<"goal">;
export type DependencyId = Id<"dependency">;
