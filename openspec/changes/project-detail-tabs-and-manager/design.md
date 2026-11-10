# Design

## Context

See `proposal.md` for motivation and `specs/` for required behaviour.

Current constraints found in the code:

- `CrmProjectDetail` in `src/components/prototype/crm/project-detail.tsx` renders the hero, `ProjectStepper`, the `JourneyManagement` section, the active step panel, step history, and media orders in one vertical page.
- `ProjectStepper` uses `phasesPresent(steps)` from `src/lib/prototype/stepper.ts`, so phases with no materialized steps disappear from the header. `JourneyManagement` already lists `PHASE_ORDER` but shows a compact button row rather than the reference header.
- `setPhaseStructure` replaces the whole phase and rejects it as soon as any step is not pending or has a started/completed timestamp, task, or form entry. There is no per-step add/delete action for a started phase.
- `Task` in `types.ts` has `assigneeId` and `requestedAssigneeId` but no manager field. `canAssignTask` is Manager/Admin only; `assignTask` only accepts backlog cards; `taskTransition` allows only the assignee or Admin to start/submit.
- `validateWorkingLink` in `domain.ts` currently requires an absolute `http`/`https` URL. The SIMPRO board builds its stage navigation from the project's steps without filtering by step status, and phase/step panels render completed stages read-only.
- `TaskDialog` shows the assignee selector only when `canReassign`, and notifications are created through the local `notify` helper in `store.ts`.
- `JourneyManagement` currently adds a stage inline through a name input and `createManualStage`; there is no confirmation dialog or preview table.
- Overview data already exists in pieces: `tasksForProject`, `taskCountsByStatus`, `isOverdue`, `activeSteps`, and `readProjectEvents`. There is no project-scoped aggregation helper.
- The previous change `flexible-journey-management` is implemented and complete but not archived, so the main `project-journey` spec still contains the older template-bound wording. This design assumes the flexible-journey behaviour is present and should be consistent with its archive.

## Goals / Non-Goals

**Goals:**

- Give project detail a durable Overview and Journey Management tab structure scoped to one project.
- Reuse the existing hero, phase step model, gate completion, task, form, and audit primitives instead of adding a parallel model.
- Make the journey header complete: every fixed phase is always visible with an accurate step count.
- Allow safe structural changes in a started phase without weakening the rule that steps with work are immutable.
- Let a PM prepare pending steps and default tasks for an open but inactive phase without granting assignment rights.
- Add a card-level Manager who can supervise, work, assign, and be notified without changing review rights.
- Keep assignee/Media board navigation limited to stages they are allowed to work: active and completed stages.
- Treat the working link as opaque non-empty text and let a saved link unblock In Progress.
- Let the owning PM move any owned card to any status without granting assignment rights.
- Replace inline stage creation with a name/format dialog that previews the new table row.

**Non-Goals:**

- A global or cross-project overview; the new overview is per project only.
- Reordering or editing started steps; only add and delete are allowed after a phase starts.
- Editing Closing by hand; it remains rule-driven.
- Multiple Managers per card, or a Manager hierarchy/approval chain.
- Manager review rights, Manager workload counts, or a new notification centre.
- Changing the six task statuses, the Form entry lifecycle, or assignment of forms.
- URL-format validation of working links, or link previews for non-URL text.
- Letting the PM assign cards; the PM only gains status moves on already-owned cards.

## Decisions

### D1: Project detail becomes a hero, a tab bar, and two tab bodies

`CrmProjectDetail` keeps the hero card and its Edit/Cancel actions. Below the hero it renders a tab bar with `Overview` and `Journey Management`; the selected tab is local state and is mirrored to the `tab` query parameter so a refresh or a link can return to the same tab. `step` remains a separate query parameter used inside Journey Management.

- **Overview** renders a new `ProjectOverview` component and does not render the step panel.
- **Journey Management** renders the journey header, the phase/step editor, the selected step panel, and step history.
- The previous always-visible `JourneyManagement` section and `ProjectStepper` block are removed from the hero. Media orders stay below the tab body because they are project-level, not journey-step-level.
- The top-right `Selesaikan Tahap` action lives in the tab bar. It is shown to the owning PM/Admin and acts on the currently active step.

*Alternative considered:* keep the long page and add tabs only around Journey Management. Rejected because the reference workflow treats Overview and Journey Management as two equal work surfaces and the long page already duplicates summaries.

### D2: Overview is a pure projection of project data

Add `projectOverview(state, projectId)` in `domain.ts` (or a small `overview.ts`) returning:

- `stageCompletion`: counts of completed, skipped, and not completed (`pending` + `active`) steps;
- `taskDistribution`: `TASK_STATUSES` order with count and percent of all non-archived project tasks;
- `progress`: completed tasks, open tasks (non-completed, non-archived), overdue tasks (`isOverdue`), and percent completed;
- `recentEvents`: the newest project audit events, capped for the card.

The helper is pure and has no UI dependencies so it can be unit-tested. The component renders zeros rather than hiding sections when a project has no work. Archived tasks are excluded from distribution and progress. The overview never reads another project's arrays; it reuses the existing project-scoped selectors.

`Selesaikan Tahap` uses the active step and `evaluateGate` to decide availability. Non-gate steps call the existing `completeStep`. A gate step cannot be completed through this button because `completeStep` intentionally rejects gates; the button shows a disabled state that points the user to Journey Management to record the decision.

*Alternative considered:* add overview numbers to `calculateJourneyProgress`. Rejected because journey progress answers a different question (weighted stage completion) and must keep its legacy formula.

### D3: The journey header always shows the four fixed phases

Replace `phasesPresent(steps)` usage in the project journey header with `PHASE_ORDER`. For each phase compute the count with `phaseStageCounts` and display `0 Tahap` when the count is zero. The active phase is still derived from the step with status `active`; a phase with no steps is selectable and shows its empty state.

`JourneyManagement` owns the header, phase selection, and step selection. It renders all four phases in fixed order, marks the current phase as `Sedang berjalan`, and keeps the selected phase independent from the project's active phase. Selecting a phase that has no steps does not materialize anything.

When a started phase accepts a new step, the new step is appended at the end of that phase. If the phase has no active step and no later phase is active, the new step is activated immediately so it cannot become orphaned.

*Alternative considered:* keep `phasesPresent` and add a static label row. Rejected because the user must be able to select empty phases to prepare them.

### D4: Started phases get explicit per-step add/delete actions

Keep `setPhaseStructure` for bulk edits of unlocked phases and add two guarded store actions:

- `addPhaseStep(projectId, phase, stage)` appends one validated step.
- `deletePhaseStep(projectId, stepKey)` removes one step and renumbers the remaining phase steps.

Both actions share a new domain guard `stepHasStartedWork(state, step)`:

- a Form entry exists with status `draft`, `submitted`, `approved`, or `need_revision`;
- a finance form exists with status beyond `unassigned`/`assigned`, or has `submittedAt`;
- a task exists whose status is not `backlog` (archived cards are ignored);
- the step has `startedAt` or `completedAt`.

`canEditPhaseStructure` continues to reject reordering/editing a started phase. `addPhaseStep` and `deletePhaseStep` allow a started phase only when the affected step has no started work. Deleting the active step is therefore blocked by definition. Adding to an unstarted phase is allowed once that phase has been opened; Closing is rejected. Bulk `setPhaseStructure` keeps its stricter whole-phase guard.

Every add/delete records `project.step_added` or `project.step_removed` with before/after names and the phase, matching the existing audit trail UI.

*Alternative considered:* overload `setPhaseStructure` with a partial list. Rejected because the UI would have to send the whole phase and a single delete would risk dropping a step with work.

### D5: Inactive phases can be prepared, but prepared tasks cannot be assigned

`JourneyManagement` shows step controls for an opened but not-started phase. `addPhaseStep` creates the phase state when it is missing only for Prospek and for phases that have already been opened by the journey rules. Planning/Running remain unavailable until the winning gate opens them; Closing stays rule-driven.

Default tasks can be created from a step template for a pending step. They are stored with `status: "backlog"` and no assignee. `assignTask` gains a guard that rejects cards whose step is `pending` or whose phase has not started, so preparation cannot leak into allocation. The UI hides the assignment control in that state.

*Alternative considered:* create future-phase steps only after the phase starts. Rejected because the user explicitly wants to prepare steps and tasks before activation.

### D6: A card Manager is a separate optional field with worker and allocator rights

Add `managerId?: string` to `Task`. The field is optional, single-valued, and restricted to users with role `manager`. Add `setTaskManager(taskId, managerId)` in the store:

- allowed for a Manager, the owning PM, or Admin;
- stores the Manager, writes an audit event, and notifies the newly attached Manager with a link to the card;
- clearing the Manager removes the field without notifying.

Assignment and work rules become:

- `canAssignTask` still describes Manager/Admin; `assignTask` additionally allows the card's attached Manager to allocate that card.
- `taskTransition` allows `in_progress` and `awaiting_approval` when the actor is the assignee, the attached Manager, or Admin. The non-empty working-link rule is unchanged.
- Review stays with the owning PM/Admin; an attached Manager still cannot approve or reject.

`TaskDialog` shows a Manager selector beside the assignee for authorized users and shows the Manager read-only otherwise. `BoardCard` shows the Manager name next to the assignee. The Manager notification links to the project board with the task selected instead of `/my-tasks`, because My Tasks remains assignee-scoped. Workload also remains assignee-scoped; the Manager field does not create a second active-card count.

*Alternative considered:* reuse `assigneeId` for the Manager. Rejected because the card would lose the working assignee and the UI explicitly needs both fields side by side.

### D7: Audit, migration, and tests stay incremental

- New event types `project.step_added`, `project.step_removed`, and `task.manager_changed` flow through the existing `recordProjectEvent`/`activity` helpers and render in the existing history component.
- `managerId` is optional, so persisted tasks and seed data remain valid without a migration. No `seedVersion` bump is required unless seed cards are given Managers during implementation.
- Tests are extended rather than replaced:
  - `tests/flexible-journey.test.ts`: add/delete on a started phase with and without work, pending task preparation, all-phase header counts.
  - `tests/domain.test.ts`: overview aggregation, archived/overdue handling, Manager transition rights, assignment guard for pending steps, non-empty link handling, owning-PM status override, and board-stage visibility.
  - `tests/stepper.test.ts`: zero-step phases remain present.
  - `tests/events.test.ts`: new event types render and remain project-scoped.
- Existing assertions that a started phase rejects every structural edit must be narrowed to reorder/edit and to steps with work.

*Alternative considered:* a separate overview store slice. Rejected because all required inputs are already derived from the project's tasks, steps, and events.

### D8: Board stage navigation follows the step state for operational users

Add a domain helper `visibleBoardSteps(state, user, projectId)`:

- PM, Manager, and Admin receive every step of the project.
- Assignee and Media receive only steps whose status is `active` or `completed`.
- The board page, stage filter, and stage query parameter all use the same helper, so a pending stage cannot be reached by typing a URL.
- Completed stages stay selected as read-only, reusing the existing `readOnly` prop on the board and card detail.
- Card filtering stays assignee-scoped; this decision only changes which stage containers are visible.

*Alternative considered:* hide only pending stages that contain no tasks. Rejected because a pending stage can still gain cards and the user asked for status-based visibility, not emptiness-based visibility.

### D9: Working link becomes opaque non-empty text

Change `validateWorkingLink` into a non-empty check: trim the input, accept any non-empty string, and return the trimmed text. Remove `URL` parsing and the `http(s)` requirement. `taskTransition` and `setWorkingLink` keep using the helper, so the store and board drag path share one rule.

- `TaskDialog` keeps the `Link Pekerjaan` input and `Simpan Link` button and adds the helper text `Wajib diisi; tidak ada validasi URL. Pastikan dapat diakses PM dan Manager.`
- The board card shows the saved link as an anchor only when it parses as `http(s)`; otherwise it renders the text as plain content. This avoids producing broken or unsafe anchors from arbitrary text.
- The existing link on the card is reused when moving to In Progress, so the user does not need to re-enter it.

*Alternative considered:* keep URL validation but only warn. Rejected because the requirement explicitly removes URL validation and allows any text.

### D10: The owning PM may move an owned card to any status

`taskTransition` gains a project-PM branch before the assignee checks:

- if the actor is the project's PM and the card has an assignee or `managerId`, allow any target status;
- still require a non-empty link when the target is `in_progress`;
- reject the move when the card has neither an assignee nor a Manager;
- keep review semantics unchanged; a PM who owns the project may already review, but the direct move is allowed by this rule and is audited.

`TaskDialog` gains a PM-visible status control for owned cards, and the board drag path keeps using `taskTransition`, so both paths enforce the same rule. `assignTask` is untouched, so the PM still cannot set the assignee.

*Alternative considered:* let the PM move only cards they report. Rejected because the requirement keys the permission on the card having an Assignee or Manager, not on the reporter.

### D11: Stage creation uses a dialog with a live table preview

Replace the inline `+ Tambah step` behavior in `JourneyManagement` with a dialog state:

- fields: `Nama Tahap` and `Format` (the existing four stage kinds);
- preview: a one-row table with order `draft.length + 1`, the entered name, the format label, and `pending` status;
- save: when the phase is unlocked, append the stage to the local draft and mark it dirty so the existing `Simpan` flow persists it; when the phase is started, call `addPhaseStep` immediately after the same validation;
- cancel or an empty name leaves the draft unchanged.

Finance kind, gate kind, and form-template title remain editable on the created row through the existing row editor, so the dialog stays small.

*Alternative considered:* put every stage property in the dialog. Rejected because it duplicates the row editor and the user only asked for name, format, and preview.

## Risks / Trade-offs

- **Tabbed detail hides the active step from Overview** → the tab bar shows the active phase and `Selesaikan Tahap`; Journey Management opens with the active step selected.
- **Adding a step to a started phase can change progress denominators** → only steps without work can be added/deleted, and journey progress keeps using the weighted formula over materialized non-skipped steps.
- **Deleting a pending step could remove template tasks** → deletion is blocked if any card on that step has left Backlog; backlog-only cards are removed together with the step and the audit records the loss.
- **Manager rights can blur accountability** → Manager cannot review, workload stays assignee-based, and the attached Manager is visible on the card.
- **PM preparing future tasks may expect to assign them** → the UI explicitly states that assignment is unavailable until the step is active.
- **`managerId` is not part of the persisted migration** → old data reads fine because the field is optional, but old code ignores Managers after a rollback.
- **Assignees may lose sight of future stages** → the board shows an explicit explanation that unstarted stages are hidden until the phase runs, while the CRM journey header still shows the full plan to authorized users.
- **Arbitrary link text cannot always be clicked** → the card renders non-URL text as plain content instead of a broken anchor, and the PM/Manager can still read it.
- **PM direct moves bypass the normal review path** → the move is explicitly allowed and audited; Manager review permissions are unchanged.
- **The stage dialog adds an extra step to creation** → the preview row makes the result obvious and the existing row editor still handles kind-specific fields.

## Migration Plan

- No required persisted schema migration. `managerId` is optional and absent on existing tasks; existing projects keep their step arrays and phase states.
- Existing working links remain valid because any non-empty text passes the new rule; links that were valid URLs continue to render as clickable anchors.
- Existing started phases remain started and locked for reorder/edit; the new add/delete actions only apply to steps created after this change or steps with no work.
- Existing board URLs that point at a pending stage are rejected for Assignee/Media users after the visibility change; no data is migrated.
- No `seedVersion` bump unless seed tasks are populated with Managers or seed cards get non-URL links. If seed data changes, use the existing reset path.
- Rollback is code-only. Data written by the new flow (extra pending steps, `managerId`, opaque links) remains readable, but old code will not display or enforce the new rules.
- After implementation, update `AGENTS.md`, `Docs/PRD.md`, `Docs/PRD-Alur-CRM-Baru.md`, and `Docs/Stage-Types.md` so the project workspace, active-phase editing, board stage visibility, working-link, PM status, stage creation, and card Manager rules match the app.
- Archive or sync `flexible-journey-management` before or alongside this change so the main `project-journey` spec reflects the flexible journey behaviour this change builds on.
