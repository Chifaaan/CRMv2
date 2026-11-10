# Tasks

## 1. Port the dev baseline without the Prospek slice

- [x] 1.1 Check out `dev` versions of the shared libs (`src/lib/prototype/types.ts`, `store.ts`, `domain.ts`, `stepper.ts`, `templates.ts`, `seed.ts`, `events.ts`, `form-versions.ts`, `simpro-forms.ts`) **without** `prospek-events.ts`, and verify `npm run build` reports no unresolved imports.
- [x] 1.2 Remove the Prospek/Pitching model from the ported libs: drop `Prospek`, `ProspekPitching`, contract/Termine/snapshot types, `prospekId`/`pitchingId` fields, Prospek store slices/actions, and Prospek helpers; verify `npm run build` compiles and `grep -ri "prospek" src/lib` only matches legacy Prospek-phase handling.
- [x] 1.3 Check out `dev` versions of the CRM components (`crm/projects.tsx`, `project-create.tsx`, `project-detail.tsx`, `project-work-panels.tsx`, `project-history.tsx`, `step-form-panel.tsx`, `finance-form-page.tsx`, `groups.tsx`, `templates.tsx`, `workload.tsx`, `dashboard.tsx`) while skipping `prospek.tsx`, `prospek-detail.tsx`, and `pitching-detail.tsx`; delete `crm/journey-management.tsx` and `crm/project-overview.tsx`; verify the build has no dangling imports.
- [x] 1.4 Remove Prospek usage from the ported CRM screens: Projects filters/columns/attribution (keep Group/Umbrella only), project card attribution, the Overview origin block, dialogs, and any Prospek link targets; verify the Projects list, project detail, and dialogs render without Prospek data.
- [x] 1.5 Check out `dev` versions of shared UI and SIMPRO files (`shell.tsx`, `dialogs.tsx`, `ui.tsx`, `project-card.tsx`, `view-toggle.tsx`, `forms.tsx`, `group-member-row.tsx`, `simpro/board.tsx`, `simpro/forms-page.tsx`, `simpro/form-entry-page.tsx`, `simpro/project-page.tsx`, `simpro/my-tasks.tsx`, `simpro/task-progress.tsx`, `simpro/dashboard.tsx`) and remove the Prospek nav item plus the Prospek row category from Forms; verify `npm run build` succeeds.
- [x] 1.6 Check out `dev` routes for `/crm/projects/**`, `/projects/**`, `/crm`, and the dashboard only; do not add `/crm/prospek/**` or `/work/prospek/**`; verify every nav entry resolves without a 404.
- [x] 1.7 Review `main` polish commits `dd02d32` and `c03e453` against the ported screens and confirm the stage label on card headers and the workspace tab styling are present; screenshot Projects list and project detail to verify.
- [x] 1.8 Run `npm run lint` on the ported baseline and confirm zero errors before any commercial code is re-added.

## 2. Adapt the test suite

- [x] 2.1 Delete `tests/flexible-journey.test.ts`, `tests/journey-revenue.test.ts`, and `tests/form-assignment.test.ts`; port `dev`'s `tests/domain.test.ts`, `events.test.ts`, `lifecycle.test.ts`, `manager-assignment.test.ts`, `list-pagination.test.ts`, `stage-types.test.ts`, `stepper.test.ts`, `templates.test.ts`, `simpro-forms.test.ts`, `form-versions.test.ts`, `excel.test.ts` but **not** `tests/prospek.test.ts`; verify `npm test` runs.
- [x] 2.2 Remove Prospek-conversion assertions from the ported tests and rewrite them as direct project creation/Manager-PIC assertions; verify `npm test` passes for `lifecycle`, `manager-assignment`, and `templates`.
- [x] 2.3 Confirm `tests/list-pagination.test.ts` covers the 10/25/50/100 page sizes and default 10 for Projects, and `tests/templates.test.ts` covers execution templates and idempotent migration.

## 3. Merge the persistence migration

- [x] 3.1 Extend `migratePersistedState` to map `closing` steps/templates to `finance` and to limit `planning → prospek` remapping to legacy Umum stages; verify with a new `tests/persistence-port.test.ts` fixture holding a `main`-shaped project.
- [x] 3.2 Map task `workingLink` to `workUrl` (latest value), drop `workingLinkHistory` and task `managerId`, and record the change in a migration event; verify the fixture test asserts the mapped and dropped fields.
- [x] 3.3 Discard any Prospek/Pitching fields found in persisted state with one migration note and recreate no Prospek entity; verify the fixture test asserts the state has no Prospek slices.
- [x] 3.4 Preserve `mediaOrders`, MO items, and `businessUnitId` during migration, defaulting an unknown MO status to `draft`; verify the fixture test keeps every order and item.
- [x] 3.5 Backfill `u-media`, `u-bod`, and the three execution templates when persisted templates already exist, so template-mode creation has options; verify the fixture test asserts all six seed templates and both users exist after migration.
- [x] 3.6 Copy the pre-migration payload to the `prototype-state-backup` key before the first write, and verify a second migration run changes nothing (idempotency assertions in `tests/persistence-port.test.ts`).

## 4. Re-integrate Media and BOD roles

- [x] 4.1 Add `media` and `bod` back to `Role`, `ROLE_LABEL`, and the seed; verify the role switcher lists all seven roles and `npm run build` passes.
- [x] 4.2 Update `landingForRole` and the shell guards so Media lands in SIMPRO and BOD lands on `/business` with no CRM/SIMPRO nav; verify with a unit test for landing and a manual role-switch check.
- [x] 4.3 Include Media in operational helpers (`isOperationalAssignee`, `canAssignOperational`/candidates, `canWorkTask`, workload rows, board and Backlog filtering) while keeping board visibility scoped to the Media user's own cards; verify with domain/workload tests.
- [x] 4.4 Allow Media to fill and submit an assigned BAST (`canEditForm` for `bast`, finance form assign candidates) and keep RAB/Invoice/Pembayaran read-only for Media; verify with permission tests including a negative RAB case.

## 5. Restore the Business Dashboard

- [x] 5.1 Re-add `MediaOrder`, `MediaOrderItem`, `MediaOrderStatus`, `BusinessUnitId`, `businessUnitId` on `RabItem`, and `mediaOrders` in `AppState`; verify `npm run build` and the MO math unit tests.
- [x] 5.2 Re-add `mediaOrderLine`, `mediaOrderTotals`, `rabCostByBusinessUnit`, `businessDashboardRows`, and `roleCanAccessBusiness` on top of `dev`'s `formFor`/`groups`, and verify per-unit aggregation plus group/standalone filters with unit tests.
- [x] 5.3 Re-add the MO store actions with `canManageMediaOrders` (owning PM, Manager, Finance, Admin; active non-lost project) and project audit events; verify audit and permission assertions.
- [x] 5.4 Restore `business-dashboard.tsx`, `src/app/(main)/business/page.tsx`, and the `Business` nav item visible only to Admin and BOD; verify the route renders for BOD/Admin and is denied for the other five roles.
- [x] 5.5 Add the `Media Order` workspace tab to project detail for Admin/Manager/PM/Finance, mount `ProjectMediaOrders`, and verify the tab is absent for Assignee/Media and read-only on closed projects.
- [x] 5.6 Restore the business-unit column and select in the RAB editor with warning-only validation, and verify an unmapped item is saved but excluded from dashboard totals.

## 6. Finance forms and Forms inbox for Media

- [x] 6.1 Re-add `/forms/finance/[projectId]/[type]` as a thin wrapper over `FinanceFormPage`, open it for Media on assigned BAST, and verify edit rights for Finance/owning PM/Admin and read-only for others.
- [x] 6.2 Update SIMPRO Forms rows, role filters, and labels so forms appear only for Project and Finance work (no Prospek category) and Media sees only assigned finance rows; verify with the forms-row tests.
- [x] 6.3 Verify the Forms badge counts Assigned/Draft/Need Revision for entries and finance forms, excludes the review queue, and includes Media and Finance work in the assertion.

## 7. Documentation

- [x] 7.1 Rewrite the `AGENTS.md` product rules and route list for the merged model (dev phases, direct project creation, commercial features, Media/BOD) with no Prospek module or routes, and verify each rule against the code helpers it names.
- [x] 7.2 Refresh `Docs/Stage-Types.md` for Planning/Running/Finance and Finance form steps, and update `Docs/Revenue-Tracking.md` for the MO tab, business-unit rule, and group rollup; verify every referenced file exists and no document promises a Prospek module.
- [x] 7.3 Update the `AGENTS.md` verification section to list the ported and new test files, and confirm each listed test file exists in `tests/`.

## 8. Integration verification

- [x] 8.1 Run `npm run build`, `npm run lint`, and `npm test` together and confirm all three pass with no skipped suites.
- [x] 8.2 Smoke-test project creation as PM: create a template project and a manual project, set a Manager PIC, start from Planning and from Running on separate projects, and verify progress shows a step count for manual and a percentage for template projects.
- [x] 8.3 Smoke-test the workspace: add/edit/remove pending steps, complete a step, complete Planning → Running, confirm BAST and Invoice are auto-created in Finance, and open Board/Backlog/Forms/Media Order.
- [x] 8.4 Smoke-test Media and BOD: Media completes an assigned card and BAST from SIMPRO Forms; BOD opens `/business` and sees per-unit revenue, cost, margin, and the group filter.
- [x] 8.5 Load an existing `main` browser state, confirm the `prototype-state-backup` key exists, and verify media orders, RAB units, work links, and project history survive the migration.
- [x] 8.6 Grep the shipped code and tests for `prospek`/`Prospek`/`Pitching` and confirm only legacy phase handling and migration notes remain.

## Workflow follow-up

- Archive this change after review so the capability deltas are synced into `openspec/specs/`.
- Verify the archived specs: `project-journey`/`work-assignment`/`revenue-tracking` updated, and `simpro-kanban-delivery`, `forms-inbox`, `table-list-views` created.
- Consider a later, separate change to bring the commercial features (Business, Media Order, Media/BOD) from `main` back to `dev`.
