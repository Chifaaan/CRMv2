# AGENTS.md

## Current state

Prototype monolith **CRM × SIMPRO** is implemented at the repository root.

- Product source of truth: `Docs/PRD.md` + addendum `Docs/PRD-Alur-CRM-Baru.md`
- Delivery scope: `Docs/MVP.md`
- Visual/code source of truth: `src` (primary), `Docs/References/*.png` (secondary)
- Prototype data lives in the browser: Zustand + `localStorage` for app state, IndexedDB for uploaded files. No backend, auth, or real SIMPRO integration.
- The CRM has no Prospek umbrella module or Pitching stage. Projects are created directly and run Planning → Running → Finance. Legacy projects may still contain Prospek-phase steps and are kept readable.
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
- Template model and seed templates (Umum, KOL Campaign, Event Program + three execution templates): `src/lib/prototype/templates.ts`
- Project audit trail (`project_events`, backfill, read/pagination): `src/lib/prototype/events.ts`
- Step history UI: `src/components/prototype/crm/project-history.tsx`
- Seed/demo data: `src/lib/prototype/seed.ts`
- Zustand store + persistence + persist migration: `src/lib/prototype/store.ts`
- IndexedDB file storage: `src/lib/prototype/files.ts`
- Excel import/templates: `src/lib/prototype/excel.ts`
- Prototype UI: `src/components/prototype/`
- Routes:
  - CRM: `/crm/projects`, `/crm/projects/new`, `/crm/projects/[id]`, `/crm/projects/[id]/forms/[type]`, `/crm/umbrella-projects`, `/crm/umbrella-projects/[id]`, `/crm/templates`, `/crm/workload`
  - Unified: `/dashboard` (single workspace dashboard), `/my-tasks`, `/forms`
  - Business: `/business`, `/business/rab`, `/business/mo`
  - SIMPRO: `/projects`, `/projects/[id]/*`, `/forms/finance/[projectId]/[type]`
  - `/crm` redirects to `/dashboard`; `/crm/groups` redirects to `/crm/umbrella-projects`

## Frontend baseline

The app is Next.js 16 + React 18 + Tailwind 4 + shadcn `base-nova`. Reuse its shell, UI primitives, and visual tokens; do not create a second sidebar/topbar/design system.

Prototype adaptations already made:

- `src/proxy.ts` is a pass-through; auth is replaced by the local role switcher.
- `(main)/layout.tsx` renders `PrototypeShell`, not the server-auth shell.
- The SIMPRO board is configured to exactly six statuses. Do **not** restore `on_check`, `ready_to_deploy`, or the parking lot (`on_hold`, `cancelled`) from the legacy `board-constants.ts`.
- Legacy nav items and project tabs are hidden but their old route files still exist.
- `/api` rewrites still point at the old backend, but the prototype does not call them.

## Product rules that are easy to get wrong

- New projects use Planning → Running → Finance. Fase Prospek bersifat opsional pada template tetapi **tidak** ditambahkan default saat membuat proyek: pengguna menekan `Tambah tahapan Prospek` untuk menyertakannya (beserta RAB + Decision). Proyek yang menyertakan Prospek memulai journey dari Prospek sebelum Planning. Step Prospek dari proyek legacy tetap tersimpan sebagai riwayat.
- Project creation supports template mode (copy stages from an active template) and manual mode. Prospek is opt-in in both modes. Manual mode automatically creates the two mandatory Finance steps (BAST and Invoice); other stages/steps are built inside the project and managed in Journey Management. Every step is labelled `Wajib` or `Opsional` in the creation preview, and the summary lists both counts. The creator may set an optional project Manager; template edits never change an existing project.
- A project is unstarted until its owning PM/Admin picks an initial phase and sets a Manager PIC. Proyek dengan fase Prospek hanya dapat dimulai dari Prospek; proyek tanpa Prospek memilih Planning atau Running. Finance tidak pernah menjadi fase awal. Until then cards show `NEW Project`.
- CRM project detail has six workspace tabs: Overview, Journey Management, Board, Backlog, Forms, and Media Order. Admin/Manager/PM see all tabs; Finance sees Overview, Journey Management, Forms, and Media Order; Assignee sees only Overview, Board, and Backlog with cards filtered to them. Overview contains step completion, task distribution, progress, cumulative RAB/MO for commercial roles, and activity history; Journey Management manages steps and phase completion. Tambah/Edit Step memakai dialog (nama, fase, jenis, form/gerbang, Manager PIC, deskripsi); tidak ada kartu `Pilih Step`. Daftar `Kelola fase` mengikuti fase yang dipilih pada stepper header (Planning menampilkan step Planning, Running menampilkan step Running). Stepper header menampilkan fase Prospek bila proyek menyertakannya.
- Only one step is active at a time. Steps carry a Manager PIC, and activation requires one. Pending steps can be added, edited, removed, or reordered while the project is active; active/completed steps only allow name, Manager PIC, and description changes.
- Fase yang dipakai memiliki step wajib: Prospek → RAB dan Decision Win / Loss (gerbang persetujuan klien); Finance → BAST dan Invoice. Step wajib dibuat otomatis, tidak dapat dihapus atau diubah jenisnya saat penyusunan template dan pembuatan proyek, dan di Journey Management diberi label `Wajib`. Setelah proyek berjalan, step boleh dihapus lewat Journey Management (auto-create hanya berlaku saat fase masih kosong). Template legacy Umum dikecualikan dari aturan wajib ini.
- A SIMPRO step completes only when every remaining non-cancelled card is Completed and at least one card exists. Legacy steps may use an audited "no work" confirmation.
- A phase completes only when it is the current phase, has at least one step, and all its steps are Completed or skipped. Finance cannot be skipped, and completing Finance completes the project.
- Entering Finance after Running auto-creates BAST and Invoice steps when missing; PM/Admin may still add other Finance steps and existing BAST/Invoice are not duplicated.
- Template "Umum" is `legacy` and must keep the old six stages: Pitching → Survey → RAB → Running → BAST ∥ Invoice. New templates require one stage per phase and exactly one winning gate.
- Journey % is weighted over materialized stages for template/legacy projects; manual projects report a completed step count instead of a percentage.
- Four stage kinds only: **Form Keuangan, Form, Gerbang, SIMPRO**. Checklist is removed; migrated checklist tasks become a checklist field in a Form template.
- Form stages have one form template and many entries. Entries are created by PM, assigned by Manager/Admin (PM may assign only to the project Manager), filled by the assignee, and reviewed by PM. All non-cancelled entries must be approved; at least one entry is required unless "no work" is explicitly confirmed and audited.
- SIMPRO stages use Kanban cards. Tasks carry `stageId`; the board only exposes active and completed stages (default active), shows the stage on cards, and completed stages are read-only. Pending stages are not selectable or reachable by deep link.
- Project detail Board shows every card of the project across active and completed stages; the stage selector is a filter (`Semua tahap` by default) grouped into Berjalan/Selesai. Cards from completed stages are read-only while active-stage cards remain movable. New cards are created on the active stage, or on the selected stage when it is active.
- Cards move Backlog → To Do → In Progress → Awaiting Approval → Completed, with Need Revision as the rework state. Manager/Admin allocate backlog work to Assignee, Manager, or Media; PM cannot assign cards on new-lifecycle projects.
- Moving a card to In Progress (from To Do or Need Revision) requires a non-empty `Link Pekerjaan` stored on the card and recorded in the audit trail. The link is opaque text: any non-empty value is accepted, there is no URL validation, and the card offers `Simpan`.
- Every task card shows its stage. Task cards exist only on SIMPRO stages; Form entries never appear in My Tasks.
- Manager and Assignee can both be operational assignees. A Manager who is the assignee can work the card/form but cannot approve or reject it; review stays with the owning PM or Admin.
- Media is operational: it can be assigned Kanban cards and BAST forms, sees only its own cards, cannot edit RAB/MO/Invoice/Pembayaran, and has no project browsing. BOD only sees the Business submenu.
- Default landing: Assignee and Media → My Tasks, BOD → Business, Admin/Manager/PM/Finance → `/dashboard`.
- Form Keuangan supports RAB, Media Order, BAST, Invoice, and Pembayaran. These forms open as full pages under `/crm/projects/[id]/forms/[type]`; Media opens an assigned BAST from SIMPRO Forms at `/forms/finance/[projectId]/[type]`. Detail Proyek keeps the summary and review inline.
- Media Order is opt-in: `mo` is a Form Keuangan category, usually added as an optional Prospek step. One project has one `mo` form shell plus many MO documents. MO approval requires at least one non-cancelled document, and MO appears in Forms and the project Media Order tab.
- Manager/Admin dapat meng-assign Form entri maupun Form Keuangan yang belum di-assign dari menu Forms atau dari halaman form yang dibuka. Kandidat Form Keuangan: RAB/Invoice/Pembayaran/MO hanya Finance; BAST boleh Finance atau Media. Manager melihat Form Keuangan (termasuk yang belum di-assign) pada proyek yang dapat diaksesnya.
- BAST and Invoice are parallel finance steps (`parallelGroup: "finance"`); each is 0.5 weight.
- Survey form lives in SIMPRO and keeps the legacy Survey screen (wrapped as a Form stage); RAB and finance forms live in CRM.
- A winning gate only exists for legacy projects: approving it locks the RAB baseline and opens Planning; rejecting sets `lost` with a required reason. Batal can be set in any phase.
- Lost and cancelled projects stay complete with history, are read-only, and are excluded from workload and umbrella completion denominators.
- Umbrella Projects replace Groups in all user-facing copy. Each umbrella has a detail page with progress, related projects, cumulative RAB/MO, and per-project breakdown. Project and umbrella cards show cumulative RAB/MO only for Admin/Manager/PM/Finance.
- Business is one submenu: `/business` dashboard, `/business/rab`, and `/business/mo`. Admin, Manager, PM, Finance, and BOD may open it read-only; PM sees only their projects. RAB/MO editing happens on project surfaces.
- Only Admin and PM manage templates; that right is separate from project access.
- Workload counts active cards and active forms separately for Assignees, Managers, and Media with active work; forms are never merged into the card count.
- The Forms badge counts forms this user still has to fill (Assigned, Draft, Need Revision) across Form entries and finance forms; the PM review queue is not part of the badge.
- PM does not reject BAST/Invoice; Finance edits until PM closes the project.
- Task board access for an Assignee or Media user is filtered to tasks assigned to them.
- `/dashboard` is the single workspace dashboard for Admin/Manager/PM/Finance/Assignee/Media. It merges project/task summaries, Finance work, journey phases, approval queues, recent projects, and deadlines; Assignee and Media are scoped to their assigned work. BOD is redirected to Business.
- My Tasks is one aggregated board of every card assigned to the user across projects; each card shows its project and stage. There are no per-project accordions or List/Swimlane layouts, and form entries never appear there.
- Every RAB and MO item must map to a business unit (Makerspace, Makerspace Video, Spektrum) to count commercially. Unmapped items stay saved but are excluded from dashboard totals.
- Media Orders live in the Media Order tab and the `mo` Finance form, are managed by the owning PM, Manager, Finance, or Admin, and roll up to the project's Umbrella Project in Business. MO and contract Termine do not create other Finance forms automatically.
- Assignees can open the Projects list and project detail for projects where they hold a card or form, limited to Overview, Board, and Backlog.

## Verification

`npm run build`, `npm run lint`, and `npm test` pass. The domain tests cover gates, progress, visibility, task transitions, workload, Excel validation, and role landing. `tests/templates.test.ts` covers template copying/independence, validation, structure lock, phases, weighted progress, template permissions, and idempotent persistence migration. `tests/stage-types.test.ts` covers stage type validation, Form/SIMPRO completion rules, form permissions/badge/workload separation, checklist migration, and Pembayaran validation. `tests/lifecycle.test.ts` covers template/manual creation, pending Prospek start, manual step validation, phase add/delete, prepared tasks, phase completion, Finance defaults, and progress modes. `tests/manager-assignment.test.ts` covers project Manager, step Manager PIC, and PM/Manager assignment scope. `tests/persistence-port.test.ts` covers the `main` → ported-state migration (closing→finance, legacy phase handling, work-link mapping, media orders, role/template backfill, backup, idempotency). `tests/business-revenue.test.ts` covers MO math and audit, business-unit aggregation, dashboard access, Media/BOD roles, Media BAST rights, and the Forms badge. `tests/mandatory-steps.test.ts` covers mandatory step specs, template completion/validation, Prospek project creation/start, phase-correct step creation, and non-duplication. `tests/list-pagination.test.ts` covers pagination defaults. `tests/unified-workspace.test.ts` covers role landing/access, tab scope, MO form backfill and approval guard, Umbrella/Project totals, Business row scoping, and My Tasks aggregation. See `Docs/Stage-Types.md` and `Docs/Revenue-Tracking.md`.
