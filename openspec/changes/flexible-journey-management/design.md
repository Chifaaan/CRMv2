# Design

## Context

See `proposal.md` for motivation and `specs/` for required behaviour.

Current constraints found in the code:

- `createProject` in `store.ts` currently falls back to the Umum template, copies only Prospek stages, and marks `phaseStates.prospek` as started and locked immediately. The first copied step is activated by `stagesForProject`.
- `setPhaseStructure` and `startPhase` still require a template. `startPhase` rejects `prospek`, and `PhaseComposer` in `project-detail.tsx` only offers "Susun dari template" for Planning and Running.
- `canEditPhaseStructure(project, phase)` is already the authority for phase editing, but it relies on `phaseStates` and the legacy `structureLocked` flag. Closing has no special case.
- Closing stages are copied from the template only when Running starts. Umum has no winning gate, so a newly created Umum project has no gate and no path into Running through the current UI.
- Form assignment exists in CRM (`AssignControl`, `FormEntryPage`, `StepFormPanel`), but `assignForm` has no store-level permission guard and only offers Finance candidates. `canSeeFinanceFormInSimpro` excludes Media, and `FinanceFormPage` is CRM-only, so an assigned Media BAST cannot be opened from SIMPRO Forms.
- Forms already have a lifecycle and notification helper (`notify`), and the shell already combines `formsNeedingAction` with `simproFinanceFormsNeedingAction` for the Forms badge.

## Goals / Non-Goals

**Goals:**

- Make templates optional pre-fill input for Prospek while keeping all existing stage kinds, form entries, SIMPRO tasks, gates, and finance forms.
- Reuse `ProjectStep` and `phaseStates` instead of adding a parallel journey model.
- Keep the journey editable before it starts, then lock it with an auditable `startPhase` transition.
- Make Closing rule-driven and guaranteed to contain BAST and Invoice.
- Let Manager/Admin assign forms from either CRM or the opened form, and make SIMPRO Forms the assignee's inbox.
- Preserve legacy Umum progress, existing persisted projects, and all role/module boundaries.

**Non-Goals:**

- A backend, template versioning service, or multi-user collaboration.
- A visual drag-and-drop builder; reorder buttons are enough for the prototype.
- Editing a running or completed phase.
- Editing Closing stages by hand.
- Changing the FormEntry lifecycle or the SIMPRO task board model.
- Allowing Finance to fill operational Form entries or Managers to review work.

## Decisions

### D1: Template becomes optional pre-fill, not a project requirement

`CreateProjectInput` keeps optional `templateId` and `stages`, but `createProject` no longer falls back to Umum.

- If `templateId` is present, it must resolve to a template; otherwise creation fails.
- If `stages` is omitted and a template is selected, use that template's Prospek stages as the initial draft.
- If `stages` is present, use only its Prospek entries; the template is recorded for traceability but does not constrain later edits.
- If no template and no stages are supplied, create the project with an empty Prospek phase.
- The project records `templateId`/`templateVersion` only when a template was used.

`stagesForProject` is refactored into a phase-local materializer that receives explicit stage definitions and an `activateFirst` flag. Creation passes `activateFirst: false`, so every new Prospek step is `pending`.

*Alternative considered:* keep the Umum fallback and add a "manual" pseudo-template. Rejected because it hides the empty state and makes `templateId` lie about the project's structure.

### D2: Prospek starts explicitly and is the only phase that starts at creation

New projects write `phaseStates.prospek = { authoredAt: createdAt }` and nothing else. `startedAt` and `lockedAt` are absent, so `canEditPhaseStructure(project, "prospek")` is true for a new project.

Add a domain-level start check and extend `startPhase` to accept `prospek`:

1. actor must own/manage the project;
2. Prospek must have at least one pending step;
3. non-legacy Prospek must have exactly one client-approval gate and it must be the last step;
4. activate the first pending step or the first parallel group;
5. set `startedAt`/`lockedAt`, keep `authoredAt`, and write `phase.started` plus a journey-start audit entry.

`canEditPhaseStructure` gets an explicit `phase === "closing"` rejection and continues to reject projects with `structureLocked`, lost/cancelled/done lifecycle, or a started phase. Existing projects already carry `startedAt`, so their Prospek remains locked without migration.

`allStepsDone` in project detail gains a non-empty guard so an empty journey cannot be marked complete.

*Alternative considered:* create the first step as active and treat "started" as the first form submission. Rejected because the phase would already be structurally locked while the PM is still building it, and the start event would be implicit.

### D3: Journey Management edits an unlocked phase draft and saves through one store action

Add `crm/journey-management.tsx` with a phase selector for Prospek, Planning, Running, and Closing.

- For an editable phase, the component keeps a local `TemplateStage[]` draft with add, edit, reorder, and delete controls.
- "Simpan" calls `setPhaseStructure(projectId, phase, draft)`.
- "Mulai Prospek" / "Mulai fase" saves first when needed, then calls `startPhase`.
- "Isi dari template" is shown only when the project has a template. It copies the current template's stages for the selected phase; applying it to a non-empty draft requires confirmation.
- Closing is rendered as rule-driven: existing steps are listed read-only and no edit controls are shown.
- Non-managers see the list read-only.
- The old `PhaseComposer` is removed from `project-detail.tsx`; its "Susun dari template" and "Mulai fase" actions move into Journey Management.

`setPhaseStructure` becomes template-independent. It validates the proposed phase, replaces only that phase's steps, preserves order offsets from `PHASE_ORDER`, and records `phase.composed` with the before/after step names. It rejects edits when the phase is locked, when the input contains another phase, or when an existing step in the phase has task or form-entry activity.

Using a single save action keeps audit events readable and avoids writing an event on every keystroke. The create page keeps its own local draft and submits once.

*Alternative considered:* individual store actions per add/move/delete. Rejected for now because it multiplies audit and state-repair cases without improving the prototype's UX.

### D4: Manual step validation lives in domain helpers, not the store

Add pure helpers in `domain.ts`:

- `journeyPhaseErrors(project, phase, proposedStages, allSteps)` for structural validation;
- `journeyStartErrors(project, steps, template?)` for the start gate rules;
- `createManualStage(phase, order)` in a small UI helper for default stage shapes.

Rules enforced for both creation and Journey Management:

- names are non-empty and unique within the phase;
- weights are positive;
- Form steps need a form template title and default fields;
- Gerbang steps need a gate kind;
- Form Keuangan steps need RAB, BAST, Invoice, or Pembayaran, and a finance kind may exist only once in the project;
- client-approval gates may appear only in Prospek, at most one;
- non-legacy start requires that single client-approval gate as the final Prospek step;
- a SIMPRO step may start with no tasks; the PM creates cards on the board.

The editor can save a draft that is not yet startable (for example, a Prospek without a gate). The start action surfaces the remaining errors instead of silently blocking.

*Alternative considered:* reuse `validateTemplateStages`. Rejected because it requires one stage per phase and exactly one gate for the whole template, which is the opposite of template-as-recommendation for a project.

### D5: Closing is materialized by rule and always includes BAST and Invoice

Add `closingStagesFor(template?)` in `templates.ts`:

- start with the template's Closing stages when they exist, otherwise with system defaults;
- system defaults are BAST (0.5, `parallelGroup: "finance"`), Invoice (0.5, `parallelGroup: "finance"`), and Pembayaran (1);
- remove duplicate BAST/Invoice stages and append a system default if either is missing;
- force BAST/Invoice weights to 0.5 and the finance parallel group.

`startPhase(running)` appends Closing idempotently and records `phaseStates.closing.authoredAt`. `completeStep` keeps its existing behavior of auto-starting Closing when the last Running step completes. Closing is never accepted by `setPhaseStructure` or `startPhase` as a manual phase.

This preserves Umum's 4 full stages + 0.5 + 0.5 progress formula and satisfies the rule that finance steps always include BAST and Invoice.

*Alternative considered:* require every template to define Closing. Rejected because projects may have no template and the system still needs finance stages.

### D6: Legacy Umum gets a gate-free bridge into Running

Legacy is detected from the project's template (`legacy: true` or the Umum template id).

- `journeyStartErrors` exempts legacy Prospek from the winning-gate requirement.
- When the final Prospek step of a legacy project completes, `completeStep` initializes empty `phaseStates.planning` and `phaseStates.running` entries if they do not exist. This opens Journey Management for Running without auto-activating a step.
- `startPhase(running)` already allows a legacy project with no Planning steps; keep that exception and remove its template dependency.
- The PM can use "Isi dari template" for Running and Closing is appended by rule.

Existing legacy projects with their own phase states and started steps are untouched because the initialization only runs when the phase state is missing.

*Alternative considered:* auto-materialize Running and Closing from the Umum template when RAB completes. Rejected because it removes the PM's explicit start decision and conflicts with the new compose-then-start flow.

### D7: Form assignment uses one eligibility matrix and one notification path

Add domain helpers:

- `assignableRolesForForm(formType)`: survey → Assignee; BAST → Finance or Media; RAB/Invoice/Pembayaran → Finance;
- `canAssignFormTo(form, user)`;
- `canOpenFinanceForm(state, user, form)`: Admin, owning PM, or an eligible assigned user.

`assignForm` gains actor, project, target, and active-project guards. It sets the assignee/status, writes the audit event, and creates an in-app notification whose link is the form's open page. `assignFormEntry` gains the matching target guard (Assignee/Media) and keeps its notification.

`StepFormPanel` already renders assignment controls when the form is unassigned; it now receives the eligibility list for the current form type. `FormEntryPage` keeps its Manager/Admin assignment section. Both paths call the same store actions, so assigning from CRM or from the opened form produces the same notification and audit result.

*Alternative considered:* separate assignment endpoints/pages for CRM and SIMPRO. Rejected because it duplicates permission logic.

### D8: SIMPRO Forms is the assignee inbox, with a SIMPRO-side finance form route

Update `canSeeFinanceFormInSimpro`:

- Admin and owning PM keep oversight visibility;
- Finance sees assigned RAB/BAST/Invoice/Pembayaran;
- Media sees an assigned BAST;
- other roles do not see finance forms.

Add `/forms/finance/[projectId]/[type]` under the `(main)` route group. It renders the existing `FinanceFormPage` with a SIMPRO back link and uses `canOpenFinanceForm` instead of the current CRM-only hard deny. The CRM route remains for project detail. `SimproFormsPage` sends finance rows to the SIMPRO route, so Media never needs CRM access.

The Forms badge stays the sum of `formsNeedingAction` and `simproFinanceFormsNeedingAction`; the latter now counts a Media BAST because visibility accepts it. No new notification component is needed: the shell already renders `store.notifications` and unread counts.

*Alternative considered:* render finance forms in a dialog inside `/forms`. Rejected because RAB/BAST tables are large and the current `StepFormPanel` expects a page.

## Risks / Trade-offs

- **Strict start validation can frustrate a PM who wants to start work before adding a gate** → show the exact missing requirement in Journey Management and offer template fill; a draft can still be saved and revisited.
- **Empty projects can look broken** → show an onboarding state in Journey Management and keep the "complete project" action disabled until at least one step exists.
- **Replacing a phase draft could discard pending work** → `setPhaseStructure` rejects phases with any task or entry activity; only pending, unstarted steps are replaceable.
- **Manual finance steps can collide with `formFor`'s single-form lookup** → enforce one finance kind per project in the domain helper and store.
- **Media BAST uses a CRM-styled component under `/forms`** → the shell already gates CRM navigation by role; pass an explicit SIMPRO back link and keep assignment/review controls role-scoped.
- **Legacy Umum now depends on template fill for Running in new projects** → the six-stage template remains the recommendation; tests cover the gate-free start and the bridge into Running.
- **Existing tests assume the first Prospek step is active immediately** → update test helpers to call `startPhase(projectId, "prospek")` before creating entries or completing steps.

## Migration Plan

- No new persisted fields are required. `templateId`, `templateVersion`, and `phaseStates` already exist.
- Existing projects keep their `phaseStates` with `startedAt`/`lockedAt`, so they remain locked where they are. New behavior applies only to projects created after the change.
- No `seedVersion` bump is needed because seed templates and seed projects are not structurally changed. If seed data changes during implementation, bump `seedVersion` and let the existing reset path handle it.
- Rollback is code-only for this prototype. Persisted data written by the new flow (project without `templateId`, pending Prospek steps) remains readable, but old code would not be able to compose those projects; rollback is therefore last-resort only.
- Update `AGENTS.md`, `Docs/PRD.md`/`Docs/PRD-Alur-CRM-Baru.md`, and `Docs/Stage-Types.md` after implementation so the living documentation matches the new rules.
