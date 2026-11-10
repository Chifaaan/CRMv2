# Spec Delta

## REMOVED Requirements

### Requirement: Project creation starts from a registered template
**Reason**: A template is now a recommendation for pre-filling Prospek steps, not a requirement for creating a project.
**Migration**: Existing projects keep their recorded template id/version and copied steps. New projects may omit `templateId` or record the template used to pre-fill steps; no persisted field is removed.

## MODIFIED Requirements

### Requirement: Journey is authored and locked per phase

A project MUST materialize steps only for phases that are open. Steps MUST be authored before a phase starts, and a phase MUST lock when its first step starts. Prospek MUST be authored after project creation and MUST lock when the PM starts the journey. A locked or completed phase MUST reject adding, editing, reordering, deleting, or skipping its steps. Existing projects keep their recorded started and locked state.

#### Scenario: Only the first phase exists at creation
- **WHEN** a project is created
- **THEN** the Prospek phase exists with zero or more pending steps and no Planning, Running, or Closing steps are materialized

#### Scenario: Future phase is composed at the transition point
- **WHEN** the winning gate is approved for a project
- **THEN** the PM can compose the Planning and Running steps before starting Planning

#### Scenario: Prospek is edited before it starts
- **WHEN** a PM adds, edits, reorders, or deletes a Prospek step before starting the journey
- **THEN** the change is saved and audited, and the phase remains unlocked

#### Scenario: Prospek locks when the first step starts
- **WHEN** the PM starts the journey with a valid Prospek structure
- **THEN** the first step becomes active and the Prospek phase becomes locked

#### Scenario: Locked phase rejects structural changes
- **WHEN** a user tries to add, edit, reorder, delete, or skip a step in a phase that has started or completed
- **THEN** the system rejects the action with a message that the phase is locked

#### Scenario: Completed phase is read-only history
- **WHEN** a phase is completed and the project moves to the next phase
- **THEN** the completed phase's steps remain visible as read-only history and cannot be edited

### Requirement: Planning and Running composition is required before execution

After a win, or after the final Prospek step of a legacy journey, the PM MUST compose at least one Planning step and at least one Running step before Planning can start. Legacy Umum MAY have no Planning step. Closing MUST NOT be manually composed; the system appends its steps when Running starts.

#### Scenario: Planning cannot start empty
- **WHEN** the PM tries to start Planning without any Planning step
- **THEN** the system blocks the transition and explains that the phase needs at least one step

#### Scenario: Planning waits for Prospek completion
- **WHEN** the PM tries to start Planning while a Prospek step is still active
- **THEN** the system blocks the transition

#### Scenario: Running cannot start empty
- **WHEN** the PM tries to start Running without any Running step
- **THEN** the system blocks the transition and explains that the phase needs at least one step

#### Scenario: Closing stages are appended by rule
- **WHEN** the PM starts Running
- **THEN** the system appends the Closing steps, including the parallel BAST and Invoice finance steps

#### Scenario: Legacy Umum may skip Planning
- **WHEN** the PM starts Running for a legacy Umum project that has no Planning steps
- **THEN** the system allows the transition

## ADDED Requirements

### Requirement: Project creation may start without a template

A project MUST be creatable without a template. Selecting a template MUST only pre-fill Prospek steps as a recommendation; it MUST NOT constrain adding, editing, reordering, or deleting steps. The project MAY record the template id and version used for pre-fill.

#### Scenario: Create a project without a template
- **WHEN** a PM creates a project and does not select a template
- **THEN** the project is created with an empty Prospek phase and no template id

#### Scenario: Template pre-fills an empty Prospek phase
- **WHEN** a PM selects a template while creating a project
- **THEN** the template's Prospek steps are copied as pending steps and the PM may still edit, reorder, or delete them

#### Scenario: Template edit does not affect an existing project
- **WHEN** an Admin edits or archives a template that a project previously used for pre-fill
- **THEN** the project keeps its copied steps, order, and progress unchanged

### Requirement: Prospek remains editable until the journey starts

New projects MUST create Prospek steps as pending. The owning PM or Admin MUST start the journey explicitly; starting MUST validate the Prospek structure, activate the first step, record the start, and lock Prospek. A project with no Prospek steps MUST NOT start.

#### Scenario: New Prospek steps are pending
- **WHEN** a project is created with or without template steps
- **THEN** every Prospek step is pending and no Prospek step has started

#### Scenario: Empty Prospek cannot start
- **WHEN** the PM tries to start a journey with zero Prospek steps
- **THEN** the system rejects the start and explains that at least one step is required

#### Scenario: Starting activates the first step
- **WHEN** the PM starts a valid journey
- **THEN** the first pending Prospek step or parallel group becomes active, the phase records a start time, and the start is audited

#### Scenario: Starting locks Prospek
- **WHEN** a journey has started
- **THEN** Journey Management rejects further structural changes to Prospek

### Requirement: Manual journeys require a winning gate before starting

A non-legacy journey MUST contain exactly one client-approval gate. The gate MUST be the final Prospek step, and it MUST be present before the journey starts. Legacy Umum journeys MUST be exempt and keep their six-step flow without a client-approval gate.

#### Scenario: Missing winning gate blocks start
- **WHEN** a PM tries to start a non-legacy journey without a client-approval gate
- **THEN** the system rejects the start and identifies the missing winning gate

#### Scenario: Duplicate or misplaced winning gate blocks start
- **WHEN** a non-legacy Prospek has more than one client-approval gate or the gate is not the final step
- **THEN** the system rejects the start and explains the required gate placement

#### Scenario: Legacy Umum starts without a winning gate
- **WHEN** a PM starts an Umum journey that has no client-approval gate
- **THEN** the journey starts and keeps the legacy Pitching, Survey, RAB, Running, BAST, and Invoice flow

### Requirement: Journey Management manages unlocked phases

Project detail MUST provide a Journey Management section where the owning PM or Admin selects a phase and manages its steps. It MUST support adding, editing, reordering, deleting, and template-filling steps. Management MUST be limited to Prospek before start and to open Planning/Running phases before start; Closing MUST be shown as rule-driven and not editable.

#### Scenario: PM manages Prospek from project detail
- **WHEN** the PM opens Journey Management before the journey starts
- **THEN** the PM can add, edit, reorder, delete, and template-fill Prospek steps

#### Scenario: PM manages a future phase before it starts
- **WHEN** a phase has been opened and has not started
- **THEN** the PM can manage that phase's steps in Journey Management

#### Scenario: Closing is rule-driven
- **WHEN** the PM selects Closing in Journey Management
- **THEN** the section shows that Closing steps are appended by the system and offers no structural edit controls

#### Scenario: Non-managers cannot manage the journey
- **WHEN** a Manager, Finance, Assignee, Media, or BOD user attempts to change journey steps
- **THEN** the system rejects the action

### Requirement: Manual steps follow stage-kind rules

Manual steps MUST use one of the four stage kinds: Form, Form Keuangan, Gerbang, or SIMPRO. A Form step MUST have a form template; a Form Keuangan step MUST select RAB, BAST, Invoice, or Pembayaran and a project MUST NOT contain duplicate finance kinds; a Gerbang step MUST select a gate kind; a SIMPRO step MUST use task cards.

#### Scenario: Manual Form step gets a template
- **WHEN** a PM adds a Form step manually
- **THEN** the step is created with an editable form template title and default fields

#### Scenario: Duplicate finance kind is rejected
- **WHEN** a PM adds a Form Keuangan step whose finance kind already exists in the project
- **THEN** the system rejects the step and explains that each finance form type can exist once

#### Scenario: Gate kind is required
- **WHEN** a PM adds a Gerbang step without choosing a gate kind
- **THEN** the system rejects the step and requires a gate kind

#### Scenario: SIMPRO step uses the board
- **WHEN** a PM adds a SIMPRO step manually
- **THEN** the step is created without default tasks and work is managed through task cards on the SIMPRO board

### Requirement: Closing always contains BAST and Invoice

When Running starts, the system MUST materialize Closing steps. Once materialized, Closing MUST contain exactly one BAST and exactly one Invoice finance step, with parallel finance grouping and weights that preserve legacy progress. A template MAY add other Closing steps; when no template Closing steps exist, the system MUST append BAST, Invoice, and Pembayaran defaults.

#### Scenario: Template with Closing stages is used
- **WHEN** Running starts for a project whose template defines Closing stages
- **THEN** those stages are appended and any missing BAST or Invoice stage is added by the system

#### Scenario: No template Closing stages
- **WHEN** Running starts for a project without a template or with no Closing stages
- **THEN** the system appends BAST, Invoice, and Pembayaran defaults

#### Scenario: Finance steps are parallel
- **WHEN** Closing is materialized
- **THEN** BAST and Invoice share the finance parallel group and can run at the same time

#### Scenario: Closing is locked to the system
- **WHEN** a user tries to delete BAST or Invoice from a project
- **THEN** the system rejects the action because Closing is appended by rule
