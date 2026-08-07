# Diablo Immortal planner

A local-first, single-page web application for planning and tracking activities, tasks, rewards, character progression, and recurring resets in Diablo Immortal. It is a personal tool for one player and one account — there is no backend, no authentication, and no server-side persistence.

See [PLAN.md](PLAN.md) for the full specification, domain model constraints, and milestone roadmap. See [CLAUDE.md](CLAUDE.md) for the condensed architectural rules used to guide implementation.

## Stack

Astro, React, TypeScript (strict), Tailwind CSS, npm.

## Commands

All commands run from the repository root.

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the local dev server |
| `npm run build` | Build the production site to `./dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run `astro check` |
| `npm run check` | Run Biome checks (lint + format) |
| `npm run check:fix` | Apply Biome auto-fixes |
| `npm run lint:markdown` | Lint Markdown files |
| `npm run test` | Run the test suite |

## Project state

This project is under active development, working through the milestone sequence defined in [PLAN.md](PLAN.md). Milestone status is tracked via GitHub milestones and issues.
