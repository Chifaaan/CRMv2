# Design

## Context

See `proposal.md` — Why. Technical constraints that shape the approach:

- `main` and `dev` forked at `d37ab91` and both rewrote CRM Projects. `git merge-tree main dev` reports 16 conflicting files, including `project-detail.tsx`, `store.ts`, `domain.ts`, `types.ts`, and `shell.tsx`; the two branches implement different phase models, so conflicts are semantic, not textual.
- `dev` is the source of truth for the Projects experience: creation modes with Manager PIC, the five-tab workspace, Board/Backlog/Forms tabs, card/table lists, and a store/domain pair (≈4k-line store) covered by `tests/lifecycle.test.ts`, `tests/manager-assignment.test.ts`, `tests/list-pagination.test.ts`, and updated `templates`/`stepper`/`stage-types` tests.
- `dev`'s Projects code is entangled with its Prospek umbrella module: the list filters and attribution, the Forms inbox categories, the Overview origin block, routes, and store actions all reference Prospek/Pitching. This change keeps the Projects behaviour and removes that slice.
- `main` owns commercial features with no counterpart on `dev`: the Business Dashboard, Media Order with business units, and the Media/BOD roles. Their code (≈1.5k lines across `media-order.tsx`, `business-dashboard.tsx`, domain helpers, and store actions) is still needed.
- The prototype is client-only: Zustand + `localStorage` for state, IndexedDB for files, a seed version, and a hand-written `migratePersistedState`. There is no backend, so every data-model change must also migrate browser state.
- `dev`'s own OpenSpec specs are stale relative to `dev`'s code (e.g. they still describe two tabs and no Board tab, and older assignment roles). The specs in this change are written from the code and `dev`'s `AGENTS.md`, not copied from `dev`'s spec files.

## Goals / Non-Goals

**Goals:**

- Reach behavioural and visual parity with `dev` for CRM Projects: creation, five-tab workspace, Journey Management, Board/Backlog/Forms tabs, project cards, and list views.
- Strip the Prospek/Pitching slice from the ported code so Projects are created and run directly, with no Prospek menu, routes, entities, conversion, or Forms category.
- Keep Business Dashboard, Media Order, and Media/BOD roles working on top of the adopted model with the same commercial semantics.
- Migrate existing `main` browser state without losing media orders, RAB business units, work links, or history.
- Keep `npm run build`, `npm run lint`, and `npm test` green, with tests for every re-integrated `main` feature.

**Non-Goals:**

- Implementing the Prospek umbrella, Pitching, opportunity conversion, or `/crm/prospek` and `/work/prospek` routes. They are explicitly excluded from this port.
- Cherry-picking `dev`'s OpenSpec history or syncing its stale specs back; capability naming stays on `main` (`project-journey`, `work-assignment`, `revenue-tracking`).
- Bringing the new model back to `dev` in this change; the port is one-directional (`dev` → `main`).
- Redesigning `dev`'s visual language, layout, or component primitives.
- Touching legacy unrelated screens (`letters`, `meetings`, `sprint`, `gantt`) that exist on both branches.
- Adding a backend, auth, or a second state store.

## Decisions

### D1 — Port by explicit `dev` file checkout, not by merging branches

Take `dev`'s version of each file in the Projects area (`git checkout dev -- <paths>`), then re-add the `main`-only slice on top. A merge is rejected because it would re-introduce `main`'s older phase model file-by-file and leave 16 conflicted files where the resolution is always "take dev"; a manual rewrite is rejected because it would re-derive ~19k changed lines and drift from the tested `dev` implementation.

Consequence: `main`-only UI polish commits (`dd02d32`, `c03e453`) are superseded by `dev`'s newer layout; the apply step verifies their intent (stage display on card header, tab styling) against the ported screens rather than replaying them.

### D2 — `dev`'s Project model becomes the base, without Prospek

Adopt `dev`'s types and rules for projects only: `Phase = prospek | planning | running | finance` (Prospek only survives for legacy Umum steps), `project.managerId`, `step.managerPicId`, `creationMode`, `startedAt`, `phaseCompletedAt`, `workUrl`. Delete the superseded `main` files `crm/journey-management.tsx` and `crm/project-overview.tsx`; their responsibilities live inside `dev`'s `project-detail.tsx` and `project-work-panels.tsx`.

Remove from the ported code: `Prospek`, `ProspekPitching`, contract/Termine/Pitching snapshots, `prospekId`/`pitchingId` on projects and form entries, Prospek state slices and actions, `prospek-events.ts`, Prospek components/routes, Prospek attribution in Projects, the Overview origin block, and Prospek rows/categories in Forms.

Alternative considered: keep the Prospek types/state dormant so the port is a pure file copy. Rejected: it would ship dead routes and a conversion engine the user does not want, and would keep Prospek-specific filters/columns visible in Projects.

### D3 — Business and Media Order are re-added as one vertical slice

Re-add, on top of the trimmed `dev` libs:

1. types: `BusinessUnitId`, `MediaOrder`, `MediaOrderItem`, `MediaOrderStatus`, `businessUnitId` on `RabItem`, `mediaOrders` in `AppState`;
2. domain: `mediaOrderLine`, `mediaOrderTotals`, `rabCostByBusinessUnit`, `businessDashboardRows`, `roleCanAccessBusiness`, using `dev`'s `formFor` and `groups`;
3. store: `createMediaOrder`, `updateMediaOrder`, `deleteMediaOrder`, `addMediaOrderItem`, `updateMediaOrderItem`, `removeMediaOrderItem` with the existing `canManageMediaOrders` rule (owning PM, Manager, Finance, Admin on an active, non-lost project) and project audit events;
4. UI: `crm/media-order.tsx`, `business-dashboard.tsx`, `src/app/(main)/business/page.tsx`, the `Business` nav item, and the dashboard guard.

Alternative considered: rebuild MO as a Finance form type in `dev`'s Finance phase. Rejected: MO is a revenue/margin document, not a stage form; it must not create Finance steps (see revenue-tracking spec) and it must roll up independently of journey progress.

### D4 — Media Order becomes its own project workspace tab

`dev`'s detail page gets a sixth tab, `Media Order`, rendered after `Forms` and visible to Admin, Manager, PM, and Finance. It reuses `ProjectMediaOrders` unchanged, so totals, unit warnings, and read-only behaviour stay identical.

Alternatives: a section at the bottom of the page (main's old placement) hides the table whenever another tab is open; a block inside Overview mixes an editable table into a summary tab. A dedicated tab keeps the five work tabs intact and gives MO a stable route-free surface.

### D5 — Media and BOD come back as edge roles, not as a second role model

- `Role` gains `media` and `bod`; `ROLE_LABEL`, seed users (`u-media`, `u-bod`), and the role switcher include them.
- Media is operational for project work only: `isOperationalAssignee` includes media, so Media can be allocated Kanban cards, appears in workload, sees only their cards on the board and My Tasks, and can fill/submit an assigned BAST.
- Finance-form edit rights: `canEditForm` allows Media only for `bast`; SIMPRO Forms shows Media their assigned finance rows; `/forms/finance/[projectId]/[type]` is restored as a thin wrapper around `FinanceFormPage` so Media can open BAST without CRM browsing.
- BOD is commercial-read-only: `landingForRole` → `/business`, no CRM/SIMPRO nav, `roleCanAccessBusiness` = Admin + BOD.

Alternative considered: keep Media out of the port entirely and let the commercial features run without a Media worker. Rejected by the user decision to keep both Media and BOD.

### D6 — One merged state shape with an ordered, idempotent migration

`AppState` = the trimmed `dev` state + `mediaOrders`; no Prospek slices. `migratePersistedState` runs in this order, each step guarded so a second run is a no-op:

1. `dev` migration for templates, steps, forms, entries, tasks, and groups.
2. Phase mapping fix-ups for `main` state: `closing` → `finance`; **only** legacy Umum stages map `planning` → `prospek` (guarded by the matched seed stage), so `main`'s real Planning steps keep their phase; `phaseStates` is recorded as an audit event and dropped.
3. Task mapping: latest `workingLink.url` → `workUrl`; `workingLinkHistory` and task-level `managerId` are dropped (superseded by project Manager and step PIC) and the change is noted in the migration event.
4. Any Prospek/Pitching fields or slices found in persisted state are discarded with a single migration note; no Prospek entity is recreated.
5. Media orders: keep every MO and item, default `status` to `draft` when unknown, keep `businessUnitId`.
6. Role/seed backfill: ensure `u-media` and `u-bod` exist; ensure the three execution templates (`tpl-umum-eksekusi`, `tpl-kol-eksekusi`, `tpl-event-eksekusi`) exist even when persisted templates were present, because template-mode creation uses them.
7. Events backfill (existing `backfillProjectEvents`) for projects created before the port.

Before the first migration write, copy the current payload to a `prototype-state-backup` key so a rollback can restore the pre-port state.

Alternative considered: bump `seedVersion` and reset browser state. Rejected by the user decision to migrate; also loses media orders, which the commercial features depend on.

### D7 — Keep the business-unit column in the shared RAB editor

`dev`'s `step-form-panel.tsx` renders the RAB table without a business-unit column. Re-add the column and per-item select, keep validation warning-only (unmapped lines are flagged, saved, and excluded from aggregation).

### D8 — Tests move to `dev`'s suite minus Prospek, plus a commercial suite

Delete `main` tests tied to the old model (`tests/flexible-journey.test.ts`, `tests/journey-revenue.test.ts`, `tests/form-assignment.test.ts`) and adopt `dev`'s suite except `tests/prospek.test.ts` (not ported; any Prospek conversion assertion inside `manager-assignment`/`lifecycle`/`templates` is removed or rewritten for direct creation). Add `tests/business-revenue.test.ts` covering MO CRUD and audit, business-unit aggregation, dashboard access, media/bod landing, media BAST permission, group rollup, and persistence of MOs across migration.

### D9 — Update docs to describe the merged model once

After the code lands, rewrite `AGENTS.md` product rules for `main`'s merged model (dev phases + direct project creation + commercial features), refresh `Docs/Stage-Types.md`, and update `Docs/Revenue-Tracking.md` for the MO tab and group rollup. No `Docs/Prospek.md` is added.

## Risks / Trade-offs

- **`dev` specs disagree with `dev` code** → Specs here are derived from code; treat this change's specs as authoritative for `main` and avoid back-porting stale `dev` spec text.
- **Dangling Prospek references after trimming** → Remove the slice in the same commit as the port and gate with `npm run build` + `npm run lint`; grep for `prospek`/`Prospek`/`Pitching` in `src` and `tests` to prove none remain outside legacy phase handling.
- **Migration corrupting `main` state** → The `planning → prospek` remap is limited to legacy Umum stages; migration is idempotent and tested against a captured `main`-shaped fixture; a pre-migration backup key allows rollback.
- **Dropped `main` behaviours** (task Manager attachment, URL-validated link history, phaseStates, Closing phase) → Intentional and documented in the proposal's BREAKING list; the migration preserves the observable data that still applies (latest link, phases, history events).
- **Business dashboard loses its group filter context** because Projects no longer shows Groups → The dashboard keeps reading `groups` (the Groups page still creates and edits them) and falls back to standalone when a project has no group; the empty state explains when no commercial data exists.
- **Large file replacement drops `main` polish** → Before overwriting `project-detail.tsx`, review `dd02d32` and `c03e453` and re-apply their intent (stage shown on the card header, workspace tab styling) if `dev` already covers it; screenshot-check Projects list, detail tabs, and board.
- **Type churn across the app** → Port the libs and UI in one commit so imports stay consistent; use `tsc` via `npm run build` plus `npm run lint` as the gate before re-adding commercial code.
- **Rollback after a state migration** → Reverting code would read a new-shaped payload with old rules; the documented rollback path is restoring the `prototype-state-backup` payload (or clearing the store) after a revert.

## Migration Plan

1. Branch `main`; port `dev` files for libs, CRM Projects, SIMPRO and shared components in one commit; remove the Prospek slice and run `npm run build` and `npm run lint` on the ported code.
2. Re-integrate Media/BOD, Business, Media Order, RAB business units, and the Media BAST route; add `tests/business-revenue.test.ts` and fix remaining tests.
3. Merge the persistence migration (D6) and validate with a fixture captured from current `main` `localStorage`.
4. Run `npm run build`, `npm run lint`, `npm test`; smoke-test as PM, Manager, Finance, Assignee, Media, BOD (Projects list, create from template/manual, detail tabs, journey, board, forms, MO, Business).
5. Update docs; keep a revert commit as rollback and restore the backup key if browser state must be rolled back.
