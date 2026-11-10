# Proposal

## Why

Project detail is currently one long page: the journey editor, the active step panel, media orders, and history are stacked together, so a PM cannot scan project health and manage the journey independently. The journey header also hides phases that have no materialized steps, and a phase becomes completely uneditable once started even when a step has no work yet. On the work side, a task card has an assignee but no supervising Manager, so the Manager who is accountable for the card must either become the assignee or use a separate CRM path to allocate it.

## What Changes

- **Project detail becomes tabbed**: project detail gains an `Overview` tab and a `Journey Management` tab, both scoped to the single opened project. The existing project hero and phase stepper stay above the tabs.
- **New Project Overview**: the Overview tab summarizes only the opened project: stage completion (selesai/dilewati/belum selesai), SIMPRO task distribution per status, progress overview (completed/open/overdue and percent complete), and recent project activity. A `Selesaikan Tahap` action completes the currently active stage through the existing gate rules.
- **Journey Management tab**: the journey editor moves under its own tab. It shows a phase header with all four fixed phases (including inactive phases, which display `0 Tahap`), a phase/step selector, editable step ordering and deletion, and the selected step's task information below.
- **Active-phase structural edits (BREAKING)**: a step in a started phase MAY be added or deleted while it has no work in progress — no form entry in draft/submitted/review and no task card past Backlog. Previously all structural edits were rejected as soon as a phase started.
- **Prepare inactive phases**: a PM can create steps and default tasks for a phase that is not active yet. Those tasks stay unassigned and the PM still cannot assign them.
- **Manager on SIMPRO cards**: a task card gains an optional Manager next to the Assignee. A Manager attached to the card can work on it, can assign/reassign it to an Assignee, and receives a notification when the card is assigned to them.
- **Board stage visibility for assignees**: an Assignee or Media user bound to a project sees only board stages that are active or completed. Pending stage boards are hidden, and completed stages stay reachable as read-only.
- **Working link without URL validation (BREAKING)**: the card shows a working-link input and a `Simpan Link` action. Any non-empty text is accepted, and a card that already has a saved link can move to In Progress. Absolute `http(s)` validation is removed.
- **PM can move any card status**: the owning PM can move a card to any of the six Kanban statuses when the card has an Assignee or Manager. The In Progress link rule still applies, and an unassigned card without a Manager cannot be moved.
- **Stage creation dialog**: creating a step opens a dialog with stage name, stage format (Form, Form Keuangan, Gerbang, SIMPRO), and a live preview row in table form.

## Capabilities

### New Capabilities

- `project-overview`: per-project summary of stage completion, SIMPRO task distribution, work progress, and recent activity, plus the stage-completion action scoped to that project.

### Modified Capabilities

- `project-journey`: project detail is split into Overview and Journey Management tabs; the phase header always shows all fixed phases with zero-step counts; a started phase accepts step add/delete while no work has started; inactive phases can be prepared with steps and default tasks; step creation uses a name/format/preview dialog.
- `work-assignment`: task cards carry an optional Manager alongside the Assignee; the attached Manager can work the card, assign it to another Assignee, and is notified when attached; assignees only see active or completed board stages; working links are opaque non-empty text; the owning PM can move any card status when the card has an owner.

## Impact

- `src/lib/prototype/types.ts`: optional `managerId` on `Task`; no new field for working links because the existing link shape is reused.
- `src/lib/prototype/domain.ts`: active-phase editability and step-activity guards; manager task eligibility, work and assign rules; owning-PM status override; board-stage visibility for assignees; non-empty working-link validation; project overview aggregation helpers.
- `src/lib/prototype/store.ts`: `setPhaseStructure` supports guarded active-phase edits; an action attaches a Manager to a card and notifies them; task visibility/assignment guards include the attached Manager and pending-step guard; audit events.
- `src/components/prototype/crm/project-detail.tsx`: tab shell, Overview composition, `Selesaikan Tahap`/phase actions, and relocation of the step panel.
- `src/components/prototype/crm/journey-management.tsx`: phase header with all fixed phases, phase/step selector, active-phase editing, per-step task summary, and the stage-creation dialog with preview table.
- `src/components/prototype/dialogs.tsx`, `src/components/prototype/simpro/board.tsx`, `src/components/prototype/simpro/project-page.tsx`, and related SIMPRO task surfaces: Manager input, working-link input and `Simpan Link`, stage visibility filters, and Manager-aware actions/notifications.
- `tests/`: active-phase add/delete guards, all-phase header counts, inactive-phase step/task preparation without assignment, overview aggregation, stage-creation preview, board stage visibility, non-empty link handling, owning-PM status override, and Manager work/assign/notify rules.
- `AGENTS.md` and `Docs/`: update journey editing, project overview, board stage visibility, working links, PM status changes, stage creation, and card Manager rules after implementation.
