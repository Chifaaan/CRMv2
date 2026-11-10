# Tasks

## 1. Domain foundation

- [x] 1.1 Add `mo` to `FormStepKey` and `FORM_STEP_KEYS`, add the MO payload/labels, and register the type in form label/title helpers; verify with `npm run build` and a unit assertion that all finance keys have a label
- [x] 1.2 Add `projectCommercialTotals` and `umbrellaCommercialTotals` in `domain.ts` using approved RAB, non-cancelled MO, mapped items, and `lost`/`cancelled` exclusions; verify in `tests/business-revenue.test.ts` that project, umbrella, and dashboard totals agree on one fixture
- [x] 1.3 Expand `roleCanAccessBusiness` to Admin, Manager, PM, Finance, and BOD, and update `landingForRole`/visibility helpers for the unified workspace; verify new role-landing and access assertions in `tests/domain.test.ts`

## 2. Media Order as a Finance form

- [x] 2.1 Add an idempotent store action that ensures one `mo` `StepForm` per project when MO documents or a Media Order step exist, with deterministic id `form-<projectId>-mo`; verify a test that calling it twice still yields one form
- [x] 2.2 Wire MO form assignment, submit, approve, and audit into the existing finance form store paths, blocking approval without a non-cancelled MO document; verify store tests for assignment, approval block, approval, and event records
- [x] 2.3 Extend `migratePersistedState` to backfill the MO form shell for projects with MO documents or an existing MO step without touching `mediaOrders`, `groups`, or events; verify `tests/persistence-port.test.ts` covers idempotency and preserved MO data
- [x] 2.4 Add seeded umbrella/MO fixtures so the umbrella detail and Business tables have demonstrable data; verify `npm test` and a manual seed load show the fixtures once

## 3. Media Order surfaces

- [x] 3.1 Add `mo` to the finance form page type map and build the MO form page that lists project MO documents with item tables, totals, mapping warnings, and create/edit/delete actions gated by MO document permissions; verify with a component-level or manual check for PM, Finance, Admin, and read-only viewers
- [x] 3.2 Show Media Order in the Forms inbox with project context, category, document count, and assignment candidates limited to Finance; verify `tests/forms` or `tests/domain` assertions for inbox inclusion, scope, and candidate filtering
- [x] 3.3 Add `Media Order` as an option in the Journey Management step dialog for `Form keuangan`, always labelled `Opsional`, and render the MO form in the Prospek step panel; verify `tests/mandatory-steps.test.ts` confirms it is never auto-created
- [x] 3.4 Keep the project workspace Media Order tab, align its labels with the Finance form category, and confirm read-only behavior for closed projects and unauthorized roles; verify manual role walkthrough plus existing project-detail tests
- [x] 3.5 Document the MO finance category and optional Prospek step in `Docs/Stage-Types.md`; verify the documented path and labels match the running app

## 4. Umbrella Projects

- [x] 4.1 Rename Groups to Umbrella Projects across navigation, list/table headers, dialogs, filters, project chips, and empty states, add `/crm/umbrella-projects`, and redirect `/crm/groups`; verify a legacy `/crm/groups` request reaches the new list and existing memberships still render
- [x] 4.2 Build the umbrella detail page with overview, progress, related projects, cumulative RAB/MO, per-project breakdown, and empty/unauthorized states; verify tests for totals, progress, member links, and access, plus a manual route check
- [x] 4.3 Show cumulative RAB and MO on project and umbrella cards only when qualified amounts exist, and suppress all nominal values for Assignee/Media; verify `tests/business-revenue.test.ts` and a manual Assignee check
- [x] 4.4 Extend the Umbrella Projects table with cumulative RAB/MO and umbrella attribution links, keeping Card/Table preference per page; verify `tests/list-pagination.test.ts` plus a manual Card/Table switch
- [x] 4.5 Document umbrella rollup rules and terms in `Docs/Revenue-Tracking.md`; verify the documented exclusions match the implemented totals

## 5. Unified workspace

- [x] 5.1 Replace `NAV_SIMPRO`/`NAV_CRM` with one role-scoped navigation list, remove the module switcher, and derive the active item from project paths; verify `tests/domain.test.ts` role-nav assertions and a manual check that no CRM/SIMPRO headings remain
- [x] 5.2 Merge the CRM and SIMPRO dashboards at `/dashboard` with role-scoped sections for project/task summaries, finance queues, journey/approval signals, and deadlines, redirect `/crm` to it, and keep `/crm/projects` working; verify dashboard tests for each role and a manual BOD redirect
- [x] 5.3 Allow Assignees to open the Projects list and project detail for projects where they hold a card or form, and limit detail tabs to Overview/Board/Backlog with cards filtered to the Assignee; verify access and tab-scope tests plus a manual Assignee walkthrough
- [x] 5.4 Update `AGENTS.md` navigation, landing, and project-access rules to match the unified workspace; verify the documented routes and roles against the app

## 6. My Tasks

- [x] 6.1 Replace the per-project accordion, List, and Swimlane views in My Tasks with one aggregated status board over all assigned cards, keeping search and project/status filters; verify a test with cards from multiple projects returns one board
- [x] 6.2 Render project name/code and stage on each My Tasks card and keep form entries out of the board; verify card-label and form-exclusion assertions in `tests/simpro-forms.test.ts` or `tests/stage-types.test.ts`
- [x] 6.3 Update My Tasks documentation in `AGENTS.md` and verify the described single-board behavior matches the app

## 7. Business hub

- [x] 7.1 Add `/business/rab` and `/business/mo` with a shared tab shell for Dashboard, RAB, and MO, and enforce role access for Admin, Manager, PM, Finance, and BOD; verify route-guard tests and manual checks for allowed and denied roles
- [x] 7.2 Build the RAB table with project identity, umbrella, status, item count, total, mapping warnings, and a detail action; verify row content, PM scoping, unmapped exclusion, and empty-state tests
- [x] 7.3 Build the MO table with document count, items, revenue, cost, margin, margin percentage, mapping status, cancelled-MO exclusion, and a detail action; verify row math, negative margin, PM scoping, and empty-state tests
- [x] 7.4 Move the existing Business Dashboard into the Business shell and feed it from the shared commercial helpers, keeping period/umbrella filters and automatic updates after MO or RAB edits; verify dashboard tests assert updated totals without manual entry
- [x] 7.5 Make Business surfaces read-only, with row actions opening the permitted project/RAB/MO detail and BOD receiving a read-only detail; verify no mutation controls render for any Business role
- [x] 7.6 Update `Docs/Revenue-Tracking.md` with the Business submenu, table columns, and access matrix; verify the documented behavior against the app

## 8. Integration verification

- [x] 8.1 Run `npm run build`, `npm run lint`, and `npm test` and confirm all pass
- [x] 8.2 Walk through each role once: Admin, Manager, PM, Finance, Assignee, Media, and BOD; confirm landing, navigation, project tabs, MO form, umbrella detail, Business tables, and My Tasks match the specs
- [x] 8.3 Confirm persistence migration and demo reset both leave a usable seeded app with no duplicated MO forms or umbrella data
- [x] 8.4 Change project Board to show all cards across active and completed stages, with the stage selector acting as a Berjalan/Selesai filter; verify `projectBoardTasks` tests and a manual Board walkthrough

## Workflow follow-up

- Archive the change after review and verification pass.
- Sync the modified capability specs when archiving.
