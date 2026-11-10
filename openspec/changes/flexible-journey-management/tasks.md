# Tasks

## 1. Journey domain and store

- [x] 1.1 Add pure journey helpers in `src/lib/prototype/domain.ts` for phase validation, manual stage defaults, and start errors; verify `tests/flexible-journey.test.ts` covers missing gate, duplicate gate, non-final gate, duplicate finance kind, and phase mismatch.
- [x] 1.2 Add `closingStagesFor(template?)` in `src/lib/prototype/templates.ts` with system defaults and guaranteed BAST/Invoice; verify tests cover a template with Closing stages, a template missing BAST, and no template.
- [x] 1.3 Refactor step materialization out of template lookup and update `createProject` to accept an optional template, empty Prospek, and pending steps; verify tests assert zero-step creation, pending template steps, optional `templateId`, and template-edit independence.
- [x] 1.4 Extend `startPhase` to start Prospek, enforce journey start errors, activate the first step or parallel group, record the start, and lock the phase; verify tests assert empty Prospek is rejected, a valid start activates the first step, Prospek locks, and legacy Umum is exempt from the gate.
- [x] 1.5 Make `setPhaseStructure` template-independent, validate the proposed phase, reject Closing and locked phases, and audit before/after steps; verify tests assert manual Planning/Running composition, rejection after start, and rejection of a step from another phase.
- [x] 1.6 Preserve legacy Umum behaviour and append Closing idempotently when Running starts; verify tests assert RAB completion opens Planning/Running for composition, Running start appends BAST/Invoice/Pembayaran, a second start does not duplicate them, and a template missing BAST/Invoice gets system defaults.
- [x] 1.7 Guard the empty journey in project detail by requiring at least one step before “Semua tahap selesai”; verify a test asserts an empty project cannot be completed and journey progress stays 0.

## 2. Create-project flow

- [x] 2.1 Rework `src/components/prototype/crm/project-create.tsx` to start with an empty Prospek phase, offer optional template fill, support manual `+ Tahap`, and allow reorder/delete; verify `npm run build` and inspect `/crm/projects/new` with zero steps, template fill, and manual steps.
- [x] 2.2 Allow zero-step submission and update draft persistence to a new draft key that restores empty stages safely; verify `npm run build` and confirm an old incompatible draft is not restored.

## 3. Journey Management UI

- [x] 3.1 Add `src/components/prototype/crm/journey-management.tsx` with phase selection, local step draft, add/edit/reorder/delete, template fill, save, and start actions; verify `npm run build` and `npm run lint`.
- [x] 3.2 Replace `PhaseComposer` in `project-detail.tsx` with Journey Management while keeping the stepper and step panels; verify the project detail shows empty-Prospek onboarding, starts the journey, shows the locked Prospek state, and allows future-phase composition.
- [x] 3.3 Add read-only states for locked phases, rule-driven Closing, non-manager users, and empty phases; verify `tests/flexible-journey.test.ts` covers Closing and started-phase rejection and `npm run build` passes.

## 4. Form assignment and SIMPRO Forms

- [x] 4.1 Add form assignee eligibility and finance-form visibility helpers in `src/lib/prototype/domain.ts` and update `src/lib/prototype/simpro-forms.ts`; verify `tests/simpro-forms.test.ts` covers Media BAST visibility, unchanged Finance visibility, PM/Admin oversight, and hidden RAB for Media.
- [x] 4.2 Add actor/target guards to `assignForm` and `assignFormEntry` in `store.ts`, and make assignment notifications link to the opened form; verify tests cover Manager assignment, PM rejection, BAST-to-Media success, RAB-to-Media rejection, and unread assignment notifications.
- [x] 4.3 Update `StepFormPanel` assignment candidates for BAST and keep `FormEntryPage` assignment working from the opened form; verify `npm run build` and a manual check that assignment works from both CRM and the opened form.
- [x] 4.4 Add the `/forms/finance/[projectId]/[type]` route and update `FinanceFormPage` access/back-link behavior plus the SIMPRO Forms row links; verify a Media-assigned BAST opens and submits from `/forms`, and `npm run build` passes.
- [x] 4.5 Confirm the Forms badge counts assigned entries and finance forms, including Media BAST; verify `tests/simpro-forms.test.ts` and `tests/stage-types.test.ts` cover the badge totals.

## 5. Integration and documentation

- [x] 5.1 Update existing test helpers in `tests/templates.test.ts`, `tests/stage-types.test.ts`, and `tests/journey-revenue.test.ts` to start Prospek before creating entries or completing steps; verify `npm test` passes.
- [x] 5.2 Update `AGENTS.md`, `Docs/PRD.md`, `Docs/PRD-Alur-CRM-Baru.md`, and `Docs/Stage-Types.md` for optional templates, Journey Management, deferred Prospek start, form assignment, and SIMPRO Forms delivery; verify the documented flows match the implemented routes and actions.
- [x] 5.3 Run `npm run build`, `npm run lint`, and `npm test`, then manually smoke-test: create an empty project, add manual steps, start Prospek, pass a gate, compose Planning/Running, start Running, open Closing, assign a BAST to Media, and open it from SIMPRO Forms.

## Workflow follow-up

- Run the apply workflow for this change.
- Archive the change after implementation and verification are complete.
