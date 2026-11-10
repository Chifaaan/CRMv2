# Design

## Context

See `proposal.md` for motivation and the delta specs for behavior. The prototype is a browser-only monolith: Zustand state persisted in `localStorage`, uploaded files in IndexedDB, no backend. Current constraints that shape this change:

- `AppState` already stores `mediaOrders` and `groups` separately from `forms`/`steps` (`src/lib/prototype/types.ts`).
- Finance forms are keyed by `FormStepKey` (`survey`, `rab`, `bast`, `invoice`, `payment`) and assume one `StepForm` per project and key (`formFor`).
- Media Order documents are independent records with their own items, business-unit mapping, status, permissions (`canManageMediaOrders`), and audit events.
- `canViewProject` already lets an Assignee see a project when they hold a card or an assigned form, but navigation and project detail do not expose that access.
- Navigation and role guards are hard-split into `NAV_SIMPRO` / `NAV_CRM` plus a module switcher in `PrototypeShell`.
- Persistence migration lives in `migratePersistedState`, is idempotent, and backs up the previous payload before rewriting.

## Goals / Non-Goals

**Goals:**

- Add Media Order as a Finance form category without losing the existing multi-document MO model or its audit trail.
- Rename Groups to Umbrella Projects without renaming persisted fields, and add a computed umbrella detail page.
- Derive all RAB/MO totals from one shared calculation so cards, umbrella detail, and Business tables agree.
- Merge navigation and dashboard while keeping existing URLs and route guards working.
- Grant Assignees scoped project access and simplify My Tasks to one aggregated board.

**Non-Goals:**

- No backend, authentication, or real SIMPRO integration; state stays local.
- No change to the six Kanban statuses or the card lifecycle.
- No per-business-unit cost allocation engine beyond summing mapped line items.
- No historical backfill of ledger/journal entries; totals are computed from current RAB and MO records.
- No new Media or BOD capabilities beyond what the change states.

## Decisions

### 1. Keep `mediaOrders` documents; add a thin `mo` Finance form shell

`FormStepKey` gains `mo`. A project may still have many `MediaOrder` documents. The `mo` `StepForm` carries assignment, submission, review, and version status; its payload only holds MO-level notes. Document content remains in `state.mediaOrders`, so existing records, totals, permissions, and audit events keep working.

- Why: migrating every MO document into a form payload would duplicate the data model, complicate audit, and break the existing multi-MO behavior the user chose to keep.
- Alternative rejected: one form payload containing an array of MO documents. It would make `mediaOrders` and `forms` two sources of truth or require a risky data rewrite.
- Consequence: the MO form page composes the form header/actions from the `mo` form and the table/documents from `state.mediaOrders`. Creating the first MO ensures the `mo` form shell exists; deleting all documents leaves an empty MO form, not a deleted form.

Editing is intentionally split:

- MO form assignment, submit, approve, and versioning follow existing finance form rules.
- MO document/item editing follows `canManageMediaOrders` (owning PM, Manager, Finance, Admin) because negotiation changes happen before and outside Finance submission.
- An Assignee, Media, or BOD viewer never gets document edit controls.

### 2. Media Order is an optional Prospek Finance step

`mo` is added to `FORM_STEP_KEYS`, `formLabel`, and the finance-form type maps, but not to mandatory step specs. Adding a step with jenis `Form keuangan` and form type `Media Order` creates a `finance_form` step with `financeKind: "mo"`. Templates may include it; project creation never auto-creates it.

- Why: RAB and Decision are mandatory in Prospek, but MO is situational. Auto-creating it would violate the existing mandatory/optional contract and the request to add it "biasanya" in Prospek.
- The MO form cannot be approved without at least one non-cancelled document; this check lives in the form submit/approve guard, not in the generic finance form path.

### 3. Rename in presentation, not in persistence

`groups` stays the persisted field name and `Project.groupId` stays unchanged. UI copy, routes, table headers, chips, and filters use `Umbrella Project`. `/crm/umbrella-projects` is the canonical list, `/crm/umbrella-projects/[id]` the detail, and `/crm/groups` redirects.

- Why: renaming stored keys would require a migration with no behavioral benefit and would break old persisted payloads and tests unnecessarily.
- Domain helpers keep their names (`groupProgress`, `groupCompletionStats`) but gain umbrella-facing aliases where the UI reads better; new totals helpers use "umbrella" naming.
- Umbrella detail is computed on render: overview fields from the group record, progress from completion stats, related projects from `projects.filter(groupId)`, and commercial totals from shared helpers.

### 4. One commercial calculation layer

Add shared helpers in `domain.ts`:

- `projectCommercialTotals(state, projectId)` → `{ rab, mo, unmappedRab, unmappedMo, moRevenue, moCost, moMargin }`.
- `umbrellaCommercialTotals(state, groupId)` → sums member `projectCommercialTotals`.
- `commercialProjectRows(state, { tab, user, filters })` → rows for the Business RAB/MO tables.
- Keep `mediaOrderLine`, `mediaOrderTotals`, `rabCostByBusinessUnit`, and `businessDashboardRows` as the primitives; refactor the dashboard to consume the same row builders.

Rules encoded once: approved RAB only, non-cancelled MO only, mapped items only, exclude `lost`/`cancelled` projects, zero-safe margin percentage. Cards, umbrella detail, and Business tables read these helpers, preventing three slightly different totals.

Why not compute in components: totals are asserted in tests and reused across four surfaces; duplicated math would drift.

### 5. Unify navigation and dashboard with existing routes

`PrototypeShell` replaces `NAV_SIMPRO` / `NAV_CRM` with one role-scoped `NAV_ITEMS` list. The module switcher and `ModuleMenuItem` are removed. `/dashboard` renders the merged dashboard; `/crm` redirects to `/dashboard`; `/crm/projects` remains the Projects route; `/projects/[id]/*` legacy routes stay.

- Why: keeping routes avoids a large route migration and preserves deep links and existing tests.
- Dashboard composition: one component reads `visibleProjects`, task progress, finance/form action queues, journey phase counts, and umbrella rollups, then renders role-scoped sections. CRM-only sections are hidden from Assignee/Media; Finance gets its form queue; commercial roles get approval/journey signals.
- Active navigation is derived from path prefixes (`/crm/projects` and `/projects` both mark Projects active).
- Guard logic becomes role-based route guards instead of "CRM route vs SIMPRO route": Business routes require `roleCanAccessBusiness`; project detail requires `canViewProject`; Assignee/Media project browsing is blocked for Media only.

### 6. Assignee project access uses the existing visibility predicate

`canViewProject` already returns true for an Assignee with an assigned card or form. The work is to expose it:

- Projects list uses `visibleProjects`, so Assignees see their scoped projects.
- Project detail guard allows Assignee, then filters the tab list to Overview/Board/Backlog and filters cards to `assigneeId === currentUser.id`.
- Media stays blocked from project detail; BOD stays blocked outside Business.
- Commercial totals and Media Order/Forms/Journey tabs are not rendered for Assignees.

### 7. My Tasks is one aggregated board

`MyTasksPage` drops the project accordion and List/Swimlane views. It keeps search and project/status filters, then renders one `TaskBoard` over `tasksForAssignee`. Card rendering receives the project lookup so each card can show `project.code`/`project.name` and stage. The existing task dialog remains the detail surface.

- Why: the request is a simplification, and the board already supports the six statuses and card interactions.
- Form entries stay out of My Tasks; they remain in Forms via the existing inbox helpers.

### 8. Business hub is a new route family over existing data

`/business` stays the dashboard. `/business/rab` and `/business/mo` render a shared tabbed table shell. Access uses an expanded `roleCanAccessBusiness` (Admin, Manager, PM, Finance, BOD). The hub is read-only: row actions navigate to project surfaces (or a read-only Business detail for BOD) and no mutation action is wired to the tables.

- PM rows are limited to `createdById === user.id`; Manager/Finance/Admin/BOD see the eligible portfolio.
- The RAB/MO tables reuse the table primitives (`table`, `NativeSelect`, `EmptyState`) and pagination/sort patterns used by existing list surfaces rather than inventing a new table system.
- Dashboard filters (period, umbrella) live in the Business shell so switching tabs preserves the selected umbrella.

### 9. Persistence migration

`migratePersistedState` gains an idempotent pass that:

1. Ensures `forms` contains at most one `mo` form for any project that already has `mediaOrders` or a step with `financeKind === "mo"`; deterministic id `form-<projectId>-mo` prevents duplicates.
2. Leaves `mediaOrders`, `groups`, `Project.groupId`, and all events intact.
3. Backfills nothing else; totals are computed.

The seed state gets one umbrella with commercial member projects so the detail page and Business tables are demonstrable, and a seeded MO form for a Prospek project.

Rollback is prototype-only: reset demo data or clear `localStorage`; the existing backup key is written before migration.

## Risks / Trade-offs

- **MO form shell and MO documents can drift** (form approved while a document is later edited) → document edits are audited separately and remain allowed only while the project is active; the form page always reads documents live, and the approval guard requires a non-cancelled document.
- **Expanded Business access exposes margin** → hub is read-only, PM is scoped to own projects, and Assignee/Media are denied at the route guard.
- **Rename touches many strings and tests** → keep persisted keys unchanged, centralize labels in shared constants/components, and update tests by behavior rather than raw copy where possible.
- **Merged dashboard becomes cluttered** → render sections by role instead of showing everything to everyone; keep the existing section components.
- **Assignee project detail could leak commercial data through shared components** → pass an explicit `commercialVisible`/role flag and assert in tests that RAB/MO figures are absent for Assignees.
- **Removing My Tasks accordions loses per-project context** → each card shows project name/code and filters still allow project selection.
- **Business totals differ from dashboard legacy numbers** → both use the same helpers; tests assert card, umbrella, and dashboard totals agree for the same fixture.
