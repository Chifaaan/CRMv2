# Design

## Context

The prototype enforces rules in `src/lib/prototype/domain.ts` and mutates state through Zustand actions in `store.ts`. Relevant current behavior:

- `taskTransition` treats the owning PM/Admin as an owner only after `task.assigneeId` exists; the card dialog likewise gates the PM move control on an assignee.
- `assignTask` accepts only `backlog` cards and `canAssignKanbanTask` admits only Admin/Manager, so there is no place for a Manager Tugas between Backlog and To Do.
- `financeAssigneeCandidates` returns Finance for every finance form and Finance+Media for BAST only; `canEditForm` mirrors that split.
- `FormEntry` and `StepForm` have `reviewedById` but no assigned reviewer, and review authority is hard-coded to the owning PM/Admin.
- `completeStep` only activates a pending step from the *same* phase. When the last step of a phase finishes, nothing becomes active and the only route forward is the phase button inside Journey Management.
- `completeProjectPhase` activates the next phase's first step only when it already has a `managerPicId`, and `updateProjectStep` does not activate a step after a PIC is added.
- The header `Selesaikan Tahap` button has no `disabled` state and `completeStep` returns `void`, so failed completions still toast success.

Persistence is browser-local and versioned in `store.ts`; all new fields must be optional so existing persisted state stays valid.

## Goals / Non-Goals

**Goals:**

- Introduce a task-level Manager Tugas without replacing the project-level Manager.
- Make Manager-led allocation and PM card movement work under the existing card lifecycle.
- Let Media fill every finance form assigned to it.
- Add an optional reviewer with real review authority and visibility.
- Remove the phase dead-end and make `Selesaikan Tahap` honest about readiness.

**Non-Goals:**

- No backend, auth, or real notification delivery.
- No new Kanban statuses, phases, or stage kinds.
- No self-review prevention beyond the existing "Manager assignee cannot review their own card" rule; a reviewer may still be the assignee of a form, but the UI does not require that guard.
- No redesign of the Board or project detail beyond the controls this change needs.

## Decisions

### 1. Add `Task.managerId` as the Manager Tugas

Add an optional `managerId` to `Task` and a dedicated store action `setTaskManager(taskId, managerId)`. The field is separate from `Project.managerId` and from `requestedAssigneeId` (legacy). The owning PM/Admin sets it on a Backlog card; the action writes the Manager Tugas and, when the card is still `backlog`, moves it to `todo` with `assigneeId` untouched. The change is written to `project_events` and `activityLogs`.

Why a new field: reusing `project.managerId` would force one Manager per project and break the per-card routing the request asks for. Reusing `requestedAssigneeId` would collide with legacy "requested" semantics.

### 2. Split "set Manager Tugas" from "assign assignee"

`assignTask` keeps meaning "give this card an assignee". It is extended to accept:

- the card's Manager Tugas (role Manager), or an Admin, on a `backlog` card; and
- the card's Manager Tugas or an Admin on an unassigned `todo` card.

The target may be Assignee, Manager, or Media, including the Manager Tugas themselves. The PM is still not an allocation actor on new-lifecycle projects. Reassignment after `in_progress` stays unavailable, matching the current dialog restriction.

`canAssignKanbanTask` is replaced by a task-aware helper (`canAssignCard(user, project, task, target)`) because the old signature cannot distinguish the Manager Tugas from any other Manager.

### 3. Owner movement requires Manager Tugas *or* Assignee, and options reach validation

`taskTransition`'s owner branch checks `task.managerId || task.assigneeId` instead of only `assigneeId`. The header move control and dialog visibility use the same condition. The `in_progress` link requirement and `need_revision` comment requirement stay.

The reported revision failure comes from `TaskDialog.move`: it calls `taskTransition` without the `comment` option, so the owner branch rejects every `need_revision` move before the dialog's own comment check runs. The fix passes `{ workUrl, comment }` into `taskTransition` and reports the returned reason. This is preferred over duplicating the comment check in the dialog because validation stays in the domain layer and applies to the board as well.

### 4. Finance forms accept Media assignees and give them edit rights

`financeAssigneeCandidates` returns users with role `finance` or `media` for every finance form type. `canEditForm` allows an assigned Media user to edit any finance form, while keeping the existing RAB baseline lock, active-step requirement, status gate, and MO/PM exception. Survey stays Assignee-only. `canViewProject` already admits a Media user with an assigned form, so only the edit predicate and candidate list change.

### 5. Reviewer is an optional field with additive authority

Add `reviewerId?: string` to `FormEntry` and `StepForm`, plus a shared `reviewerCandidates(state)` helper returning only PM, Manager, and Finance users. Review authority becomes:

- Admin: always;
- the entry/form's `reviewerId`: for submitted work;
- the owning PM: unchanged.

Store actions `setFormEntryReviewer` and `setFormReviewer` validate that the actor is the owning PM, a Manager, or Admin, that the target role is PM/Manager/Finance, and record an event. `createFormEntry` accepts an optional `reviewerId`.

`canViewProject` gains a reviewer clause for both form entries and finance forms so a non-PM reviewer can open the project surface. The Forms page review queue and form page review panel already derive from `canReviewFormEntry` / `canReviewForm`, so they pick up reviewer authority automatically.

Reviewer selection is offered where the form is created or assigned: the create-entry dialog, the entry page, the finance form page, and the shared `StepFormPanel` assignment area.

### 6. Phase hand-off is one shared transition

Extract the phase-advance logic from `completeProjectPhase` into an internal helper used by both `completeProjectPhase` and `completeStep`. After a step is marked completed:

1. If another step in the same phase is pending and has a Manager PIC, activate it (current behavior).
2. If no step remains in the phase, mark the phase completed (`phaseCompletedAt`), create Finance steps when Running completes, and activate the first pending step of the next phase when it has a Manager PIC.
3. If the next step has no Manager PIC, leave it pending; the next phase is still current and the step becomes activatable once a PIC is set.

`updateProjectStep` auto-activates the first pending step of the current phase when a Manager PIC is added, no step is active, and no other pending step precedes it. This closes the dead-end where a phase completes without an active step.

The phase type is extended to allow `prospek` in `phaseCompletedAt` so a Prospek-inclusive project can also hand off to Planning; `projectPhase` reads that marker.

Why auto-advance instead of relying on the explicit button: the request is that finishing all steps continues the journey. The explicit `Selesaikan fase` control remains as an override and audit trail.

### 7. `Selesaikan Tahap` computes readiness from the gate

The project detail computes `evaluateGate(store, project.id, selectedStep.key)` for the active step. The button is rendered only for an active step, is `disabled` unless `gate.ready`, and shows the unmet requirement labels next to it. `completeStep` changes from `void` to `boolean`; the UI reports success only when the action returns true and otherwise shows the unmet criteria.

### 8. UI surfaces

- `TaskDialog`: Manager Tugas select for PM/Admin, assignee select for the Manager Tugas/Admin, PM move control when manager or assignee exists, and corrected comment passing.
- `BoardCard`: show the Manager Tugas name alongside the assignee state.
- `project-detail.tsx`: disabled completion button + requirement hint; expose "Aktifkan tahap" for a pending first step of the current phase when no step is active and a PIC exists.
- `finance-form-page.tsx`, `step-form-panel.tsx`, `media-order-form.tsx`, `form-entry-page.tsx`, `forms-page.tsx`: reviewer dropdown and reviewer-aware copy.
- `project-work-panels.tsx`: Forms list shows reviewer and the expanded finance assignee candidates.

## Risks / Trade-offs

- **Existing tests encode "PM cannot assign" and "Media cannot edit RAB"** → update `tests/manager-assignment.test.ts`, `tests/stage-types.test.ts`, `tests/business-revenue.test.ts`, and `tests/unified-workspace.test.ts` to the new rules, and add cases that prove PM still cannot allocate an assignee.
- **Auto phase advance can double-emit events** → route both explicit and automatic completion through one helper and emit phase/step events only from that helper.
- **A card can sit in `todo` with no assignee** → the board card and My Tasks must not treat it as work; My Tasks already keys on `assigneeId`, so this is safe. Add a test.
- **Reviewer visibility widens project access** → grant only to the exact `reviewerId` on a submitted/assigned form, not to every Finance/Manager user.
- **Legacy data has no reviewer/manager fields** → fields are optional and no persist migration is required; existing forms keep PM review and existing cards keep the assignee path.
- **Prospek auto-advance changes legacy behavior** → gate the auto-advance on new-lifecycle projects and keep legacy phase behavior untouched.

## Migration Plan

No persisted-state migration is required. New fields are optional and read with fallbacks. The persist version stays unchanged unless a backfill is needed for demo reviewer data; seed changes only affect a fresh browser profile.

## Open Questions

None. Reviewer notification targeting can be added later without changing the specs.
