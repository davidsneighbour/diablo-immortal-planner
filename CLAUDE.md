# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

`PLAN.md` is the authoritative specification: read it in full before doing any work. This file summarizes the constraints that matter most when writing code; it does not replace `PLAN.md`.

Milestone 0 (project inception) is complete: Astro + React + Tailwind + strict TypeScript, Biome, markdownlint, Vitest, and release tooling are all wired up via the shared `@dnbhq/*` config packages.

Milestone 1 (domain model) is complete: framework-independent types live in `src/domain/` (one file per entity — `activity.ts`, `character.ts`, `event.ts`, `goal.ts`, `id.ts`, `progression.ts`, `requirement.ts`, `reset-rule.ts`, `resource.ts`, `reward.ts`, `scope.ts`, `server.ts`, `task.ts`, `task-instance.ts`, `dependency.ts`, `definition-set.ts`, `validation.ts`, `time-of-day.ts`), each with colocated `*.test.ts`. There is deliberately no barrel `index.ts` — the shared Biome config's `noBarrelFile` rule disallows `export * from`, so import from the specific submodule.

Milestone 2 (game clock and reset engine) is complete: `src/time/` provides `Clock`/`SystemClock`/`FixedClock` (`clock.ts`), timezone-aware wall-clock conversion via `Intl.DateTimeFormat` (`server-time.ts`), `getGameDay`/`getGameDayStart`/`getNextDailyReset` (`game-day.ts`), `getCurrentResetPeriod`/`getNextReset` for every `ResetSchedule` kind (`reset-period.ts`), event activity checks (`event.ts`), and schedule-only `isTaskAvailable`/`isTaskExpired` (`task-availability.ts`; full `Requirement` evaluation needs player state and is deferred to Milestone 3+). `'none'`/`'manual'` schedules have no periodic reset — `getCurrentResetPeriod` throws for them and `getNextReset` returns `null`. A `'rolling'` schedule's window has no anchor of its own; callers must supply `rollingAnchor` in `ResetPeriodContext`. Milestone 3 (task and progress engine) is next.

## Commands

* `npm run dev` — start the Astro dev server.
* `npm run build` — production build to `./dist/`.
* `npm run preview` — preview the production build.
* `npm run typecheck` — `astro check` (uses `@dnbhq/tsconfig/astro`).
* `npm run test` — run the Vitest suite once (`vitest run`).
* `npm run test:watch` — Vitest in watch mode. Use `npx vitest run path/to/file.test.ts` to run a single test file, or `npx vitest run -t "test name"` to filter by test name.
* `npm run check` / `npm run check:fix` — Biome lint + format check / auto-fix.
* `npm run lint:markdown` / `npm run lint:markdown:fix` — markdownlint-cli2 over `**/*.{md,mdx}`.
* `npm run release:dry` — dry-run `release-it` (see Git workflow below for the real release/commit flow).

## What this project is

A local-first, single-page web application for planning and tracking activities, tasks, rewards, character progression, and recurring resets in Diablo Immortal. It is a personal tool for exactly one player/account — not a multi-user product.

Stack: Astro (shell) + React (interactive islands) + TypeScript (strict) + Tailwind CSS + npm + ESM. Use latest stable releases only — no alpha/beta/RC/canary. No backend, no auth, no accounts, no remote database, no server-side persistence. Must work as a static site, browser-local persistence only (IndexedDB via a storage abstraction; localStorage only for tiny config).

## Non-negotiable architectural rules

* **Domain logic is framework-independent.** Game rules, reset calculations, task dependency resolution, and planner queries live in plain TypeScript modules, not in React components or hooks. React components stay presentational and must be testable-by-proxy — i.e., the logic behind them is testable without rendering React.
* **Storage is never touched directly by UI.** Enforce the layering `UI → application/domain services → repository/storage interface → IndexedDB implementation`. No component calls IndexedDB/localStorage directly.
* **Game definitions vs. player state are separate concerns**, never mixed in the same records or files. Game definitions (activities, tasks, events, loot, reset rules, reward tables, requirements, relationships) are static-ish content; player state (characters, completion, progress, inventory, goals, preferences, overrides) is the mutable local database.
* **Don't persist derived state.** Values like `isDueToday`, `timeUntilReset`, `isEventActive` must be computed from canonical timestamps/definitions at read time, not stored.
* **Server time, not local time, drives resets.** Diablo Immortal servers have their own timezone and reset time (initial config: `Asia/Bangkok`, daily reset `03:00`). Never compute resets from the user's local midnight, and never hand-roll reset math with raw millisecond arithmetic — use timezone-aware date/time calculations and centralized helpers (`getGameDay()`, `getCurrentResetPeriod()`, `getNextReset()`, `isTaskAvailable()`, `isTaskExpired()`, `isEventActive()`, etc.). The architecture must support other server timezones/reset times later even though only one exists initially.
* **Task definition ≠ task instance.** A task definition (e.g. "Bounties") is distinct from its occurrence in a specific reset period (e.g. "Bounties for game day 2026-08-08"). Resets must never destroy previous progress — they create a new period while retaining history.
* **Reset rules are data, not code**, and a single `resetAt` field is not sufficient — a task's availability, completion, reward cap, and claim deadline can each follow independent schedules.
* **Scope is a first-class concept.** Tasks/goals/progress are scoped to `account`, `server`, or `character` — never assume character-scoped completion applies to other characters unless the task is explicitly account-wide.
* **Requirements are an extensible rule system**, not a pile of booleans on the entity.
* **Rewards/resources are structured data**, never plain description strings.
* **Reward caps are independent of availability.** An activity can remain playable after its tracked rewards are exhausted — the planner must be able to express "available, rewards exhausted" distinctly from "available."
* **IDs are stable and independent of display names** (e.g. `activity:elder-rift`, `resource:telluric-pearl`). Renaming a label must never break history or references.
* **Do not hard-code assumptions** about cadence, scope, reward count, reset count, event duration, completion model, availability window, etc. — see the "Important development principle" section of `PLAN.md` for the full list. When an encountered game mechanic doesn't fit the current model, extend the general model (with tests + docs) rather than special-casing it — see `PLAN.md`'s "Unknown mechanics" procedure.
* **No enterprise/multi-user infrastructure.** No `User` entity, no auth/session/roles/permissions/multi-tenancy — the app implicitly belongs to one player. The domain hierarchy is `Planner → Diablo Immortal account → Server → Characters` (max 5 characters per server, enforced/validated).

## Testing expectations

Domain logic (especially reset/scheduling) needs automated tests with deterministic, mocked/fixed clocks — never depend on the real current time. Cover boundary conditions explicitly (e.g. `02:59:59` vs `03:00:00` around the 03:00 reset), multi-day-closed-app recovery, weekly boundaries, event start/end/overlap, non-resetting (permanent) tasks, reward-cap resets, timezone handling, progress preservation across resets, and dependency resolution.

## Data layout convention

Game content (definitions, not player data) belongs outside React components, under something like:

```text
src/data/game/{activities,events,loot,tasks,progression,servers}/
```

Prefer schemas/types that allow build-time validation of game data (unknown references, duplicate IDs, invalid dependency graphs, invalid scopes should fail at build/dev time, not produce silent runtime bugs).

## Known lint exceptions

`biome.json` disables `correctness/noUnusedVariables` for `**/*.astro` files: Biome only analyzes the Astro frontmatter script, not template interpolation, so a prop destructured in frontmatter and used only in the markup (e.g. `{title}`) is a false positive otherwise.

`markdownlint` flags "Diablo Immortal" and "CLAUDE.md" as sentence-case violations (proper nouns/filenames the shared `title-case-style` rule doesn't know about) and flags `PLAN.md`'s many `#`-level section headings as `MD025`. These are accepted content violations, not configuration errors — do not mass-rewrite `PLAN.md`'s heading structure to silence them; it is the user's authored spec.

## Git workflow

* Work stays on `main` — this is a single-developer personal project; do not create feature branches.
* Commit and push to `origin` as work completes, rather than leaving local-only commits.
* Every commit should reference the GitHub issue it addresses. If no issue exists yet for the work, create one first (using the repo's existing labels/milestones), then commit against it.
* When a commit finishes the work an issue describes, close it from the commit message (e.g. `Closes #12`) rather than closing it manually afterward.

## Milestones and roadmap

`PLAN.md` defines 21 sequential milestones (0–20: inception → domain model → reset engine → task/progress engine → persistence → backup/export → fixtures → app shell → character management → Now dashboard → events → rewards → goals → task consolidation → prioritisation → time-budget planning → real dataset → usability hardening → failure hardening → production candidate → production). Do not jump ahead to later-milestone features (e.g. prioritisation/recommendation algorithms) before earlier milestones' acceptance criteria are met — `PLAN.md` is explicit that premature optimization work is out of scope until the underlying planner has reliable data. Each milestone must satisfy its own acceptance criteria in `PLAN.md`, not just "the feature exists" — check the relevant milestone section before marking it done.

Use explicit status states for milestones (`planned`, `in progress`, `blocked`, `ready for review`, `complete`) — not completion percentages.
