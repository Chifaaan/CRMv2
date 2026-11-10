# Proposal

## Why

`main` and `dev` were developed in parallel from `d37ab91` and both reworked CRM Projects, so `main` is missing the finished Projects implementation that already exists on `dev`: manual/template project creation with Manager PIC, a five-tab project workspace, Board/Backlog/Forms tabs inside the project, and card/table lists with pagination. A plain `git merge dev` produces 16 conflicted files (project detail, store, domain, types, shell, board, forms) and `dev` does not contain the commercial features that `main` already ships — the Business Dashboard, Media Order, and the Media/BOD roles — so the port must be reconciled rather than merged.

This change is limited to **Projects**. It does not bring the Prospek umbrella module or Pitching stage from `dev`: projects are created and run directly, as they are on `main` today.

## What Changes

- Replace the CRM Projects screens on `main` with the `dev` implementation, minus the Prospek surfaces: a flat Projects list with Card/Table toggle, pagination, phase/template/status/priority filters, and Umbrella/Group attribution for projects that belong to a group.
- Replace project creation with the `dev` flow: template mode using the execution templates, manual mode with an empty journey, optional Manager PIC, step composition, and template compatibility validation.
- Replace CRM project detail with the five-tab workspace (Overview, Journey Management, Board, Backlog, Forms), including Overview step completion/task distribution/progress/history, Journey Management step editing, Kanban stage cards, and the project Forms tab.
- Adopt the execution lifecycle for new projects: Planning → Running → Finance, a NEW Project marker before the first step, phase/step completion rules, and automatic BAST/Invoice steps when Finance starts. **BREAKING**: the `closing` phase is replaced by `finance`, and new projects no longer materialise a Prospek phase.
- Strip the Prospek/Pitching slice from the ported code: no Prospek menu, list, detail, Pitching pages, `/work/prospek` routes, Prospek conversion, or Prospek-category rows in Forms. Projects are created directly and are not converted from opportunities.
- Adopt `dev`'s shared libs (`types`, `store`, `domain`, `stepper`, `templates`, `seed`, `events`, `form-versions`, `simpro-forms`) and its tests as the base, without `prospek-events` or Prospek state. **BREAKING**: task work links become a single opaque `workUrl` (no URL validation, no history), the task-level Manager attachment is replaced by project Manager + step Manager PIC, and template seeds gain execution variants used by project creation.
- Keep `main`'s commercial surface on top of the new model: Media Order stays a project artifact with business units and MO totals, the Business Dashboard stays Admin/BOD-only, and the Media and BOD roles stay in the role catalog with their work access (Media: Kanban cards + BAST; BOD: Business Dashboard read-only).
- Migrate persisted prototype state instead of resetting it: `closing` steps/templates map to `finance`, legacy Prospek-phase steps stay readable, `workingLink` becomes `workUrl`, `mediaOrders` and RAB business units are preserved, execution templates are backfilled, and the migration stays idempotent.

## Capabilities

### New Capabilities

- `simpro-kanban-delivery`: SIMPRO Kanban cards tied to active/completed stages, stage visibility, backlog allocation, opaque work link before In Progress, review, My Tasks, and assignee/Manager/Media board scoping.
- `forms-inbox`: the Forms page as the inbox of every assigned Form from Project and Finance work, with categories, badge counting, and role-scoped rows.
- `table-list-views`: Card/Table toggles with per-page view preferences, pagination, and consistent filters/empty states on Projects, Groups, and Forms.

### Modified Capabilities

- `project-journey`: the journey model changes from four fixed phases (Prospek → Planning → Running → Closing) to legacy histories plus Planning → Running → Finance for new projects, with template/manual creation, Manager PIC, five workspace tabs, phase/step completion, and persistence migration.
- `work-assignment`: role model keeps Media and BOD; Manager becomes an operational assignee; PM may assign only to the project Manager; the working link becomes opaque and non-URL; Media keeps Kanban and BAST work; visibility and workload rules follow the new lifecycle.
- `revenue-tracking`: Media Order and business-unit revenue stay, adapted to the new model — MO becomes a project workspace tab, rolls up through the project group, and remains restricted to Admin/BOD for the dashboard while PM/Manager/Finance manage MO.

## Impact

- **Shared prototype libs**: `src/lib/prototype/types.ts`, `store.ts`, `domain.ts`, `stepper.ts`, `templates.ts`, `seed.ts`, `events.ts`, `form-versions.ts`, `simpro-forms.ts`; no `prospek-events.ts` and no Prospek/Pitching types or store actions.
- **CRM UI**: `crm/projects.tsx`, `crm/project-create.tsx`, `crm/project-detail.tsx`, `crm/project-work-panels.tsx`, `crm/project-history.tsx`, `crm/step-form-panel.tsx`, `crm/finance-form-page.tsx`, `crm/groups.tsx`, `crm/templates.tsx`, `crm/workload.tsx`, `crm/dashboard.tsx`; the `dev` Prospek screens (`crm/prospek.tsx`, `crm/prospek-detail.tsx`, `crm/pitching-detail.tsx`) are not ported.
- **Preserved `main` files**: `crm/media-order.tsx`, `business-dashboard.tsx`, `src/app/(main)/business/page.tsx`, and their domain helpers must be re-wired onto the new model instead of deleted.
- **Shell/navigation**: `shell.tsx`, `view-toggle.tsx`, `project-card.tsx`, `ui.tsx` (phase tokens), role switcher labels, and the SIMPRO shell; no Prospek nav item.
- **SIMPRO UI**: `simpro/board.tsx`, `simpro/forms-page.tsx`, `simpro/form-entry-page.tsx`, `simpro/project-page.tsx`, `simpro/my-tasks.tsx`, `simpro/task-progress.tsx`; Forms rows exist only for Project and Finance work.
- **Routes**: updated `/crm/projects/*`, `/projects/[id]/*`, `/forms`; `/forms/finance/[projectId]/[type]` is re-added for Media BAST access; no `/crm/prospek` or `/work/prospek` routes.
- **Persistence**: `localStorage` key/version and `migratePersistedState` must accept the `main` state shape (four phases, `mediaOrders`, `workingLink`, task `managerId`) and stay idempotent.
- **Dependencies**: none added; Next.js 16 + React 18 + Tailwind 4 + shadcn `base-nova` unchanged.
- **Docs/tests**: `AGENTS.md`, `Docs/Stage-Types.md`, `Docs/Revenue-Tracking.md`; `tests/*` replaced/added (`tests/prospek.test.ts` is not ported), `npm run build`, `npm run lint`, `npm test` must pass.
