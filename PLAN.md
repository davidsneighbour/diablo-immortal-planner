# Diablo Immortal planner

Build a local-first single-page web application for planning and tracking activities, tasks, rewards, character progression, and recurring resets in Diablo Immortal.

The application is intended for one player managing one Diablo Immortal account containing multiple characters.

This is not merely a checklist application. It should eventually become a rules-based planner capable of answering:

* What can I do right now?
* What should I still do today?
* What will reset next?
* What must I finish before a particular reset?
* Which activities give the best returns?
* Which activities contribute towards several goals simultaneously?
* Which rewards am I missing?
* Which character needs which activities?
* What upgrades am I currently working towards?
* What activities are available because a particular event is active?
* Which tasks have already reached their reward cap even though the activity itself remains playable?
* What should I prioritise if I only have a limited amount of time?

The application's data model must be designed so that new Diablo Immortal mechanics can be added later without restructuring the application.

## Important development principle

We do not yet have a complete catalogue of Diablo Immortal systems.

Do not hard-code assumptions such as:

* every recurring task being daily or weekly;
* every activity belonging to a character;
* every reward being received immediately;
* every activity having one reset;
* every event having the same duration;
* every task having a simple complete/incomplete state;
* every task being available continuously;
* every activity rewarding only one item;
* every activity having the same reward limits;
* every server having identical reset rules;
* every activity being repeatable;
* every progression system being character-specific.

Design the domain model first.

The UI should consume that model.

Game content should be represented as structured data rather than embedded throughout React components.

When a new game mechanic does not fit the current model cleanly, extend the domain model instead of adding special-case UI logic.

---

# Technology

Use:

* Astro
* React
* TypeScript
* Tailwind CSS
* npm
* strict TypeScript
* ESM

Use the latest stable releases available at implementation time.

Do not use alpha, beta, RC, Canary, or experimental framework releases merely because they have a higher version number.

Use Astro as the application shell and React for interactive application components.

Use Tailwind CSS according to the current recommended Astro/Tailwind integration.

Avoid unnecessary dependencies.

Prefer browser APIs and small focused libraries where appropriate.

Do not introduce:

* a backend;
* authentication;
* user accounts;
* a remote database;
* cloud synchronisation;
* server-side persistence.

The application must work as a static site.

---

# Persistence

All player data is browser-local.

Prefer IndexedDB as the durable application data store if the data model warrants it.

A small abstraction layer must sit between application logic and browser persistence so that storage could theoretically be replaced later.

Do not let React components access IndexedDB or localStorage directly.

Use a structure comparable to:

```text
UI
↓
application/domain services
↓
repository/storage interface
↓
IndexedDB implementation
```

Application configuration that is tiny and appropriate for localStorage may use it, but persistent game state should have a proper storage abstraction.

The application must support:

* automatic local persistence;
* export of all user data;
* import of previously exported data;
* schema versioning;
* migrations between application data versions;
* resetting local application data.

Export should use a human-inspectable structured format such as JSON.

A browser reinstall or cleared browser storage must therefore not permanently lock the user into that installation if they have exported their data.

---

# Time model

Time is a first-class domain concept.

Do not base resets on the user's local midnight.

Diablo Immortal operates on server time.

For the initial configuration:

```text
Server timezone: Asia/Bangkok
UTC offset: derive from timezone rather than hard-code
Daily reset: 03:00 server time
```

Internally use timezone-aware date/time calculations.

Do not calculate important reset logic by manually adding or subtracting milliseconds.

The architecture must support other server timezones and reset times later.

Create concepts such as:

```ts
type Server = {
  id: string;
  name: string;
  timezone: string;
  dailyResetTime: string;
};
```

Do not assume that all reset periods begin at midnight.

For example:

```text
02:59 Monday
```

belongs to the previous Diablo Immortal game day, while:

```text
03:00 Monday
```

begins Monday's game day.

Create explicit helpers/services for concepts such as:

```text
getGameDay()
getCurrentResetPeriod()
getNextReset()
isTaskAvailable()
isTaskExpired()
isEventActive()
```

Do not scatter time calculations throughout React components.

---

# Reset model

The planner must support arbitrary reset schedules.

Examples may eventually include:

* every game day;
* every N game days;
* particular weekdays;
* multiple times per day;
* weekly;
* monthly;
* seasonally;
* event-specific;
* fixed start/end periods;
* rolling periods;
* no reset;
* manually reset progression;
* reset at the start of another game system;
* limits that reset differently from task completion.

Model reset rules as data.

For example, a task might have:

```text
availability
completion
reward cap
claim deadline
```

that use different schedules.

Do not assume that one `resetAt` property is sufficient.

---

# Core domain concepts

Design explicit domain entities for at least the following concepts.

The exact names can change if a better domain model emerges.

## Account

Represents the player's Diablo Immortal account.

Account-wide progression and tasks must be distinguishable from character-specific progression.

## Server

Represents the Diablo Immortal server/container on which characters exist.

Store:

* name;
* timezone;
* reset configuration;
* relevant server-specific settings.

Characters belong to a server.

Do not assume the application will forever contain only one server even though the initial user has one account.

## Character

A character should initially support information such as:

* id;
* name;
* class;
* level;
* Paragon level or equivalent progression;
* server;
* active/inactive status;
* notes;
* tracked progression goals.

Avoid creating dozens of fixed character fields for every Diablo Immortal progression system.

Character progression should be extensible.

## Activity

An Activity represents something the player can do.

Examples might eventually include:

* dungeon;
* raid;
* bounty;
* Battleground;
* Elder Rift;
* Challenge Rift;
* event activity;
* quest;
* storyline activity;
* exploration activity.

Do not encode these examples as the complete list.

Activities should support taxonomy/categories.

An activity is not necessarily itself a task.

For example:

```text
Activity:
Run Elder Rift

Possible tasks:
Run one Elder Rift
Run three Elder Rifts
Complete Elder Rift for event X
Earn reward Y from Elder Rift
```

Several tasks can therefore reference the same activity.

## Task

A Task describes something that can be progressed or completed.

Possible scopes:

* account;
* server;
* character;
* event;
* progression system.

Possible completion models should eventually include:

* boolean;
* count;
* accumulated quantity;
* threshold;
* checklist;
* ranked/multi-stage;
* manually recorded state.

Examples:

```text
0 / 3 completed
12 / 20 collected
Stage 4 / 10
Complete / incomplete
```

A task may be repeatable.

A task may have prerequisites.

A task may become available only after another task or progression state.

A task may contribute towards other tasks.

## Task instance

Separate the definition of a task from its occurrence within a particular reset period.

For example:

```text
Bounties
```

is a task definition.

But:

```text
Bounties for game day 2026-08-08
```

is an instance/progress period.

This distinction is important for history and resets.

Do not destroy previous progress when a reset occurs.

Create a new logical period while retaining historical records.

## Event

Events must support arbitrary start and end datetimes.

An event may:

* last part of a day;
* last several days;
* last several weeks;
* contain its own daily tasks;
* contain cumulative event tasks;
* contain milestone rewards;
* contain tasks that reset independently;
* overlap other events;
* depend on server time;
* contain stages/phases;
* unlock tasks over time.

An Event should therefore not simply be a category attached to tasks.

It is a first-class domain object.

## Event phase

Support events whose available activities or rewards change during their lifetime.

Example:

```text
Event
├── Phase 1
├── Phase 2
└── Final phase
```

Do not require events to have phases.

## Progression system

Create an extensible concept for persistent character/account progression.

Examples might eventually include:

* character level;
* gear upgrades;
* legendary gems;
* normal gems;
* Helliquary;
* Paragon;
* equipment;
* familiars;
* other upgrade systems.

These examples are illustrative rather than exhaustive.

A progression system should support current state and targets.

## Goal

Allow the player to define goals.

Examples:

```text
Upgrade item X to rank Y
Reach level X
Obtain item Y
Accumulate 500 units of currency X
Complete storyline chapter X
```

Goals should eventually be usable by the recommendation/prioritisation engine.

## Reward

Rewards must be structured data.

Do not simply store reward descriptions as strings.

A reward should be able to reference one or more loot/resource definitions and quantities.

Support:

* fixed rewards;
* optional rewards;
* ranges;
* unknown quantities;
* reward containers;
* milestone rewards.

## Loot/resource

Create a generic item/resource taxonomy.

Possible categories may include:

* currencies;
* crafting materials;
* equipment;
* gems;
* legendary gems;
* crests;
* keys;
* tokens;
* event currencies;
* experience;
* Battle Pass points;
* upgrade materials.

Do not treat this list as exhaustive.

Resources may be:

* inventory items;
* abstract progression values;
* capped currencies;
* temporary event currencies;
* character-specific;
* account-wide.

## Reward cap

Model reward limits independently from task availability.

An activity may remain playable after its meaningful rewards have been exhausted.

Examples may include:

```text
first N runs
N rewards per day
N rewards per week
one reward per event
soft cap
hard cap
```

The planner eventually needs to know:

```text
You can still do this activity.
```

versus:

```text
You can still do this activity, but its tracked rewards are exhausted.
```

## Requirement

Activities and tasks should support requirements such as:

* character level;
* progression level;
* completed prerequisite;
* active event;
* event phase;
* day/time window;
* server;
* character;
* item ownership;
* manually configured condition.

Design this as an extensible rule system rather than dozens of booleans.

---

# Relationships between systems

Many Diablo Immortal activities contribute towards multiple systems.

This is central to the planner.

For example, doing one activity might simultaneously:

* progress a daily task;
* progress a weekly task;
* progress an event;
* award Battle Pass points;
* provide upgrade materials;
* fulfil a character goal.

Represent these relationships explicitly.

Avoid duplicating the same activity as several independent checklist items unless the game actually requires separate actions.

The planner should eventually be able to reason:

```text
Activity A advances 4 currently active goals.
Activity B advances only 1.
```

This information will later feed prioritisation.

---

# Dependencies

Tasks may form dependency graphs.

Support relationships such as:

```text
requires
unlocks
progresses
blocks
supersedes
```

Avoid circular dependencies.

Provide validation for invalid dependency graphs.

A storyline is therefore potentially a graph or ordered sequence of tasks rather than a special hard-coded module.

---

# Lifetime tasks

Some tasks never reset.

Examples include:

* storyline;
* exploration;
* permanent achievements;
* character progression;
* one-time unlocks.

These use the same general task/progression architecture where possible.

Do not treat permanent tasks as recurring tasks with an absurdly long reset duration.

---

# Completion history

Retain useful history.

At minimum, the model should be capable of recording:

* what was completed;
* for which character/account;
* when;
* within which reset period;
* progress achieved;
* rewards claimed where relevant.

Do not make historical analytics the focus of the first UI, but ensure that today's storage model does not make future historical analysis impossible.

---

# Planner

The planner is the central application service.

It should derive actionable information from:

```text
game definitions
+
server time
+
active events
+
characters
+
recorded progress
+
goals
```

It should return derived views rather than requiring UI components to perform game-rule calculations.

Examples:

```ts
getAvailableTasks()
getIncompleteTasks()
getTasksExpiringSoon()
getCharacterTasks(characterId)
getActiveEvents()
getUpcomingResets()
getAvailableRewards()
getUnclaimedRewards()
```

Later it should support optimisation queries such as:

```ts
getRecommendedActivities()
```

Do not prematurely implement a complicated optimisation algorithm.

Build the data structures needed to support one.

---

# Prioritisation and return optimisation

The long-term purpose of the planner is not merely completion tracking.

It should help maximise useful returns.

Prepare for activities to be scored against factors such as:

* rewards;
* reward scarcity;
* relevance to player goals;
* time until reset;
* time until event expiry;
* estimated completion time;
* number of simultaneous tasks progressed;
* character priority;
* whether rewards are capped;
* user-defined priority;
* opportunity cost.

Do not invent arbitrary hidden scoring.

When optimisation is eventually implemented, scoring factors and weights should be inspectable and configurable.

For now, establish the architecture required for this.

---

# Estimated effort

Activities should optionally support an estimated duration.

For example:

```text
5 minutes
15 minutes
30 minutes
unknown
```

This will eventually allow the application to answer questions such as:

```text
I have 30 minutes. What should I do?
```

Do not require every activity to have an estimate.

---

# Game definitions versus player data

Maintain a strong distinction between:

## Game definitions

Facts about Diablo Immortal:

```text
activity definitions
task definitions
event definitions
loot definitions
reset rules
reward tables
requirements
relationships
```

and:

## Player state

Facts about this player:

```text
characters
completion
progress
inventory/tracked resources
goals
preferences
manual overrides
```

Do not mix these concerns.

---

# Source/confidence metadata

We will build the Diablo Immortal dataset incrementally, and game rules can change.

Game-definition records should therefore be capable of carrying metadata such as:

```ts
source?: string;
verifiedAt?: string;
confidence?: 'confirmed' | 'likely' | 'unknown';
gameVersion?: string;
notes?: string;
```

Do not require every entry to have this information, but support it.

This will help us audit outdated game data later.

---

# Game content files

Keep game definitions outside React components.

Create a sensible data structure such as:

```text
src/
  data/
    game/
      activities/
      events/
      loot/
      tasks/
      progression/
      servers/
```

or an equivalent architecture.

Choose JSON, TypeScript, or another structured format based on maintainability and validation requirements.

Prefer schemas/types that allow build-time validation of game data.

Invalid relationships, unknown IDs, and structurally invalid game definitions should fail validation during development/build rather than producing mysterious runtime behaviour.

---

# IDs

Every durable domain object must have a stable machine-readable ID independent of its display name.

For example:

```text
activity:elder-rift
resource:telluric-pearl
event:some-event
```

Renaming a display label must not destroy player history or references.

Create and document an ID convention.

---

# Data editing

Initially, game definitions may be maintained directly in repository files.

However, prepare for a future internal editor that can manage:

* events;
* activities;
* tasks;
* rewards;
* reset rules;
* dependencies;
* progression systems.

Do not build a full content-management system in the first iteration.

---

# Manual overrides

The real game and our data will occasionally disagree.

Allow the architecture to accommodate manual overrides.

For example:

```text
mark complete
mark unavailable
adjust progress
change next reset
ignore this task
```

Do not let manual state modifications silently corrupt game definitions.

Player overrides belong to player state.

---

# Initial application views

Create an initial SPA interface containing the following views.

## Now / today

This should become the main dashboard.

Show:

* current server date/time;
* current game day;
* time until daily reset;
* active events;
* incomplete tasks;
* tasks approaching expiry;
* relevant character;
* progress towards current tracked goals.

Tasks should be grouped meaningfully rather than displayed as one enormous checklist.

Possible groups:

```text
Must do before reset
Daily
Weekly
Events
Character progression
Permanent
```

Only use groups that actually contain relevant items.

## Characters

Show configured characters.

Each character can display:

* basic information;
* active goals;
* outstanding character-specific tasks;
* progression summaries.

## Events

Show:

* active;
* upcoming;
* completed/expired where useful.

Each event view should make its own reset cadence and remaining tasks understandable.

## Activities

Provide a browsable representation of known game activities and the tasks/rewards attached to them.

This will be particularly useful while building the game database.

## Goals / upgrades

Show tracked progression goals and their current progress.

## Data / settings

Provide:

* server configuration;
* daily reset configuration;
* data export;
* data import;
* reset local data;
* application/database schema information where useful.

---

# Checklist interaction

Task interaction needs to support more than checkboxes.

Provide appropriate controls for different progress models.

Examples:

```text
[✓] completed

[-] 2 / 3 [+]

12 / 100

Stage 4 of 10
```

Interactions must be fast because the application may be updated while playing.

Optimise for very low-friction updates.

---

# Reset behaviour

Reset handling must be deterministic.

Do not rely solely on a timer firing while the application is open.

When the application starts or regains focus:

1. determine the current server datetime;
2. determine the current game/reset periods;
3. compare them with persisted state;
4. derive the correct active task instances;
5. retain previous historical records;
6. present the new period.

This means the application must recover correctly if it has not been opened for several days.

---

# Event expiry

Never delete progress merely because an event expires.

Expired event state should remain available for history/debugging unless deliberately purged.

The actionable planner should simply stop presenting expired tasks as available.

---

# Application state

Keep canonical persisted state separate from derived state.

Do not persist things that can reliably be calculated.

For example, avoid persisting:

```text
isDueToday
timeUntilReset
isEventActive
```

when they can be derived from canonical timestamps and definitions.

This prevents stale state.

---

# React architecture

Keep React components primarily presentational.

Avoid components that simultaneously:

* query storage;
* calculate reset rules;
* modify game definitions;
* calculate task dependencies;
* render UI.

Extract domain logic into framework-independent TypeScript modules wherever practical.

Important game logic should be testable without rendering React.

---

# Testing

Add automated tests for the domain logic.

Reset and scheduling tests are especially important.

Include boundary conditions such as:

```text
02:59:59
03:00:00
```

for the configured 03:00 reset.

Test:

* crossing daily reset;
* application closed across multiple resets;
* weekly boundaries;
* event start;
* event end;
* overlapping events;
* non-resetting tasks;
* reward-cap resets;
* timezone handling;
* progress preservation;
* dependency resolution.

Use deterministic mocked/fixed times in tests.

Never make tests depend on the actual current clock.

---

# Visual direction

This is a utility application intended to remain open while playing Diablo Immortal.

Prioritise information density, clarity, and rapid interaction.

Use a dark interface by default.

Take broad visual inspiration from Diablo's dark fantasy interface without copying Blizzard artwork, proprietary icons, textures, logos, or other copyrighted assets.

Use:

* dark neutral backgrounds;
* restrained warm/gold accents;
* strong hierarchy;
* compact cards;
* readable typography;
* clear progress indicators;
* clearly differentiated urgency;
* responsive layouts.

Do not turn the application into a visual imitation of Diablo Immortal.

Functionality and legibility take precedence over decoration.

Design mobile-first but make effective use of desktop space.

---

# Accessibility

Use semantic HTML.

Ensure:

* keyboard navigation;
* visible focus states;
* sufficient contrast;
* labelled controls;
* accessible progress indicators;
* buttons rather than clickable generic elements;
* reduced-motion support where applicable.

Colour alone must never communicate task state.

---

# Performance

The planner should feel instantaneous.

Avoid excessive React hydration.

Astro should remain responsible for the application shell where appropriate.

Hydrate React only where interactivity requires it.

However, do not sacrifice a coherent SPA experience merely to minimise JavaScript artificially.

---

# First development phase

Do not attempt to populate all Diablo Immortal content.

The first milestone is the **planner engine and domain model**.

Implement enough sample data to demonstrate that the architecture works.

Create deliberately varied fixtures demonstrating:

1. one daily task;
2. one weekly task;
3. one permanent task;
4. one character-specific task;
5. one account-wide task;
6. one event spanning several days;
7. an event containing daily-reset tasks;
8. an event containing a cumulative task;
9. one activity that progresses several tasks simultaneously;
10. one task with a numeric progress target;
11. one activity with a reward cap;
12. one progression goal;
13. one dependency between tasks.

Clearly mark this data as fixtures/demo data rather than claiming it accurately represents current Diablo Immortal rules.

---

# Initial implementation sequence

Work in this order.

## Phase 1 - domain design

Define:

* terminology;
* entity relationships;
* IDs;
* TypeScript types;
* reset model;
* task progress model;
* reward model;
* requirements;
* dependencies;
* game-definition/player-state separation.

Document architectural decisions.

## Phase 2 - time and planner engine

Implement:

* server time;
* game-day calculation;
* reset periods;
* task availability;
* event activity;
* task instances;
* planner queries.

Add comprehensive tests.

## Phase 3 - persistence

Implement:

* browser persistence;
* schema versions;
* import/export;
* migration architecture.

## Phase 4 - fixture dataset

Create representative synthetic/demo game definitions covering the cases listed above.

## Phase 5 - SPA interface

Build:

* Today/Now;
* Characters;
* Events;
* Activities;
* Goals;
* Settings/Data.

## Phase 6 - refinement

Add:

* filtering;
* sorting;
* urgency;
* reset countdowns;
* responsive behaviour;
* accessibility improvements.

Do not proceed to optimisation/recommendation algorithms until the underlying planner has reliable data.

---

# Documentation

Create project documentation explaining:

## Terminology

Define:

* activity;
* task;
* task definition;
* task instance;
* reset period;
* reward;
* reward cap;
* event;
* progression;
* goal;
* requirement.

## Architecture

Explain:

```text
game definition
        ↓
planner/rules engine
        ↑
player state
        ↓
derived planner state
        ↓
UI
```

## Adding content

Document how to add:

* a new activity;
* a new recurring task;
* a new event;
* a reward;
* a resource;
* a character progression system;
* a reset schedule;
* a dependency.

This documentation is particularly important because we will spend considerable time progressively adding Diablo Immortal mechanics after the application skeleton exists.

---

# Unknown mechanics

Whenever you encounter a game mechanic that the current model cannot accurately represent:

**do not guess.**

Instead:

1. identify the missing concept;
2. explain why the existing model cannot express it;
3. propose the smallest general-purpose extension;
4. add tests for the new behaviour;
5. update the documentation;
6. then represent the game mechanic.

Avoid Diablo-specific special cases where a reusable domain concept would solve the problem.

---

# Definition of done for the first milestone

The first milestone is complete when I can:

1. open the static SPA;
2. configure a Diablo Immortal server using Asia/Bangkok and a 03:00 reset;
3. create/select characters;
4. see tasks that are currently actionable;
5. update boolean and numeric task progress;
6. reload the browser without losing progress;
7. cross a simulated reset boundary and see a new task period;
8. retain historical completion from the old period;
9. see an active multi-day event containing both daily and cumulative tasks;
10. see one activity contribute towards multiple tasks;
11. track a basic character upgrade goal;
12. export all player data;
13. erase the application;
14. import that export and restore the player state;
15. add additional game definitions without modifying React components.

Do not spend the first iteration cataloguing Diablo Immortal.

Build the engine that will allow us to catalogue Diablo Immortal correctly.

# Personal-tool constraint

This application is a personal tool for exactly one human player.

There is no concept of application users.

Do not implement or prepare unnecessary infrastructure for:

* login;
* authentication;
* registration;
* sessions;
* permissions;
* roles;
* account ownership;
* multi-tenancy;
* shared data;
* collaborative editing;
* public profiles.

The player opening the application is implicitly the owner of all locally stored data.

Do not create a generic `User` entity merely because typical web applications have one.

The relevant Diablo Immortal hierarchy is:

```text
Planner
└── Diablo Immortal account
    └── Server
        └── Characters
```

The planner manages one Diablo Immortal player account.

The account may contain characters on one or more Diablo Immortal servers.

Each server can contain up to five characters.

The application should enforce or validate that limit where appropriate.

The application does not need to optimise for multiple human users, concurrent editing, or synchronisation.

---

# Account, servers, and characters

## Account

There is one Diablo Immortal account represented by the application.

Because the application itself is single-user, do not confuse:

```text
application user
```

with:

```text
Diablo Immortal account
```

There is no application-user model.

The Diablo Immortal account exists solely as the top-level scope for game state.

Account-wide tasks, rewards, currencies, progression, and goals belong here.

## Server

A Diablo Immortal account may contain characters on multiple servers.

A server should initially support:

* stable ID;
* display name;
* timezone;
* reset configuration;
* active/inactive state;
* notes where useful.

Characters belong to exactly one server.

Server configuration determines game-time calculations for characters and activities associated with that server.

Do not assume that all configured servers necessarily use the same timezone or reset configuration, even if the initial setup contains only one.

## Character

A server can contain up to five characters.

A character should support:

* stable ID;
* name;
* class;
* level;
* Paragon level or equivalent;
* server ID;
* active/inactive/archive state;
* notes;
* tracked progression;
* tracked goals.

Completion state must be scoped correctly.

For example:

```text
Account-wide task
└── one completion state

Character-specific task
├── Character A: complete
├── Character B: incomplete
└── Character C: 2 / 3
```

Never treat completion on one character as completion for another unless the underlying game mechanic is explicitly account-wide.

Similarly, goals can differ independently:

```text
Character A
└── Upgrade legendary gem X

Character B
└── Reach progression level Y

Character C
└── Finish storyline chapter Z
```

Activities may be available to several characters while their task instances, rewards, caps, or progression differ.

This character-scoping distinction must be represented in the domain model rather than implemented through UI filtering hacks.

---

# Project milestones

Develop this application through explicit milestones.

Each milestone should leave the repository in a coherent, tested, usable state.

A milestone is not complete merely because the primary feature exists.

Each milestone must also satisfy its acceptance criteria, tests, documentation requirements, and relevant quality gates.

Do not implement later milestones prematurely unless doing so is necessary to avoid a poor architectural decision.

Maintain a project roadmap that records:

* milestone;
* objective;
* status;
* prerequisites;
* acceptance criteria;
* deferred work;
* architectural decisions arising from the milestone.

Use the milestones below as the initial project lifecycle.

---

## Milestone 0 - project inception

### Objective

Establish the project, terminology, constraints, and architectural direction before building application features.

### Deliverables

Create:

* Astro project;
* React integration;
* Tailwind CSS integration;
* strict TypeScript configuration;
* development scripts;
* test infrastructure;
* formatting/linting configuration;
* basic project documentation.

Document the fundamental constraints:

```text
one human user
one Diablo Immortal account
zero authentication
browser-local persistence
multiple servers possible
maximum five characters per server
server-based game time
03:00 Asia/Bangkok initial daily reset
```

Define the initial terminology:

* account;
* server;
* character;
* activity;
* task;
* task definition;
* task instance;
* event;
* event phase;
* reward;
* resource;
* progression;
* goal;
* requirement;
* reset period.

### Acceptance criteria

* application starts locally;
* production build succeeds;
* tests run;
* React works inside Astro;
* Tailwind works;
* TypeScript is strict;
* architectural constraints are documented;
* no authentication or backend dependencies exist.

---

## Milestone 1 - domain model

### Objective

Create a framework-independent representation of Diablo Immortal planning concepts.

### Deliverables

Define domain models for:

* Diablo Immortal account;
* server;
* character;
* activity;
* task;
* task instance;
* event;
* event phase;
* reward;
* reward cap;
* resource;
* requirement;
* progression system;
* goal;
* reset rule;
* dependency.

Implement explicit task scope:

```ts
type Scope =
  | { type: 'account' }
  | { type: 'server'; serverId: string }
  | { type: 'character'; characterId: string };
```

The exact representation may differ, but scope must be a first-class concept.

Implement stable ID conventions.

Implement validation for:

* unknown references;
* duplicate IDs;
* invalid dependency relationships;
* more than five characters on a server;
* invalid reset configurations;
* invalid scopes.

### Acceptance criteria

The domain can represent:

* one account-wide task;
* the same recurring task independently for several characters;
* different goals for different characters;
* several characters on one server;
* characters on different servers;
* permanent and recurring tasks;
* events and event-specific tasks;
* shared activities progressing several tasks.

No React component should be necessary to test these rules.

---

## Milestone 2 - game clock and reset engine

### Objective

Make time and resets deterministic.

### Deliverables

Implement framework-independent services for:

```text
server datetime
game day
reset periods
next reset
event start/end
task availability
task expiry
reward-cap periods
```

The initial server configuration must support:

```text
Timezone: Asia/Bangkok
Daily reset: 03:00
```

Test boundaries including:

```text
02:59:59
03:00:00
```

Support simulated/fixed clocks for testing.

### Acceptance criteria

Given any datetime, the engine can determine:

* current game day;
* relevant reset period;
* next reset;
* active events;
* currently available task instances.

Closing the application for several days must not create an architectural problem: reopening can derive the correct current periods without having executed intermediate timers.

---

## Milestone 3 - task and progress engine

### Objective

Represent actual player progress independently for account-wide and character-specific systems.

### Deliverables

Support progress types including:

* boolean;
* counter;
* accumulated quantity;
* staged progression.

Support:

* prerequisites;
* dependencies;
* repeatability;
* account scope;
* server scope;
* character scope;
* progress history.

Implement task-instance generation from task definitions and reset periods.

### Acceptance criteria

Demonstrate:

```text
Task A
Account-wide
Complete

Task B
Character A
3 / 3

Task B
Character B
1 / 3

Task B
Character C
0 / 3
```

A reset must create or derive a new task period without destroying the previous period's record.

---

## Milestone 4 - persistence

### Objective

Persist the planner completely in the browser.

### Deliverables

Implement:

* storage abstraction;
* IndexedDB persistence;
* schema version;
* migration mechanism;
* automatic persistence;
* data validation on load.

Keep storage access outside React components.

### Acceptance criteria

The user can:

1. add servers;
2. add characters;
3. record progress;
4. reload the browser;
5. retain all state.

Invalid or outdated stored data must produce a recoverable error rather than silently corrupting the planner.

---

## Milestone 5 - backup and recovery

### Objective

Ensure a personal browser-local application does not become disposable because browser storage was lost.

### Deliverables

Implement:

* complete JSON export;
* JSON import;
* export schema/version metadata;
* import validation;
* migration of older supported export versions;
* destructive-reset workflow.

Exports should contain all information necessary to restore the player's local state.

Game definitions may be excluded from player exports if they are bundled with the application and versioned separately.

### Acceptance criteria

The user can:

1. export the planner;
2. delete all local data;
3. reload the application;
4. import the export;
5. recover the previous state.

---

## Milestone 6 - game-definition fixture dataset

### Objective

Prove that the architecture handles realistic combinations before collecting real Diablo Immortal data.

### Deliverables

Create synthetic fixtures covering:

* daily account task;
* daily character task;
* weekly task;
* permanent task;
* multi-day event;
* daily event task;
* cumulative event task;
* event phase;
* numeric progress;
* reward cap;
* task dependency;
* one activity progressing multiple tasks;
* independent states for multiple characters;
* independent character goals.

Clearly label these records as synthetic fixtures.

### Acceptance criteria

All important domain relationships can be exercised without hard-coded React behaviour.

---

## Milestone 7 - application shell and navigation

### Objective

Create the usable SPA structure.

### Deliverables

Implement primary views:

```text
Now
Characters
Events
Activities
Goals
Data / settings
```

Create responsive navigation suitable for desktop and mobile.

Implement the dark utility-oriented visual system.

### Acceptance criteria

The application behaves as a coherent single-page tool.

Navigation must not lose application state or cause unnecessary full-page reloads.

---

## Milestone 8 - character management

### Objective

Make the planner genuinely usable for the player's Diablo Immortal characters.

### Deliverables

Implement:

* server management;
* character creation;
* character editing;
* character archiving;
* server assignment;
* maximum-five-characters validation;
* character selection;
* independent progression summaries;
* independent goals;
* independent task state.

Provide a useful character switcher where appropriate.

### Acceptance criteria

The application can contain, for example:

```text
Server A
├── Character 1
├── Character 2
├── Character 3
├── Character 4
└── Character 5

Server B
├── Character 6
└── Character 7
```

No server may have more than five active/configured character slots unless later game rules establish otherwise.

---

## Milestone 9 - now dashboard

### Objective

Answer the core question:

```text
What should I still do?
```

### Deliverables

Show:

* current server time;
* current game day;
* countdown to relevant reset;
* active character;
* account-wide outstanding tasks;
* character-specific outstanding tasks;
* active event tasks;
* expiring tasks;
* tracked goals.

Allow rapid progress updates directly from the dashboard.

### Acceptance criteria

The dashboard distinguishes clearly between:

```text
Account
Character A
Character B
```

and never implies that a task completed by one character is complete for another unless the task definition says so.

---

## Milestone 10 - events

### Objective

Represent Diablo Immortal events without special-case code.

### Deliverables

Implement UI for:

* active events;
* upcoming events;
* expired events;
* event phases;
* event-specific recurring tasks;
* cumulative event progress;
* event rewards;
* event expiry.

### Acceptance criteria

One event can contain simultaneously:

```text
daily tasks
+
whole-event cumulative tasks
+
milestone rewards
```

without duplicating event logic in UI components.

---

## Milestone 11 - rewards and loot model

### Objective

Connect activities to useful returns.

### Deliverables

Implement structured representations of:

* resources;
* currencies;
* materials;
* item rewards;
* progression rewards;
* reward caps;
* claimed/unclaimed rewards.

Allow activities and tasks to expose what they currently contribute towards.

### Acceptance criteria

The planner can distinguish:

```text
Activity available and rewards available
```

from:

```text
Activity available but tracked rewards exhausted
```

---

## Milestone 12 - goals and upgrade tracking

### Objective

Track why activities matter to each character.

### Deliverables

Implement:

* account goals;
* character goals;
* target values;
* current progress;
* relevant resources;
* related activities;
* completion history.

### Acceptance criteria

Different characters can pursue completely independent goals.

The application can connect a relevant reward/activity to a currently tracked goal.

---

## Milestone 13 - task consolidation

### Objective

Avoid presenting the player with redundant checklists.

### Deliverables

Derive relationships between active tasks and activities.

For example:

```text
Run Elder Rift
├── Daily task: +1
├── Event task: +1
├── Weekly task: +1
└── Character goal: relevant reward
```

The planner should show that one action contributes to several active objectives.

### Acceptance criteria

The user can identify activities that advance multiple outstanding tasks without manually cross-referencing several screens.

---

## Milestone 14 - prioritisation engine

### Objective

Move from checklist tracking to planning.

### Deliverables

Create an inspectable scoring system using relevant factors such as:

* reset proximity;
* event expiry;
* number of tasks progressed;
* reward availability;
* goal relevance;
* estimated effort;
* player-defined priority;
* reward scarcity/value.

Keep weights configurable.

Do not claim that the engine mathematically maximises loot unless the available dataset actually makes that possible.

Prefer language such as:

```text
recommended
high value
high priority
efficient
```

until sufficient data exists for stronger optimisation claims.

### Acceptance criteria

The planner can rank currently available activities and explain why one is ranked above another.

Example:

```text
1. Activity A

Why:
- expires in 2 hours
- advances 3 unfinished tasks
- contributes to Character A's active upgrade
- reward cap not reached
- estimated 10 minutes
```

No recommendation should be an unexplained black-box score.

---

## Milestone 15 - time-budget planning

### Objective

Answer:

```text
What should I do if I have X minutes?
```

### Deliverables

Use optional activity-duration estimates and planner priorities.

Support user-selected available time such as:

```text
15 minutes
30 minutes
60 minutes
custom
```

Suggest a practical activity sequence.

### Acceptance criteria

Recommendations respect:

* currently available activities;
* character;
* task state;
* estimated duration;
* reward caps;
* reset urgency.

---

## Milestone 16 - real Diablo Immortal dataset

### Objective

Replace synthetic fixtures with progressively verified game definitions.

This milestone will likely consist of many smaller content iterations.

### Data collection process

For each mechanic:

1. identify the activity/system;
2. determine scope;
3. determine availability;
4. determine resets;
5. determine progress rules;
6. determine reward rules;
7. determine caps;
8. determine character/account behaviour;
9. determine dependencies;
10. record source and verification metadata;
11. encode the definition;
12. validate it;
13. test unusual behaviour.

Do not make undocumented assumptions.

### Acceptance criteria

Real game definitions can be added primarily through data/configuration rather than application-code changes.

When application-code changes are necessary, they should represent a newly discovered general mechanic.

---

## Milestone 17 - usability hardening

### Objective

Make the application comfortable to use while actively playing.

### Review

Optimise:

* click count;
* progress-entry speed;
* character switching;
* information density;
* keyboard interaction;
* mobile usability;
* desktop layouts;
* reset visibility;
* urgency indicators;
* accessibility.

### Acceptance criteria

Common actions should require minimal interaction.

For example, incrementing:

```text
2 / 3
```

to:

```text
3 / 3
```

should not require opening an edit form.

---

## Milestone 18 - failure and recovery hardening

### Objective

Make local data trustworthy.

### Test scenarios

Include:

* malformed import;
* old database schema;
* partially migrated data;
* missing game definition;
* renamed game definition;
* deleted definition referenced by history;
* corrupted stored state;
* browser clock changes;
* timezone changes;
* application opened across many missed resets.

### Acceptance criteria

Failures provide actionable error information.

The application should prefer preserving recoverable player data over silently discarding it.

---

## Milestone 19 - production candidate

### Objective

Reach a feature-complete personal production version.

### Requirements

Run a complete review of:

* type checking;
* linting;
* tests;
* production build;
* accessibility;
* responsive behaviour;
* storage migration;
* import/export;
* reset calculations;
* event boundaries;
* character scoping;
* data validation;
* error states.

Remove:

* temporary fixtures not intentionally retained;
* debug UI;
* dead code;
* unused dependencies;
* experimental shortcuts.

### Acceptance criteria

The application can be deployed as a static site and used as the real planner without developer intervention for ordinary operation.

---

## Milestone 20 - production

### Objective

Deploy and use the application as the canonical personal Diablo Immortal planner.

### Production requirements

The production deployment must:

* be static;
* require no backend;
* require no authentication;
* work entirely from browser-local data;
* support backup/export;
* support restoration/import;
* recover correctly after missed reset periods;
* handle multiple characters independently;
* preserve historical progress;
* expose the current application/data schema version.

Create a versioned production release.

Document:

* deployment procedure;
* backup procedure;
* restoration procedure;
* upgrade/migration procedure;
* how to add or update Diablo Immortal definitions.

---

# Post-production lifecycle

Production is not the end of development.

Diablo Immortal changes over time.

After production, changes fall into four broad categories:

## Game-data update

Example:

```text
Event X now gives 3 rewards instead of 2.
```

Prefer changing structured game definitions only.

## New game mechanic

Example:

```text
A newly introduced activity uses a reset model we cannot currently represent.
```

Extend the generic domain model, add tests, document the new concept, and then add the game definition.

## Planner improvement

Example:

```text
Better prioritisation algorithm
New dashboard grouping
Improved character comparison
```

Treat this as application development independent of game-data updates.

## Data migration

Any change affecting persisted player state must include an explicit schema migration.

Never simply change persisted structures and assume existing browser data will conform.

---

# Milestone discipline

For every milestone:

1. define the intended outcome;
2. identify affected domain concepts;
3. implement the smallest coherent solution;
4. add or update tests;
5. validate existing stored/data fixtures;
6. update relevant documentation;
7. run quality gates;
8. record deferred work;
9. mark the milestone complete only when its acceptance criteria pass.

Do not use milestone completion percentages.

Use explicit states such as:

```text
planned
in progress
blocked
ready for review
complete
```

If work discovered during one milestone belongs to a later milestone, record it rather than expanding the current milestone indefinitely.

---

# Production definition

For this project, "production" does **not** mean:

* public SaaS;
* multiple users;
* authentication;
* server infrastructure;
* commercial deployment.

Production means:

> A stable deployed version that I can rely on as my personal Diablo Immortal planner, containing my real characters and progress, surviving normal application upgrades, and correctly handling game resets without manual database intervention.

The architecture should remain proportionate to that goal.

Do not introduce enterprise infrastructure for hypothetical future requirements.
