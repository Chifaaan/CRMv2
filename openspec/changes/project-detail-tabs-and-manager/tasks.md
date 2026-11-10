# Tasks

## 1. Project overview data and UI

- [x] 1.1 Add a pure `projectOverview(state, projectId)` helper in `src/lib/prototype/domain.ts` (or `overview.ts`) returning stage completion counts, six-status task distribution with percentages, completed/open/overdue task counts, completion percentage, and recent events; verify `tests/domain.test.ts` covers zero activity, archived cards, overdue cards, and project isolation.
- [x] 1.2 Add `src/components/prototype/crm/project-overview.tsx` with stage completion, task distribution, progress overview, and recent activity cards, rendering zeros and empty states instead of hiding sections; verify `npm run build` and inspect a project with no tasks.
- [x] 1.3 Add the `Selesaikan Tahap` action using the active step and `evaluateGate`, calling the existing `completeStep` only for non-gate steps and pointing gate steps to Journey Management; verify a met non-gate step completes, an unmet gate disables the action, and non-managers do not see it.

## 2. Project detail tabs and journey header

- [x] 2.1 Restructure `src/components/prototype/crm/project-detail.tsx` into hero, `Overview`/`Journey Management` tab bar, and tab bodies, mirroring the tab in the `tab` query parameter while keeping the `step` query parameter; verify both tabs open on refresh and only the opened project is shown.
- [x] 2.2 Move the journey header, journey editor, selected step panel, and step history into the Journey Management tab, and keep media orders below the tab body; verify no duplicate journey editor remains in the hero or Overview.
- [x] 2.3 Update `ProjectStepper`/`phasesPresent` usage so the journey header always renders `PHASE_ORDER`, displays `0 Tahap` for phases with no steps, and keeps empty phases selectable; verify `tests/stepper.test.ts` asserts four phases for an empty journey.
- [x] 2.4 Rework `src/components/prototype/crm/journey-management.tsx` into a `Kelola fase` section with phase step rows, `+ Tambah step`, edit/up/down/delete controls, and a `Selesaikan fase` action disabled until every step is completed or skipped; verify a pending phase cannot be finished and a complete phase advances.
- [x] 2.5 Add a `Pilih step` selector listing the selected phase's steps and render the selected step's task summary (total, completed, active) with `Buka Board` for SIMPRO steps; verify an empty step shows the no-task state and a board link carries the stage.

## 3. Active-phase step editing and preparation

- [x] 3.1 Add domain helpers `stepHasStartedWork(state, step)`, `canAddStepToPhase(project, phase)`, and `canDeleteStepFromPhase(state, project, step)`: work means a non-cancelled form entry in draft/submitted/review, a finance form past assigned status, a task past Backlog, or a started/completed step timestamp; verify `tests/domain.test.ts` covers each signal.
- [x] 3.2 Add `addPhaseStep(projectId, phase, stage)` to `store.ts` with project/role/phase/validation guards, append-at-end ordering, immediate activation when a started phase has no active step and no later active phase, and a `project.step_added` event; verify tests cover an unlocked phase, a started phase with no work, Closing rejection, and the activation edge case.
- [x] 3.3 Add `deletePhaseStep(projectId, stepKey)` with project/role/Closing guards, started-work rejection, renumbering, and a `project.step_removed` event; verify tests cover deleting an unstarted step in a started phase, rejecting a step with a draft/submitted entry, rejecting a step with a non-Backlog task, and renumbering.
- [x] 3.4 Keep `setPhaseStructure` for bulk edits of unlocked phases and ensure the Journey Management UI uses it only before a phase starts, switching to add/delete-only controls after start; verify reorder/edit on a started phase is rejected.
- [x] 3.5 Allow creating steps and template default tasks for an opened but not-started phase, storing tasks in Backlog with no assignee; add a store/domain guard that rejects assigning a task whose step is pending or whose phase has not started, and hide assignment in that state; verify PM assignment is rejected and a started step still assigns normally.

## 4. SIMPRO card Manager

- [x] 4.1 Add optional `managerId?: string` to `Task` in `src/lib/prototype/types.ts` and implement `setTaskManager(taskId, managerId)` in `store.ts` for Manager, owning PM, and Admin, restricted to Manager-role targets, with an audit event and a notification linking to the project board task; verify clearing the Manager removes it without notifying.
- [x] 4.2 Extend `canAssignTask`/`assignTask` and `taskTransition` in `domain.ts` so a card's attached Manager can allocate the card and can start/submit it under the non-empty working-link rule, while review remains owning PM/Admin only; verify tests cover manager start with and without a link, manager submit, manager reassign, and manager review denial.
- [x] 4.3 Add the Manager selector beside the Assignee in `TaskDialog` for authorized users and show the Manager read-only otherwise; display the Manager on `BoardCard` and in SIMPRO task surfaces; verify `npm run build` and inspect a card with assignee and Manager.
- [x] 4.4 Ensure Manager notifications and cards do not change My Tasks or workload semantics: My Tasks stays assignee-scoped and workload counts only assignees; verify existing workload and My Tasks tests still pass and the Manager notification opens the board card.

## 5. SIMPRO board stage visibility

- [x] 5.1 Add `visibleBoardSteps(state, user, projectId)` in `domain.ts`: PM/Manager/Admin receive every step, while Assignee and Media receive only `active` and `completed` steps; verify `tests/domain.test.ts` covers each role and a project with pending, active, and completed stages.
- [x] 5.2 Apply the helper to the SIMPRO board stage navigation, stage filter, and stage query parameter so pending stages are hidden and direct links are rejected; verify a completed stage reopens read-only and an Assignee cannot reach a pending stage URL.
- [x] 5.3 Keep card filtering assignee-scoped while using the new stage scope, and show an explicit message that unstarted stages appear once the phase runs; verify `npm test` and inspect the board as an Assignee, Media, PM, and Manager.

## 6. Working link and PM status control

- [x] 6.1 Change `validateWorkingLink` in `domain.ts` to accept any trimmed non-empty text and remove URL parsing; verify `tests/domain.test.ts` covers empty, whitespace-only, URL, and arbitrary text.
- [x] 6.2 Update `TaskDialog` to show the `Link Pekerjaan` input, `Simpan Link` button, and the no-URL-validation helper text, and update `BoardCard` to render non-URL link text as plain content while keeping `http(s)` links clickable; verify an existing link allows In Progress without re-entry.
- [x] 6.3 Add the owning-PM status override in `taskTransition`: allow any target status when the card has an assignee or `managerId`, still require a link for In Progress, reject ownerless cards, and keep `assignTask` unchanged; verify tests cover PM moves to In Progress, Completed, Need Revision, and an ownerless rejection.
- [x] 6.4 Expose the PM status control in `TaskDialog` for owned cards and confirm the board drag path uses the same guard; verify the PM can move an owned card and still cannot assign.

## 7. Stage creation dialog

- [x] 7.1 Add a stage-creation dialog in `journey-management.tsx` with `Nama Tahap`, `Format` (Form, Form Keuangan, Gerbang, SIMPRO), and a live preview row table showing order, name, format, and pending status; verify empty names are rejected and cancel changes nothing.
- [x] 7.2 Wire the dialog to append to the local draft for unlocked phases and to call `addPhaseStep` for started phases, keeping finance kind, gate kind, and form-template title in the existing row editor; verify `npm run build` and create a stage in both phase states.

## 8. Integration, documentation, and verification

- [x] 8.1 Extend `tests/domain.test.ts`, `tests/flexible-journey.test.ts`, `tests/stepper.test.ts`, and `tests/events.test.ts` for overview aggregation, all-phase header counts, active-phase add/delete guards, prepared-task assignment rejection, board stage visibility, non-empty link handling, owning-PM status override, Manager rules, and new audit event rendering.
- [x] 8.2 Update `AGENTS.md`, `Docs/PRD.md`, `Docs/PRD-Alur-CRM-Baru.md`, and `Docs/Stage-Types.md` for the tabbed project workspace, overview sections, active-phase step editing, inactive-phase preparation, board stage visibility, working-link behaviour, PM status changes, stage creation dialog, and the card Manager field.
- [x] 8.3 Run `npm run build`, `npm run lint`, and `npm test`, then manually smoke-test: open Overview on a project with mixed task statuses, switch to Journey Management, create a stage through the preview dialog, add and delete steps in a started phase without work, confirm deletion is blocked after a draft entry or a non-Backlog task, prepare a pending step with template tasks and confirm assignment is unavailable, save an arbitrary working link and move the card to In Progress, move an owned card as PM, attach a Manager, and verify the Manager can start/submit and assign while still unable to review, and finally confirm an Assignee sees only active and completed board stages.

## Workflow follow-up

- Run the apply workflow for this change.
- Archive the change after implementation and verification are complete.
- Sync or archive `flexible-journey-management` so the main `project-journey` spec reflects the journey behaviour this change extends.
