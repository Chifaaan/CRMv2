# Spec Delta

## MODIFIED Requirements

### Requirement: Journey is authored and locked per phase

A project MUST materialize stages only for the phase that is currently due. Stages of a future phase MUST be composed by the PM at the defined transition point, and a phase MUST lock once that phase starts. A locked or completed phase MUST reject reordering, editing, and skipping its stages. A started phase MAY accept a new step or delete an existing step only while that step has no work in progress: no form entry in draft, submitted, or review, and no task card past Backlog.

#### Scenario: Only the first phase exists at creation
- **WHEN** a project is created from the Event Program template
- **THEN** only Prospek stages exist and Planning, Running, and Closing stages are not yet materialized

#### Scenario: Future phase is composed at the transition point
- **WHEN** the winning gate is approved for a project
- **THEN** the PM can compose the Planning and Running stages before starting Planning

#### Scenario: Prospek is edited before it starts
- **WHEN** a PM adds, edits, reorders, or deletes a Prospek step before starting the journey
- **THEN** the change is saved and audited, and the phase remains unlocked

#### Scenario: Prospek locks when the first step starts
- **WHEN** the PM starts the journey with a valid Prospek structure
- **THEN** the first step becomes active and the Prospek phase becomes locked for reordering and editing

#### Scenario: Locked phase rejects structural changes
- **WHEN** a user tries to edit, reorder, or skip a step in a phase that has started or completed
- **THEN** the system rejects the action with a message that the phase is locked

#### Scenario: Started phase accepts a step with no work
- **WHEN** the PM adds a step to a phase that has already started and no step in that phase has a draft, submitted, or review form entry or a task past Backlog
- **THEN** the new step is added as pending and the change is audited

#### Scenario: Started phase deletes an unstarted step
- **WHEN** the PM deletes a step from a started phase and that step has no draft, submitted, or review form entry and no task past Backlog
- **THEN** the step is removed and the change is audited

#### Scenario: Started phase rejects deleting a step with work
- **WHEN** the PM tries to delete a step whose form entry is draft, submitted, or in review, or whose task card has left Backlog
- **THEN** the system rejects the deletion and explains that the step already has work

#### Scenario: Completed phase is read-only history
- **WHEN** a phase is completed and the project moves to the next phase
- **THEN** the completed phase's stages remain visible as read-only history and cannot be edited

## ADDED Requirements

### Requirement: Journey Management is a project detail tab

CRM project detail MUST expose Journey Management as its own tab next to Overview. The tab MUST manage the journey of the single opened project and MUST NOT show another project's phases or steps.

#### Scenario: Journey Management tab opens the journey
- **WHEN** the user selects the `Journey Management` tab
- **THEN** the journey editor for the opened project is shown

#### Scenario: Journey tab stays within one project
- **WHEN** the user adds or deletes a step from the Journey Management tab
- **THEN** only the opened project's journey changes

### Requirement: Journey header lists every fixed phase

The journey header MUST list all four fixed phases — Prospek, Planning, Running, and Closing — in the fixed order, including phases that have no materialized steps. A phase with no steps MUST display `0 Tahap`, and an inactive phase MUST remain selectable without starting it.

#### Scenario: Inactive phase still appears
- **WHEN** a project has only Prospek steps
- **THEN** Planning, Running, and Closing still appear in the header with `0 Tahap`

#### Scenario: Active phase is distinguished
- **WHEN** Planning is the current phase
- **THEN** the header marks Planning as running and shows its step count

#### Scenario: Header selection opens a phase
- **WHEN** the user clicks an inactive phase in the header
- **THEN** that phase's steps and status are shown without changing the project's active phase

### Requirement: Journey Management manages phases and steps

The owning PM or Admin MUST be able to select a phase and a step, then add, edit, reorder, and delete steps in an editable phase. The step selector MUST list the steps of the selected phase. Non-managers MUST see the journey read-only.

#### Scenario: PM selects a phase and step
- **WHEN** the PM chooses Planning and then a Planning step
- **THEN** the step list and the selected step's information reflect that choice

#### Scenario: PM edits and reorders pending steps
- **WHEN** the PM edits a step name or moves a step up or down in a phase that is not locked
- **THEN** the new order is saved and audited

#### Scenario: Non-manager sees read-only controls
- **WHEN** a Manager, Finance, Assignee, Media, or BOD user opens Journey Management
- **THEN** step and phase controls are read-only

### Requirement: Steps and default tasks can be prepared before a phase is active

A PM MUST be able to create steps and template default tasks for a phase that has been opened but has not started. Prepared steps MUST be pending, prepared tasks MUST remain in Backlog and unassigned, and the PM MUST NOT assign them.

#### Scenario: PM prepares a future phase
- **WHEN** the PM adds a step to an opened phase that has not started
- **THEN** the step is stored as pending and appears in the header count for that phase

#### Scenario: Prepared tasks are unassigned
- **WHEN** the PM creates template default tasks for a pending step
- **THEN** each task is stored in Backlog without an assignee

#### Scenario: PM cannot assign prepared tasks
- **WHEN** the PM attempts to assign a prepared task to an Assignee or Media user
- **THEN** the system rejects the assignment

### Requirement: Selected step shows its work

Journey Management MUST show the selected step's task information below the phase editor, including total, completed, and active task counts, and MUST offer a link to the SIMPRO board for SIMPRO steps.

#### Scenario: SIMPRO step shows task counts
- **WHEN** the PM selects a SIMPRO step with five tasks, two completed, and three active
- **THEN** Journey Management shows 5 total, 2 completed, and 3 active tasks

#### Scenario: Empty step shows an empty state
- **WHEN** the selected step has no tasks
- **THEN** Journey Management shows that there are no tasks yet and how to create them

#### Scenario: SIMPRO step links to the board
- **WHEN** the selected step is a SIMPRO step
- **THEN** Journey Management offers a `Buka Board` action for that step

### Requirement: A phase completes only when all its steps are done

Journey Management MUST offer a `Selesaikan fase` action for the selected phase. The action MUST be disabled until every step in that phase is completed or skipped, and when invoked it MUST complete the phase and advance the project according to the existing phase rules.

#### Scenario: Incomplete phase cannot be finished
- **WHEN** the selected phase still has an active or pending step
- **THEN** `Selesaikan fase` is disabled

#### Scenario: Completing a phase advances the project
- **WHEN** every step in the selected phase is completed or skipped and the PM uses `Selesaikan fase`
- **THEN** the phase is completed and the next phase becomes active or Closing is appended by rule

### Requirement: Stage creation uses a format preview dialog

Creating a step in Journey Management MUST open a dialog that asks for the stage name and stage format, and MUST show a live preview of the new row as a table before saving. The format MUST be one of Form, Form Keuangan, Gerbang, or SIMPRO. The dialog MUST NOT create a step when cancelled or when the name is empty.

#### Scenario: Creating a step opens the dialog
- **WHEN** the PM selects `+ Tambah step`
- **THEN** a dialog opens with a stage-name input, a format selector, and a preview table

#### Scenario: Preview follows the inputs
- **WHEN** the PM types a name or changes the format
- **THEN** the preview row updates its name, format, order, and pending status immediately

#### Scenario: Format options match the stage kinds
- **WHEN** the PM opens the format selector
- **THEN** Form, Form Keuangan, Gerbang, and SIMPRO are available

#### Scenario: Empty name is rejected
- **WHEN** the PM tries to save a step without a name
- **THEN** the dialog stays open and explains that the name is required

#### Scenario: Cancelling creates nothing
- **WHEN** the PM closes the dialog without saving
- **THEN** no step is added to the phase
