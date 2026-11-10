# Proposal

## Why

The prototype still presents CRM and SIMPRO as two separate products: two dashboards, two project lists, and a module switcher, even though they describe the same projects. Commercial data is also fragmented: Media Orders sit in their own project tab and are invisible in the Forms inbox, Groups are a flat list with no umbrella detail, and the Business Dashboard has no per-project RAB/MO table to explain where its margin comes from. Operational roles pay for this: Assignees cannot open the projects their cards belong to, and My Tasks splits one person's work into per-project accordions instead of a single board.

## What Changes

- **Media Order becomes a Form Keuangan category**: keep multiple MO documents per project, but expose `mo` as a Finance form type with the same Prospek phase association as RAB. MO stays an interactive line-item table (client price, vendor cost, owning business unit) editable while negotiation is live, appears in Forms, and is reachable from the project workspace.
- **Groups become Umbrella Projects**: rename the surface and add an Umbrella Project detail page with an overview, progress, related projects, and cumulative RAB and MO totals per member project. Project and umbrella header cards show cumulative RAB and MO when present; Assignees never see the nominal values.
- **New Business submenu**: Business now contains `Business Dashboard` plus `RAB` and `MO` tabs of per-project commercial rows. PM, Manager, Finance, BOD, and Admin may open the submenu read-only; RAB/MO editing remains on the project surfaces.
- **Commercial rollup feeds the dashboard**: approved RAB and non-cancelled MO items roll up per business unit and per umbrella into revenue, cost, margin, margin %, and variance without manual entry.
- **One workspace, one menu**: remove the SIMPRO/CRM sub-sections and the module switcher. A single role-scoped sidebar (Dashboard, Projects, My Tasks, Forms, Umbrella Projects, Templates, Workload, Business) replaces them, and the dashboard merges CRM journey/approval information with SIMPRO task information using existing URLs.
- **Assignee project access**: an Assignee can open the Projects list and the detail of any project where they hold a card or form, limited to Overview, Board, and Backlog; commercial and journey-management actions stay hidden.
- **My Tasks is one board**: replace per-project accordions with a single status board aggregating every card assigned to the user across projects. Each card names its project. Form entries never appear as cards.
- **BREAKING**: `Groups` naming is replaced by `Umbrella Projects` in navigation, tables, project attribution, and filters. Existing group records and URLs keep working.

## Capabilities

### New Capabilities

- `umbrella-projects`: umbrella project list and detail, member project rollup, cumulative RAB/MO totals, and umbrella attribution on project surfaces.
- `business-hub`: the Business submenu, its RAB/MO commercial tables, per-project drill-down, and role-scoped read access to the Business Dashboard.

### Modified Capabilities

- `revenue-tracking`: Media Order is a Form Keuangan category tied to Prospek while remaining a multi-document project table; cumulative MO totals roll up to the project and umbrella.
- `forms-inbox`: Media Order appears as a Finance form category with assignment rules and a full form page.
- `project-journey`: project workspace tab set and per-role tab scope change; MO is an allowed Finance form step kind; umbrella attribution replaces group attribution.
- `work-assignment`: module access becomes one workspace; Assignees gain scoped project browsing and detail access; PM/Manager/Finance gain read-only Business access.
- `simpro-dashboard`: the dashboard merges CRM and SIMPRO information and becomes the single workspace dashboard.
- `simpro-kanban-delivery`: My Tasks becomes one cross-project board whose cards show the project.
- `table-list-views`: Groups tables become Umbrella Projects tables with cumulative commercial columns; project rows use umbrella attribution.

## Impact

- `src/lib/prototype/types.ts`: `mo` form key, MO form payload/link, umbrella totals, dashboard row types.
- `src/lib/prototype/domain.ts`: MO-as-form helpers, umbrella totals, dashboard/hub queries, role access, assignee project visibility and tab scope.
- `src/lib/prototype/store.ts`: MO form creation/save through finance forms, Prospek MO step creation, umbrella detail mutations, persist migration for MO forms and renamed surfaces (idempotent).
- `src/components/prototype/`: shell navigation, merged dashboard, My Tasks, project cards/detail tabs, umbrella list/detail, Business hub, Forms inbox, MO surfaces.
- `src/app/(main)/`: `/business` and new Business tab routes, umbrella detail route, plus legacy `/crm/groups` redirect while keeping existing CRM/SIMPRO URLs alive.
- `tests/`: MO form lifecycle and assignment, umbrella totals, Business hub access and aggregation, assignee project/tab scope, My Tasks aggregation, navigation and role landing regressions, migration idempotency.
- `AGENTS.md` and `Docs/`: update navigation, umbrella, MO, Business hub, and assignee access rules after implementation.
