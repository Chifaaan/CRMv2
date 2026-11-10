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
  - Business: `/business` (BOD/Admin read-only)
  - SIMPRO: `/dashboard`, `/projects`, `/projects/[id]/*`, `/my-tasks`, `/forms`, `/forms/finance/[projectId]/[type]`

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
- Templates are recommendations, not requirements. A project can start with an empty Prospek phase; a template only pre-fills Prospek steps. Only Prospek is materialized at creation, all new Prospek steps start pending, and the PM starts the journey explicitly. Until started, Prospek stays editable through Journey Management in project detail. Planning and Running are composed after the winning gate, Closing is appended by rule, and each phase locks when its first step starts. `structureLocked` remains for legacy projects.
- CRM project detail has two tabs: `Overview` and `Journey Management`. The project hero header always lists all four phases with their steps, including phases without steps as `0 Tahap`. Overview is scoped to the opened project (stage completion, task distribution, progress, recent activity) and offers `Selesaikan Tahap` for the active non-gate step. Journey Management lets the PM select a phase and step and creates steps through a name/format dialog with a table preview.
- A started phase may accept a new step or delete an existing step while that step has no work: no form entry in draft/submitted/review, no started finance form, and no task past Backlog. Reorder/edit stays locked after start, and Closing stays rule-driven. A PM may prepare pending steps and template default tasks in an opened but inactive phase; those tasks stay Backlog and cannot be assigned until the step is active.
- Template "Umum" is `legacy` and must keep the old six stages: Pitching → Survey → RAB → Running → BAST ∥ Invoice. New templates require one stage per phase and exactly one winning gate.
- Event Program keeps detailed briefing work (strategy through vendor selection) as entry types under Brief Received, not as separate stages; Client Approval remains the gate.
- Journey % is weighted over materialized stages: sum of completed stage weights / sum of non-skipped materialized stage weights. Umum weights (1,1,1,1,0.5,0.5) must produce the exact legacy numbers; a submitted BAST/Invoice still counts before the stage is formally completed.
- Four stage kinds only: **Form Keuangan, Form, Gerbang, SIMPRO**. Checklist is removed; migrated checklist tasks become a checklist field in a Form template.
- Form stages have one form template and many entries. Entries are created by PM, assigned by Manager/Admin, filled by the assignee, and reviewed by PM. All non-cancelled entries must be approved; at least one entry is required unless "no work" is explicitly confirmed and audited.
- SIMPRO stages use Kanban cards. Tasks carry `stageId`; the board filters by stage (default active), shows the stage on cards, and completed stages are read-only. A stage closes when no task remains, with at least one task unless "no work" is confirmed. An Assignee or Media user bound to the project sees only board stages that are active or completed; pending stage boards are hidden.
- Task cards carry an optional Manager alongside the Assignee. The attached Manager can start/submit the card under the link rule, can assign/reassign it, and is notified when attached, but cannot approve or reject the review. The owning PM can move any card with an Assignee or Manager to any status; the PM still cannot assign.
- Form Keuangan supports RAB, BAST, Invoice, and Pembayaran. Pembayaran only exists in Closing, so Umum progress is unchanged. These forms open as full pages under `/crm/projects/[id]/forms/[type]` and `/forms/finance/[projectId]/[type]`; Detail Proyek keeps the summary, Review, and History inline. RAB/BAST/Invoice/Pembayaran appear in SIMPRO Forms for the assigned Finance user, an assigned Media user for BAST, the owning PM, and Admin.
- Task cards exist only on SIMPRO stages (including legacy Pitching and Running). Form entries never appear in My Tasks.
- BAST and Invoice are parallel finance stages (`parallelGroup: "finance"`); each is 0.5 weight.
- Survey form lives in SIMPRO and keeps the legacy Survey screen (wrapped as a Form stage); RAB and finance forms live in CRM.
- A winning gate (client approval) sets lifecycle `won`, locks RAB as baseline, and opens Planning for composition. Non-legacy journeys must include exactly one client-approval gate as the final Prospek step before the journey starts; Legacy Umum is exempt. Rejection sets `lost` with a required reason. Batal can be set in any phase.
- Lost and cancelled projects stay complete with history, are read-only, and are excluded from workload and group completion denominators.
- Only Manager/Admin allocate backlog cards and form entries; Manager may also assign to themselves. Manager/Admin can assign form entries and finance forms from CRM or from the opened form. Assignees are role-appropriate: Form entries → Assignee/Media; RAB/Invoice/Pembayaran → Finance; BAST → Finance/Media. PM creates/reviews; PM only sees own projects. PM cannot assign.
- Moving a card to In Progress (from To Do or Need Revision) requires a non-empty working link stored on the card and recorded in the audit trail. The link is opaque text: any non-empty value is accepted, there is no URL validation, and the card shows the `Link Pekerjaan` input with `Simpan Link`. An existing link allows starting without re-entry.
- Media works in SIMPRO for assigned cards and briefing entries, and may open and submit an assigned BAST from SIMPRO Forms (`/forms/finance/...`); Media cannot edit RAB, Invoice, or Pembayaran and has no CRM browsing.
- BOD only sees `/business`, the read-only revenue/margin dashboard. Admin also has access.
- Only Admin and PM manage templates; that right is separate from project access.
- Pitching is unlimited, allows multiple winners, and losing pitchings/tasks are archived into read-only history.
- Workload counts active cards and active forms separately; forms are never merged into the card count, and Media assignees are included.
- The Forms badge counts forms this user still has to fill (Assigned, Draft, Need Revision); the PM review queue is not part of the badge.
- PM does not reject BAST/Invoice; Finance edits until PM closes the project. Media may handle assigned BAST documents.
- Task board access for an Assignee or Media user is filtered to tasks assigned to them.
- Every RAB and MO item must map to a business unit (Makerspace, Makerspace Video, Spektrum). MO revenue and margin roll up to the project's group (umbrella).

## Verification

`npm run build`, `npm run lint`, and `npm test` pass. The domain tests cover gates, progress, visibility, task transitions, workload, Excel validation, project overview aggregation, board stage visibility, opaque working links, and PM/Manager card rights. `tests/templates.test.ts` covers template copying/independence, validation, phase locking, gate transitions, weighted progress, template permissions, and idempotent persistence migration. `tests/stage-types.test.ts` covers stage type validation, Form/SIMPRO completion rules, form permissions/badge/workload separation, checklist migration, and Pembayaran validation. `tests/journey-revenue.test.ts` covers Media/BOD access, working links, per-phase composition, MO/business-unit math, dashboard aggregation, and migration idempotency. `tests/flexible-journey.test.ts` covers template-optional creation, pending Prospek start, manual step validation, winning-gate placement, active-phase add/delete, prepared tasks, phase completion, Closing defaults, and the legacy Umum bridge. `tests/form-assignment.test.ts` and `tests/simpro-forms.test.ts` cover role-appropriate assignment, notifications, Media BAST visibility, and Forms badge totals. See `Docs/Stage-Types.md` and `Docs/Revenue-Tracking.md`.
