# Proposal

## Why

The prototype still routes every Kanban card through Manager/Admin allocation, blocks PMs from completing a submitted card's revision, and limits finance-form assignment to Finance (plus Media for BAST only). Journey Management also gets stuck when the last step of a phase completes: the next phase is not reachable without an active step, and `Selesaikan Tahap` stays clickable even when its criteria are unmet. A reviewer field is missing, so only the owning PM can approve form work.

## What Changes

- Media becomes a valid assignee for every finance form (RAB, Media Order, BAST, Invoice, Pembayaran) and may fill and submit a form assigned to it. RAB baseline locking and approval rules are unchanged. Media still cannot edit forms it is not assigned.
- Cards gain a task-level **Manager Tugas** field. The flow becomes: PM creates a Backlog card → PM selects a Manager Tugas → the card moves to To Do with no assignee yet and a `Pilih Assignee` input appears → the chosen Manager (or Admin) assigns an Assignee, Manager, or Media user, including themselves.
- A Manager Tugas can assign the card only while it is unassigned or still in To Do; once work starts, reassignment follows the existing rules.
- A PM/Admin may move a card to any Kanban status once it has a Manager Tugas or an Assignee. `Pindahkan` no longer requires an Assignee when a Manager Tugas is set.
- Fix the PM revision bug: the review comment is validated and persisted when a PM/Admin sends an Awaiting Approval card to Need Revision.
- Complete the phase hand-off: when every step of a phase is finished, the next phase becomes reachable and its first step can be activated, even when activation metadata was missed earlier.
- `Selesaikan Tahap` is disabled with a visible reason until the active step's completion criteria are met, and the action reports the real result instead of always toasting success.
- Form entries and finance forms gain an optional **Reviewer** selected from PM, Manager, or Finance users. The selected reviewer may approve or request revision in addition to Admin and the owning PM; Assignee and Media are never reviewer candidates.
- Reviewer visibility is granted where needed so a non-PM reviewer can open the submitted form from Forms.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `work-assignment`: media finance-form assignment and edit rights, task-level Manager Tugas, Manager-led assignee selection, PM card movement once assigned, and reviewer roles.
- `simpro-kanban-delivery`: card lifecycle after Manager Tugas, PM movement across statuses, and the PM revision transition fix.
- `project-journey`: phase hand-off after all steps finish and the disabled state of `Selesaikan Tahap`.
- `forms-inbox`: reviewer selection and reviewer review authority on form entries and finance forms.

## Impact

- Domain rules: `src/lib/prototype/domain.ts` (`taskTransition`, assignee candidates, `canAssignKanbanTask`, `canEditForm`, `canReviewForm`, `canReviewFormEntry`, `canViewProject`, new reviewer helpers).
- Types and persistence: `src/lib/prototype/types.ts` (`Task.managerId`, `FormEntry.reviewerId`, `StepForm.reviewerId`), `src/lib/prototype/store.ts` (new/updated actions for Manager Tugas, reviewer, assignee assignment, phase activation).
- UI: `src/components/prototype/dialogs.tsx`, `simpro/board.tsx`, `crm/project-detail.tsx`, `crm/finance-form-page.tsx`, `crm/step-form-panel.tsx`, `crm/media-order-form.tsx`, `simpro/form-entry-page.tsx`, `simpro/forms-page.tsx`.
- Seed/demo data and tests: `src/lib/prototype/seed.ts`, `tests/manager-assignment.test.ts`, `tests/stage-types.test.ts`, `tests/business-revenue.test.ts`, `tests/lifecycle.test.ts`, plus new coverage for the Manager Tugas flow, reviewer authority, phase hand-off, and disabled completion button.
