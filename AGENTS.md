# AGENTS.md

## Current state

Prototype monolith **CRM × SIMPRO** is implemented in `frontend/`.

- Product source of truth: `docs/PRD.md`
- Delivery scope: `docs/MVP.md`
- Visual/code source of truth: `frontend/src` (primary), `References/*.png` (secondary)
- Prototype data lives in the browser: Zustand + `localStorage` for app state, IndexedDB for uploaded files. No backend, auth, or real SIMPRO integration.
- Old `D:\Projects\SIMPROv2\CRM-MVP.md` and `BRIEF.md` are historical; do not treat them as current requirements.

## Commands

Run from `frontend/`:

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
```

`npm run lint` is scoped to the prototype code. `npm run lint:all` still includes legacy SIMPRO screens and may fail; those screens are hidden from the prototype.

## Where the prototype lives

- Domain rules, gates, progress, permissions: `frontend/src/lib/prototype/domain.ts`
- Seed/demo data: `frontend/src/lib/prototype/seed.ts`
- Zustand store + persistence: `frontend/src/lib/prototype/store.ts`
- IndexedDB file storage: `frontend/src/lib/prototype/files.ts`
- Excel import/templates: `frontend/src/lib/prototype/excel.ts`
- Prototype UI: `frontend/src/components/prototype/`
- Routes:
  - CRM: `/crm`, `/crm/projects`, `/crm/projects/[id]`, `/crm/groups`, `/crm/workload`
  - SIMPRO: `/dashboard`, `/projects`, `/projects/[id]/*`, `/my-tasks`, `/forms`

## Frontend baseline

`frontend/` is Next.js 16 + React 18 + Tailwind 4 + shadcn `base-nova`. Reuse its shell, UI primitives, and visual tokens; do not create a second sidebar/topbar/design system.

Prototype adaptations already made:

- `src/proxy.ts` is a pass-through; auth is replaced by the local role switcher.
- `(main)/layout.tsx` renders `PrototypeShell`, not the server-auth shell.
- The SIMPRO board is configured to exactly six statuses. Do **not** restore `on_check`, `ready_to_deploy`, or the parking lot (`on_hold`, `cancelled`) from the legacy `board-constants.ts`.
- Legacy nav items and project tabs are hidden but their old route files still exist.
- `/api` rewrites still point at the old backend, but the prototype does not call them.

## Product rules that are easy to get wrong

- Six fixed steps, all mandatory: Pitching → Survey → RAB → Running → BAST ∥ Invoice. No step editing and no skip.
- Task cards exist only in Pitching and Running. Survey/RAB/BAST/Invoice are `StepForm`, not `Task`; they do not appear on the board, My Tasks, workload, or task progress.
- BAST and Invoice are parallel Finance steps; each is 50% of Finance progress. Journey % uses denominator 5 (four full steps + Finance split 0.5/0.5).
- Survey form lives in SIMPRO; RAB and finance forms live in CRM.
- Only Manager/Admin assign tasks. PM creates tasks and reviews; PM only sees own projects.
- Pitching is unlimited, allows multiple winners, and losing pitchings/tasks are archived into read-only history.
- Workload counts only active card tasks (To Do, In Progress, Awaiting Approval, Need Revision); no points or capacity.
- PM does not reject BAST/Invoice; Finance edits until PM closes the project.
- Task board access for an Assignee is filtered to tasks assigned to them.

## Verification

`npm run build`, `npm run lint`, and `npm test` pass. The domain tests cover gates, progress, visibility, task transitions, workload, and Excel validation.
