# Tasks

## 1. Types and domain foundations

- [x] 1.1 Extend `src/lib/prototype/types.ts` with `media` and `bod` roles, `PhaseState`, optional `Project.phaseStates`, `TaskWorkingLink`/`Task.workingLink`/`workingLinkHistory`, `StageEntryType`/`TemplateStage.entryTypes`, `FormEntry.entryType`, `BusinessUnitId`, `MediaOrder`/`MediaOrderItem`, `RabItem.businessUnitId`, and `AppState.mediaOrders`. Verify with `npx tsc --noEmit` or `npm run build`.
- [x] 1.2 Add `ROLE_LABEL` entries for Media and BOD, a `BUSINESS_UNITS` catalog (Makerspace, Makerspace Video, Spektrum), and `roleCanAccessBusiness`; update `roleCanAccessCrm`, `roleCanAccessSimpro`, and `landingForRole`. Verify with unit tests for each role's CRM/SIMPRO/Business access and landing path.
- [x] 1.3 Implement `validateWorkingLink`, `canEditPhaseStructure`, and `mediaOrderTotals`/line-margin helpers in `src/lib/prototype/domain.ts`. Verify with unit tests covering valid http/https URLs, rejected empty/non-http input, locked-phase rejection, and revenue/cost/margin math including zero revenue and negative margin.
- [x] 1.4 Document the new domain helpers and role matrix in `Docs/Stage-Types.md` (or a linked section) and verify the documented function names match the exports.

## 2. Phased journey authoring

- [x] 2.1 Change `createProject` in `store.ts` to materialize only the template's Prospek stages and initialize `phaseStates.prospek`; keep `structureLocked` for legacy data. Verify with a test that a new Event project has no Planning/Running/Closing stages.
- [x] 2.2 Extract the stage-copy helper and add `setPhaseStructure(projectId, phase, stages)` plus `startPhase(projectId, phase)` store actions, enforcing `canEditPhaseStructure` and writing `phase.composed`/`phase.started` events. Verify tests reject edits after a phase starts and reject starting an empty Planning or Running phase.
- [x] 2.3 Add idempotent Closing-stage appending when Running starts, preserving parallel BAST/Invoice weights and adding Pembayaran only for non-legacy templates. Verify a test that running `startPhase('running')` twice does not duplicate Closing stages.
- [x] 2.4 Update `decideGate` so an approved client gate locks the RAB baseline, sets `won`, and creates editable-but-unstarted Planning/Running phase states without auto-activating a next stage; keep rejection as `lost` with required reason. Verify tests for win, loss, and "no stage activated on win".
- [x] 2.5 Define Event Brief Received `entryTypes` (strategy, KV, vendor contact, site survey, budget/quotation, vendor selection), keep Client Approval as the winning gate, and publish the Event template as a new version in `templates.ts`/`seed.ts`. Verify a seed test that Event Prospek has Brief Received plus the gate and no separate strategy/KV/vendor/survey/selection stages.
- [x] 2.6 Add phase composition UI to the create-project flow and project detail: show only materialized phases, let the PM compose Planning/Running after a win, start each phase, and render locked/completed phases read-only. Verify with `npm run build` and a manual pass that adding a stage to a started phase is blocked in the UI and store.
- [x] 2.7 Add briefing-entry UI for Event Brief Received: create entries per entry type, show default roles, and deep-link the budget/quotation entry to the project RAB form. Verify a manual pass that all six entries can be assigned, filled, submitted, and reviewed.
- [x] 2.8 Scope `calculateJourneyProgress` to materialized stages and add a regression test asserting Umum still produces the legacy percentages. Verify with `npm test`.

## 3. Roles, allocation, and working link

- [x] 3.1 Update `components/prototype/shell.tsx`: Media lands in SIMPRO, BOD sees only a Business nav entry and `/business`, and CRM/SIMPRO guards deny BOD while Media is denied CRM. Verify with permission tests plus a manual role-switcher pass for Media and BOD.
- [x] 3.2 Extend form permissions so Media can edit/submit only assigned BAST entries and cannot edit RAB, Invoice, or Pembayaran. Verify with tests for each form type and for a BAST entry assigned to another user.
- [x] 3.3 Add Media and BOD demo users to `seed.ts` and to the migration merge path so existing browser data gains them without a reset. Verify a seed test asserts both users exist with the correct roles.
- [x] 3.4 Add working-link persistence: `setWorkingLink(taskId, url)` store action, history append, `task.working_link_set` audit event, and enforcement inside `transitionTask` using `validateWorkingLink`. Verify tests that `todo → in_progress` and `need_revision → in_progress` fail without a valid link and succeed with one.
- [x] 3.5 Add the working-link field to the card dialog and drag/drop flow: prompt when moving to In Progress, show the current link to PM/Manager, and allow replacement while In Progress. Verify manually that a missing/invalid URL blocks the move and that a valid URL appears on the card.
- [x] 3.6 Confirm backlog-first allocation in UI: PM-created cards start in Backlog, Manager/Admin can assign to any user including themselves, and PM cannot assign. Verify with tests for self-assignment and PM rejection.
- [x] 3.7 Update `AGENTS.md` product rules for the Media/BOD roles, backlog allocation, and mandatory working link, and verify the rules match the implemented tests.

## 4. RAB and Media Order

- [x] 4.1 Add business-unit mapping to the RAB table: required selector per item, validation on save, and a "Belum dipetakan" badge for migrated legacy items. Verify tests reject an item without a unit and the table shows the selected unit.
- [x] 4.2 Implement Media Order storage and actions: create/update/delete MO, add/edit/remove items, recalculate totals, and audit `media_order.*` events. Verify tests for totals, item deletion, and audit metadata.
- [x] 4.3 Build the MO UI as an interactive table under the project detail and CRM project routes, including empty state and validation messages. Verify `npm run build` and a manual pass adding and editing rows.
- [x] 4.4 Implement `rabCostByBusinessUnit` and group roll-up so MO revenue/cost/margin aggregate to the project's group when present and stay standalone otherwise. Verify tests for grouped and ungrouped projects.
- [x] 4.5 Enforce read-only RAB after baseline lock and read-only MO/RAB for `done`, `lost`, or `cancelled` projects. Verify tests for each lifecycle and an approved RAB.
- [x] 4.6 Document the MO fields, business-unit mapping, and margin formula in `Docs/Revenue-Tracking.md`, and verify the documented fields match the types.

## 5. Business Dashboard

- [x] 5.1 Implement `businessDashboardRows(state, { groupId?, from?, to? })` returning per-unit revenue, cost, margin, margin %, item count, planned RAB cost, and variance, returning an empty result when no data matches. Verify unit tests for aggregation, filtering, and empty results.
- [x] 5.2 Create the `/business` route under `src/app/(main)` and add it to the `lint` script in `package.json`; verify `npm run lint` covers the new route.
- [x] 5.3 Build the read-only dashboard UI: per-business-unit cards/table, umbrella filter, period filter, variance display, and empty state, using existing UI primitives. Verify `npm run build` and a manual BOD pass.
- [x] 5.4 Seed sample MOs across Makerspace, Makerspace Video, and Spektrum, including one umbrella group and one standalone project, and confirm reset restores them. Verify a seed test asserts non-zero dashboard rows.
- [x] 5.5 Verify access control end to end: BOD and Admin can open `/business`, while Manager, PM, Finance, Assignee, and Media are redirected. Verify with permission tests and a manual role-switcher pass.

## 6. Migration and integration checks

- [x] 6.1 Bump the Zustand persist version to 4 and extend `migratePersistedState` to derive `phaseStates` from existing stages, add Media/BOD users, default `mediaOrders`, default Event `entryType`s, and keep legacy RAB items unmapped; keep `seedVersion` unchanged so data is migrated, not reset. Verify an idempotency test and a run against a captured v3 snapshot.
- [x] 6.2 Add migration audit events for phase derivation and template linkage without changing existing backfilled events. Verify the audit test asserts no duplicate events after two migrations.
- [x] 6.3 Update `Docs/PRD-Alur-CRM-Baru.md` and the release notes with the per-phase journey, Brief Receive entry model, Media/BOD roles, working link, MO, and dashboard decisions; verify every changed rule points to its spec.
- [x] 6.4 Run `npm test`, `npm run lint`, and `npm run build` from the repository root and confirm all pass. Verify the final output has no failures and fix any regressions.
- [x] 6.5 Run the manual role matrix (Admin, Manager, PM, Finance, Assignee, Media, BOD) across create project, win gate, compose phases, allocate card, start with link, fill BAST, open MO, and open dashboard. Verify each role sees only its permitted actions.

## Workflow follow-up

- Archive this change after implementation and review are complete, then re-run `openspec validate --strict`.
- Verify the archived specs contain `project-journey`, `work-assignment`, and `revenue-tracking` with their purposes intact.
