# AGENTS.md

## Current state

Prototype monolith **CRM × SIMPRO** is implemented at the repository root.

- Product source of truth: `Docs/PRD.md` + addendum `Docs/PRD-Alur-CRM-Baru.md`
- Delivery scope: `Docs/MVP.md`
- Visual/code source of truth: `src` (primary), `Docs/References/*.png` (secondary)
- Prototype data lives in the browser: Zustand + `localStorage` for app state, IndexedDB for uploaded files. No backend, auth, or real SIMPRO integration.
- Old `D:\Projects\SIMPROv2\CRM-MVP.md` and `BRIEF.md` are historical; do not treat them as current requirements.

## Commands

Run from the repository root:

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
```

`npm run lint` is scoped to the prototype code. `npm run lint:all` still includes legacy SIMPRO screens and may fail; those screens are hidden from the prototype.

## Where the prototype lives

- Domain rules, gates, progress, permissions, template validation: `src/lib/prototype/domain.ts`
- Template model and seed templates (Umum, KOL Campaign, Event Program): `src/lib/prototype/templates.ts`
- Project audit trail (`project_events`, backfill, read/pagination): `src/lib/prototype/events.ts`
- Step history UI: `src/components/prototype/crm/project-history.tsx`
- Seed/demo data: `src/lib/prototype/seed.ts`
- Zustand store + persistence + persist migration: `src/lib/prototype/store.ts`
- IndexedDB file storage: `src/lib/prototype/files.ts`
- Excel import/templates: `src/lib/prototype/excel.ts`
- Prototype UI: `src/components/prototype/`
- Routes:
  - CRM: `/crm`, `/crm/projects`, `/crm/projects/new`, `/crm/projects/[id]`, `/crm/groups`, `/crm/templates`, `/crm/workload`
  - SIMPRO: `/dashboard`, `/projects`, `/projects/[id]/*`, `/my-tasks`, `/forms`

## Frontend baseline

The app is Next.js 16 + React 18 + Tailwind 4 + shadcn `base-nova`. Reuse its shell, UI primitives, and visual tokens; do not create a second sidebar/topbar/design system.

Prototype adaptations already made:

- `src/proxy.ts` is a pass-through; auth is replaced by the local role switcher.
- `(main)/layout.tsx` renders `PrototypeShell`, not the server-auth shell.
- The SIMPRO board is configured to exactly six statuses. Do **not** restore `on_check`, `ready_to_deploy`, or the parking lot (`on_hold`, `cancelled`) from the legacy `board-constants.ts`.
- Legacy nav items and project tabs are hidden but their old route files still exist.
- `/api` rewrites still point at the old backend, but the prototype does not call them.

## Product rules that are easy to get wrong

- Four fixed phases: Prospek → Planning → Running → Closing. Phase order cannot be changed by users. The meaning of "Planning" changed: it now starts at contract commitment.
- Stages come from a project template. They may be customized only while creating a project, then `structureLocked` freezes them. There is no add/remove/reorder/skip after creation.
- Template "Umum" is `legacy` and must keep the old six stages: Pitching → Survey → RAB → Running → BAST ∥ Invoice. New templates require one stage per phase and exactly one winning gate.
- Journey % is weighted: sum of completed stage weights / sum of non-skipped stage weights. Umum weights (1,1,1,1,0.5,0.5) must produce the exact legacy numbers; a submitted BAST/Invoice still counts before the stage is formally completed.
- Four stage kinds only: **Form Keuangan, Form, Gerbang, SIMPRO**. Checklist is removed; migrated checklist tasks become a checklist field in a Form template.
- Proyek memiliki satu Manager penanggung jawab opsional (`managerId`) yang dipilih PM pemilik atau Admin saat membuat/mengedit proyek. Penunjukan ini tidak mengubah visibilitas Manager; Manager tetap melihat semua proyek.
- Form stages have one form template and many entries. Entries are created by PM, assigned by Manager/Admin, filled by the assignee, and reviewed by PM. All non-cancelled entries must be approved; at least one entry is required unless "no work" is explicitly confirmed and audited.
- Manager dan Assignee sama-sama dapat menjadi assignee operasional task/Form. PM pemilik hanya boleh assign ke Manager proyeknya; Manager/Admin tetap boleh assign ke Assignee atau Manager. Manager assignee boleh mengerjakan task/Form miliknya tetapi tidak mendapat hak review.
- SIMPRO stages use Kanban cards. Tasks carry `stageId`; the board filters by stage (default active), shows the stage on cards, and completed stages are read-only. A stage closes when no task remains, with at least one task unless "no work" is confirmed.
- Form Keuangan supports RAB, BAST, Invoice, and Pembayaran. Pembayaran only exists in new templates (Closing), so Umum progress is unchanged. These forms open as full pages under `/crm/projects/[id]/forms/[type]`; Detail Proyek keeps the summary, Review, and History inline. RAB/BAST/Invoice also appear in SIMPRO Forms for the assigned Finance, owning PM, and Admin only.
- Task cards exist only on SIMPRO stages (including legacy Pitching and Running). Form entries never appear in My Tasks.
- BAST and Invoice are parallel finance stages (`parallelGroup: "finance"`); each is 0.5 weight.
- Survey form lives in SIMPRO and keeps the legacy Survey screen (wrapped as a Form stage); RAB and finance forms live in CRM.
- A winning gate (client approval) sets lifecycle `won`, locks RAB as baseline, and moves the project to Planning. Rejection sets `lost` with a required reason. Batal can be set in any phase.
- Lost and cancelled projects stay complete with history, are read-only, and are excluded from workload and group completion denominators.
- Only Manager/Admin assign tasks and form entries to Assignee/Manager; PM owners may assign only to their project Manager. PM creates/reviews; PM only sees own projects.
- Only Admin and PM manage templates; that right is separate from project access.
- Pitching is unlimited, allows multiple winners, and losing pitchings/tasks are archived into read-only history.
- Workload counts active cards and active forms separately for Assignees and Managers with active work; forms are never merged into the card count.
- The Forms badge counts forms this user still has to fill (Assigned, Draft, Need Revision); the PM review queue is not part of the badge.
- PM does not reject BAST/Invoice; Finance edits until PM closes the project.
- Task board access for an Assignee is filtered to tasks assigned to them.

## Verification

`npm run build`, `npm run lint`, and `npm test` pass. The domain tests cover gates, progress, visibility, task transitions, workload, and Excel validation. `tests/templates.test.ts` covers template copying/independence, validation, structure lock, gate transitions, weighted progress, template permissions, and idempotent persistence migration. `tests/stage-types.test.ts` covers stage type validation, Form/SIMPRO completion rules, form permissions/badge/workload separation, checklist migration, and Pembayaran validation. See `Docs/Stage-Types.md`.
