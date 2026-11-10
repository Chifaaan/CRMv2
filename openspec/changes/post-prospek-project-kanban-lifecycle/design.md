# Design

## Context

The prototype persists its domain in Zustand/localStorage. `ProjectStep` already carries phase, kind, order, and `pending/active/completed/skipped` status; templates are copied into projects at creation, and audit events are appended with project mutations. New projects currently activate a template step immediately and lock their structure. Kanban already has the six requested columns and associates tasks with a step, but link capture and store-level transition enforcement are absent. Prospek conversion already stores `prospekId`, `pitchingId`, RAB/Quotation snapshots, contract, and Group membership.

The legacy `Umum` template and existing projects with Prospek steps must remain functional. The current persist version is 6; the old serialized phase value is `closing`.

## Goals / Non-Goals

**Goals:**
- Make new project state transitions explicit and enforceable in domain/store actions, not only in UI controls.
- Keep project template snapshots and audit history independent from future template edits.
- Migrate existing local data automatically and idempotently while distinguishing legacy journeys from new projects.
- Reuse the existing Kanban board and project/group data rather than introducing a second workflow or grouping model.

**Non-Goals:**
- Backend authorization, external link permission checks, or real SIMPRO integration.
- New notification/reminder channels, multi-link cards, or a new Group lifecycle.
- Automatically rewriting user-authored legacy templates or existing project step snapshots.

## Decisions

1. **Keep legacy and new project lifecycles distinguishable.** Add a creation-mode marker (`template`, `manual`, or `legacy`), an explicit started/initial-phase state, per-step Manager PIC, and persisted phase completion state. Keep `prospek` as a compatibility-only phase for legacy projects; new templates and projects use `planning → running → finance`. Retain `StepStatus` and use `skipped` for Planning bypass. This avoids forcing legacy Prospek work into Planning; alternatives were moving its steps to Planning (changes active meaning) or deleting it (loses history).

2. **Make Finance the canonical serialized phase with a reversible migration.** Extend the new domain phase value to `finance`; migrate stored `closing` to `finance` once, keep legacy `prospek` steps as-is, and map old projects to `legacy` mode so old weighted progress and step behavior remain available. Increment the persist version and test idempotence. A rollback can restore the pre-upgrade localStorage snapshot or map `finance` back to `closing`; do not attempt to infer phase from labels.

3. **Separate post-Prospek templates from legacy templates.** Keep the six-step `Umum` template unchanged and available for existing-project history. Add a generic post-Prospek execution template; publish compatible KOL/Event seed versions with Prospek-only stages removed, Planning/Running work represented as SIMPRO steps, and Finance containing only BAST, Invoice, or Pembayaran. New-project selection accepts only templates meeting the three-phase/type contract. Existing custom templates remain stored and editable, but incompatible ones must be edited or duplicated before use for a new project. Silently stripping or converting user stages at project creation was rejected because it could discard user-authored work.

4. **Keep a project unstarted until its first step activation.** Project creation stores the chosen template/manual mode but does not make a step active. The owning PM/Admin start action records Planning or Running. For template mode, Running marks Planning steps skipped and records the events; activation collects that step's required Manager PIC. For manual mode, choosing the initial phase opens Create Step and activates it only on successful creation. Persist prompt dismissal separately from lifecycle start so the always-available start action can resume the flow.

5. **Keep step and phase mutations in the project store.** Add narrowly-scoped actions for starting, activating, editing, reordering, deleting, and completing steps/phases. Validate owner-PM/Admin permissions, fixed phase order, one active step, Manager PIC prerequisites, and phase completion before writing. Record an event in the same state update for every change. Pending steps may be reordered only without crossing phase order; running/completed steps are immutable except name, Manager PIC, and description.

6. **Treat Manager PIC as display metadata, not an authorization boundary.** Store it on each project step and show it in the stepper/detail. Keep project `managerId` independent. In the new Kanban workflow any Manager/Admin may assign cards on any project; the assignee of a card (Assignee or operational Manager) may do its work. PM/Admin remain the reviewers. Legacy task permission behavior stays on legacy projects.

7. **Use the current task model with one validated link field.** Add a single `workUrl` to a task. Capture it in the In Progress transition dialog, validate absolute HTTP(S) syntax in both domain and store paths, preserve it on Need Revision, and allow the assigned worker to update it before completion. Update Board and task detail to render it for the owning PM, all Managers, Admin, and current assignee. The app can validate URL syntax but cannot prove that a remote document grants access.

8. **Soft-cancel early cards and preserve event history.** Reuse `archivedAt`/`archiveReason` as the cancellation mechanism, but reject the action unless the card is Backlog or To Do and the actor is owner PM/Admin. Completion counts only non-cancelled cards and still requires at least one. Route drag/drop, dialogs, and direct store calls through the same transition validation; the current store transition action must not accept unchecked status changes.

9. **Use existing event infrastructure and step keys.** Keep `ProjectEvent` as the audit source. Add stable event types for project mode/start, phase skip/completion, step lifecycle/Manager PIC changes, work-link changes, and card cancellation. Put actor, time, and before/after values in metadata. History for skipped steps remains selectable through the stepper.

10. **Snapshot Prospek header data and preserve Group membership.** Add an immutable conversion snapshot for Prospek PIC, client, period, and pagu; keep the existing inherited RAB, Quotation, and contract snapshots. Show contract value separately from Prospek pagu where both apply. Keep `prospekId`, `pitchingId`, and existing Prospek Group membership. In Projects, render child cards both in the main Projects section and in their Group accordion; the standalone duplicate is non-draggable so it cannot accidentally alter membership. Render the Prospek link beside, not inside, the project-card anchor to avoid nested links.

11. **Compute progress from creation mode.** New template projects use completed steps divided by non-skipped template steps; skipped Planning steps remain visible but do not inflate progress. Manual projects show completed-step count without a percentage. Legacy projects retain their existing weighted formula, preserving Umum parity. Finance completion sets project status completed; Group completion continues to use existing member completion rules.

12. **Preserve role-specific surfaces.** Assignees enter assigned work through SIMPRO and cannot open CRM project administration or Finance forms. Finance uses assigned CRM Finance forms. Manager visibility remains global. These checks belong in route/domain selectors as well as hidden UI controls; local prototype checks are usability rules, not backend security.

The four assumptions listed in `proposal.md` remain implementation gates and must be confirmed before `/opsx-apply`.

## Risks / Trade-offs

- **[Custom templates may not satisfy the new phase/type contract]** → Keep their definitions untouched, explain incompatibility in the selector, and support edit/duplicate using the existing template manager.
- **[Renaming a persisted phase can break old builds]** → Make migration idempotent, retain a pre-upgrade localStorage snapshot for downgrade, and test both legacy Prospek preservation and Finance mapping.
- **[Showing a Prospek child twice may look like duplicate data]** → Keep the same project ID and clearly label the standalone view; make it non-draggable while preserving Group membership and its accordion card.
- **[A syntactically valid URL may not be accessible to PM/Managers]** → Show the access reminder at entry and expose the URL to the specified roles; remote permission probing is out of scope.
- **[Role checks in a browser prototype are not security boundaries]** → Apply the same guards in domain/store actions and route rendering, and document that there is no backend authorization.
- **[Changing template seeds could affect future projects]** → Version KOL/Event templates and add a separate execution Umum; keep each existing project's copied steps unchanged.

## Migration Plan

1. Increment Zustand persist version and add defaults for projects that predate lifecycle metadata. Classify old records as `legacy`, infer started state from their existing step statuses, and preserve IDs, data, groups, events, tasks, and form entries.
2. Convert persisted `closing` step phases to `finance`; preserve `prospek` phases. Ensure repeat migration produces byte-equivalent state and no duplicate events.
3. Add a new post-Prospek generic template and compatible KOL/Event seed versions. Keep legacy Umum intact; do not rewrite user-authored template definitions or already-copied project steps.
4. Add model/domain/store behavior and audit events before wiring the UI. Validate all step, phase, task, and Finance rules at the mutation boundary.
5. Update project creation/startup, stepper/history, project header, Kanban/card dialogs, Finance panels, Projects search/filter, and Prospek conversion surfaces.
6. Run domain/store tests first, then UI/build/lint and the full regression suite, especially Groups, Prospek conversion, legacy project progress, and localStorage migration.

For rollback, restore the captured `crm-simpro:v1` value or run a downgrade mapper converting `finance` back to `closing` before loading with the prior app. No server-side rollback is required because the prototype has no backend.
