# Tasks

## 1. Data model, templates, and migration

- [x] 1.1 Extend project/step/task types for creation mode, start and phase-completion state, step Manager PIC, task Link Pekerjaan, and Prospek header snapshots; verify TypeScript compilation and existing type-dependent tests.
- [x] 1.2 Increment persisted-state version and migrate `closing` to `finance`, mark existing projects legacy, and preserve Prospek steps/groups/history; add idempotence and data-preservation assertions to `tests/templates.test.ts` and verify they pass.
- [x] 1.3 Add a compatible Umum Eksekusi template, publish post-Prospek KOL/Event seed versions, and reject incompatible templates for new projects without rewriting custom/legacy definitions; add template validation/copy tests and verify `npm test -- tests/templates.test.ts`.
- [x] 1.4 Update `Docs/PRD-Alur-CRM-Baru.md`, `Docs/Stage-Types.md`, and `Docs/Prospek.md` for Finance naming, the new three-phase lifecycle, and legacy/template compatibility; verify no new-flow requirement still calls Finance â€œClosingâ€.

## 2. Project lifecycle domain and store

- [x] 2.1 Create template/manual projects unstarted and record creation mode; add store tests proving no step activates until startup and verify the creation events distinguish both modes.
- [x] 2.2 Implement initial-phase start, template Running bypass, Planning-step skip audit, required Manager PIC activation, and single-active-step enforcement; add domain/store tests for Planning, Running, and rejected Finance start.
- [x] 2.3 Implement pending-step add/edit/delete/reorder and started/completed-step edit restrictions for owning PM/Admin; test role denials, phase-order guards, Manager PIC changes, and before/after audit events.
- [x] 2.4 Implement step/phase completion gates, irreversible Planning â†’ Running â†’ Finance advancement, non-empty Finance, and mode-specific progress; test empty/incomplete steps, Finance completion, manual counts, template percentages, and preserved legacy weighted progress.

## 3. SIMPRO Kanban domain and store

- [x] 3.1 Enforce the six allowed Kanban transitions at the mutation boundary, require an absolute HTTP(S) Link Pekerjaan before In Progress, retain/update it after Need Revision, and require a comment for Need Revision; add transition/link tests and verify `npm test -- tests/domain.test.ts`.
- [x] 3.2 Enforce Manager/Admin assignment across all PM projects independent of Manager PIC, allow only the assigned operational worker to work a card, and restrict cancellation to owner PM/Admin in Backlog/To Do; add role/status tests for allowed and rejected actions.
- [x] 3.3 Record card creation, assignment, status, link, review, and cancellation events with relevant before/after data; add event/history tests and verify `npm test -- tests/events.test.ts`.
- [x] 3.4 Enforce Assignee-only assigned SIMPRO access and Finance-only assigned CRM Finance form access for new projects; add visibility/route-guard tests and update `Docs/Stage-Types.md` to document the role boundary.

## 4. Project and Kanban UI

- [x] 4.1 Update project creation UI for Template/Manual choice, compatible-template filtering, NEW Project styling, and owner/Admin startup prompt with a persistent alternate start action; verify both create modes and dismissed-prompt restart in a browser role walkthrough.
- [x] 4.2 Update project detail/stepper for phase selection, Dilewati history navigation, step create/edit/reorder controls, Manager PIC, phase completion, and manual/template progress presentation; verify role restrictions and each phase transition in a browser walkthrough.
- [x] 4.3 Update Finance step creation and project header/Finance panels to show BAST PIC, Finance Invoice/Pembayaran forms, inherited contract and Termine references, and inherited RAB/Quotation without re-entry; verify Finance has no Kanban board and forms respect role permissions.
- [x] 4.4 Update SIMPRO board/task dialogs to capture and display Link Pekerjaan, show it in all required columns/roles, retain it after revision, require a revision comment, and offer cancellation only for Backlog/To Do; verify with an Assignee/Manager/PM/Admin browser walkthrough.

## 5. Prospek conversion and Projects discovery

- [x] 5.1 Update winning Pitching conversion to snapshot Prospek PIC/client/period/pagu and existing RAB/Quotation/contract data, create a three-phase unstarted child, and preserve idempotence/Group membership; add conversion and legacy tests and verify `npm test -- tests/prospek.test.ts`.
- [x] 5.2 Show Prospek children as standalone cards and Group accordion members with a linked attribution, searchable parent name, and â€œBerasal dari Prospekâ€ filter; keep direct projects unlabelled and manual Groups unchanged, then verify card/group/search/filter regression tests.

## 6. Integration verification

- [x] 6.1 Add or update end-to-end domain scenarios for the complete create â†’ start â†’ Kanban â†’ phase completion â†’ Finance â†’ project completion journey, and verify rejection paths for invalid links, empty steps, unauthorized edits, and skipped Finance.
- [x] 6.2 Run `npm test`, `npm run lint`, and `npm run build`; verify existing Prospek, Groups, legacy project progress, template migration, and Finance behavior all pass without manual localStorage migration.

