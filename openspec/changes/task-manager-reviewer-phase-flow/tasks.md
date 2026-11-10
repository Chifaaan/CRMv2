# Tasks

## 1. Types and domain rules

- [x] 1.1 Add optional `managerId` to `Task`, optional `reviewerId` to `FormEntry` and `StepForm`, and allow `prospek` in `Project.phaseCompletedAt`; verify with `npm run build` that no type errors remain.
- [x] 1.2 Add `reviewerCandidates(state)` (PM, Manager, Finance only) and a task-aware `canAssignCard(user, project, task, target)`; update `financeAssigneeCandidates` to offer Finance and Media for every finance type and `canEditForm` to let an assigned Media user edit any assigned finance form; verify with new assertions in `tests/stage-types.test.ts` covering Media RAB edit and Assignee/Media reviewer exclusion.
- [x] 1.3 Update `taskTransition` so the owner branch accepts a Manager Tugas or an Assignee, and pass `{ workUrl, comment }` through the dialog helper; verify with `tests/manager-assignment.test.ts` and `tests/domain.test.ts` covering PM move with only a Manager Tugas and PM request-revision with a comment.
- [x] 1.4 Extend `canReviewForm`, `canReviewFormEntry`, and `canViewProject` with reviewer authority while keeping Admin and owning-PM rights; verify with `tests/unified-workspace.test.ts` and `tests/business-revenue.test.ts` covering a Finance reviewer opening and approving a submitted form.

## 2. Store actions and journey transitions

- [x] 2.1 Add `setTaskManager(taskId, managerId)` that stores the Manager Tugas, moves a Backlog card to To Do without an assignee, audits the change, and rejects Manager changes after work starts; verify with a new test in `tests/manager-assignment.test.ts`.
- [x] 2.2 Update `assignTask` to allow the card's Manager Tugas or Admin to assign on `backlog` and unassigned `todo` cards, including self-assignment, and keep PM allocation rejected; verify with new tests in `tests/manager-assignment.test.ts` covering Manager self-assign and non-manager rejection.
- [x] 2.3 Add `setFormEntryReviewer` and `setFormReviewer`, accept `reviewerId` in `createFormEntry`, and audit each selection; verify with `tests/stage-types.test.ts` and `tests/unified-workspace.test.ts` covering valid and invalid reviewer roles.
- [x] 2.4 Change `completeStep` to return a boolean and extract a shared phase-advance helper used by `completeStep` and `completeProjectPhase`; auto-complete a finished phase, create Finance steps when Running ends, and activate the next phase's first step when it has a Manager PIC; verify with `tests/lifecycle.test.ts` covering Planning → Running, Running → Finance, Prospek → Planning, and the missing-PIC idle case.
- [x] 2.5 Auto-activate the first pending step of the current phase in `updateProjectStep` when a Manager PIC is set while no step is active; verify with `tests/lifecycle.test.ts` covering the missing-PIC recovery path.

## 3. Kanban card workflow

- [x] 3.1 In `dialogs.tsx`, add the Manager Tugas dropdown for PM/Admin, reveal `Pilih Assignee` to the Manager Tugas/Admin on an unassigned To Do card, and include Manager Tugas in the PM move availability; verify with `tests/manager-assignment.test.ts` and a manual check that a PM can set a Manager then move the card.
- [x] 3.2 Fix the revision flow by passing the review comment into `taskTransition`, showing the returned reason on failure, and toasting success only on a real transition; verify with the request-revision scenario in `tests/domain.test.ts`.
- [x] 3.3 Show the Manager Tugas on `BoardCard` alongside the assignee state so an unassigned To Do card is distinguishable; verify with `npm run build` and the board/backlog smoke view.
- [x] 3.4 Update the Backlog and Forms lists to show the same Manager Tugas/assignee information without changing scope filtering; verify with `npm run lint` and the existing list tests.

## 4. Finance forms and reviewer surfaces

- [x] 4.1 Update `finance-form-page.tsx`, `step-form-panel.tsx`, `media-order-form.tsx`, and `forms-page.tsx` to use the expanded Finance/Media candidates and reviewer-aware copy; verify with `tests/stage-types.test.ts` and `tests/business-revenue.test.ts`.
- [x] 4.2 Add the Reviewer dropdown to the create-entry dialog (`project-detail.tsx`) and to the entry/finance form assignment areas, limited to PM/Manager/Finance candidates; verify with `tests/stage-types.test.ts` and a smoke check of the create-entry dialog.
- [x] 4.3 Show the selected reviewer and allow PM/Manager/Admin to change it before approval on the entry page and finance form page; verify with `tests/unified-workspace.test.ts` covering reviewer audit and reviewer review queue.
- [x] 4.4 Update the Forms badge and queue filters so reviewer work appears in the review queue without inflating the fill badge; verify with `tests/business-revenue.test.ts`.

## 5. Journey completion controls

- [x] 5.1 In `project-detail.tsx`, compute `evaluateGate` for the selected active step, disable `Selesaikan Tahap` with the unmet requirement labels when not ready, and base the toast on the boolean returned by `completeStep`; verify with `tests/lifecycle.test.ts` covering the disabled and enabled states.
- [x] 5.2 Add an `Aktifkan tahap` action for the first pending step of the current phase when no step is active and a Manager PIC exists, using `activateProjectStep`; verify with `tests/lifecycle.test.ts`.
- [x] 5.3 Confirm the automatic hand-off UI shows the next phase and its first step after the last step completes, without requiring Journey Management; verify with the lifecycle test and a manual two-phase project run.

## 6. Integration verification

- [x] 6.1 Update existing tests whose expectations changed (`manager-assignment`, `stage-types`, `business-revenue`, `unified-workspace`, `lifecycle`, `persistence-port`) and add coverage for Media finance assignment, reviewer authority, Manager Tugas, PM movement, and phase hand-off; verify with `npm test`.
- [x] 6.2 Update `AGENTS.md` product rules and `Docs/Stage-Types.md` / `Docs/Revenue-Tracking.md` where they still state "Media cannot edit RAB/MO/Invoice/Pembayaran" or "only Finance reviews"; verify the docs match the implemented behavior.
- [x] 6.3 Run `npm run lint`, `npm test`, and `npm run build`, and confirm all three pass.

## Workflow follow-up

- Archive the change after review and a successful verification run.
