# Spec Delta

## REMOVED Requirements

### Requirement: Project creation starts from a registered template
**Reason**: Creation now supports template mode and manual mode; only template mode copies stages, and template compatibility is limited to execution templates.
**Migration**: Projects keep their stored template id and version. Manual projects record no template and receive no steps at creation.

### Requirement: Journey is authored and locked per phase
**Reason**: The four-fixed-phase model is replaced by a three-phase execution lifecycle where the owner starts Planning or Running explicitly and manages pending steps after creation.
**Migration**: Existing materialized steps keep their phase and status; `closing` steps are migrated to `finance`.

### Requirement: Winning gate closes the prospecting phase
**Reason**: The Prospek phase, its winning gate, and Pitching are removed from the project journey. Projects are created directly and this change does not introduce a Prospek module.
**Migration**: Legacy projects that still hold gate and Prospek-phase steps remain readable and operable as legacy records.

### Requirement: Planning and Running composition is required before execution
**Reason**: Composition is replaced by choosing an initial phase (Planning or Running) and completing phases in order; Finance is appended by rule.
**Migration**: Projects with composed stages keep them; no stage is dropped.

### Requirement: Event Program Brief Received groups detailed work as entries
**Reason**: Templates no longer define stage entry types; new projects compose steps manually or from execution templates.
**Migration**: Legacy Event Program projects keep their existing stage structure and history.

### Requirement: Media owns defined journey steps
**Reason**: Media responsibility is expressed through assignment of Kanban cards and BAST forms rather than template-level step ownership.
**Migration**: Existing Media assignments remain valid and visible in My Tasks and the board.

### Requirement: Progress counts only materialized stages
**Reason**: Progress now depends on creation mode: manual projects report a completed step count, template and legacy projects report a percentage.
**Migration**: Legacy progress uses the same completed/non-skipped share as before.

### Requirement: Existing projects migrate without changing history
**Reason**: Replaced by a broader migration contract that also covers media orders, work links, and Finance phase mapping.
**Migration**: The new migration runs once for existing state and is idempotent.

### Requirement: Lost and cancelled projects stay complete and read-only
**Reason**: Re-added with the same intent under the new lifecycle and Finance phase.
**Migration**: Existing lifecycle and cancellation reasons are preserved.

## ADDED Requirements

### Requirement: New projects use Planning, Running, and Finance
New projects SHALL use the fixed phase order Planning → Running → Finance. Prospek SHALL NOT be a phase or a step of a new project, and projects SHALL NOT be converted from a Pitching. Prospek-phase steps from older projects SHALL remain readable as legacy history.

#### Scenario: Create a project without Prospek steps
- **WHEN** a PM or Admin creates a new project
- **THEN** the project contains only Planning, Running, and Finance phases and no Prospek step

#### Scenario: Projects are created directly
- **WHEN** a user creates a project
- **THEN** the project is created from the creation dialog or template, without an opportunity-conversion step

#### Scenario: Legacy Prospek steps remain visible
- **WHEN** a project created earlier still has Prospek-phase steps
- **THEN** those steps and their statuses stay available as legacy history

### Requirement: Project creation offers template and manual modes
A project MUST be created in template mode or manual mode. Template mode MUST copy the stages of one active execution template and record its id and version. Manual mode MUST create the project with no steps. The creator MAY set an optional project Manager.

#### Scenario: Create a project from an execution template
- **WHEN** a PM creates a project in template mode and selects KOL Eksekusi
- **THEN** the project stores the template id and version and receives the copied Planning, Running, and Finance stages

#### Scenario: Create a manual project
- **WHEN** a PM creates a project in manual mode
- **THEN** the project is created with no steps and an empty journey

#### Scenario: Template edits do not affect existing projects
- **WHEN** an Admin later edits or archives the template used by a project
- **THEN** that project keeps its copied stages, order, and progress

#### Scenario: Optional project Manager
- **WHEN** the creator selects a Manager during creation
- **THEN** the project records that Manager and the assignment is audited

### Requirement: A project stays NEW until its owner starts it
A new project MUST remain unstarted until its owning PM or Admin chooses an initial phase. Only Planning or Running MUST be offered. Other roles MUST see that the project is waiting for its PM.

#### Scenario: Owner starts from Planning
- **WHEN** the owning PM starts an unstarted project from Planning
- **THEN** the first Planning step becomes active and the NEW Project marker is removed

#### Scenario: Owner starts from Running
- **WHEN** the owning PM starts an unstarted project directly in Running
- **THEN** Planning is marked skipped and the project moves to Running

#### Scenario: Finance cannot be the initial phase
- **WHEN** the owner tries to start a project in Finance
- **THEN** the action is rejected and Finance stays unavailable until Running is completed

#### Scenario: Non-owner sees a waiting project
- **WHEN** a Manager, Assignee, Finance, or Media user opens an unstarted project
- **THEN** the project explains that it is waiting for its PM to start

### Requirement: A start requires a Manager PIC
Starting a project and activating a step MUST require a Manager PIC for the step that becomes active. Activation MUST be rejected when no Manager PIC is set.

#### Scenario: Start without Manager PIC
- **WHEN** the owning PM tries to start a project without a Manager PIC
- **THEN** the system rejects the start and asks for a Manager PIC

#### Scenario: Activation without Manager PIC
- **WHEN** a pending step is selected for activation but has no Manager PIC
- **THEN** the step stays pending and no other step becomes active

### Requirement: Only one step is active at a time
An active project SHALL have at most one active step. Completing a step MAY activate the next pending step of the current or next phase only when that step has a Manager PIC.

#### Scenario: Activate the next step
- **WHEN** the active step is completed and the next pending step has a Manager PIC
- **THEN** that step becomes active and no other step is activated

#### Scenario: Keep the journey idle
- **WHEN** the active step is completed and the next pending step has no Manager PIC
- **THEN** no step becomes active until a Manager PIC is assigned

### Requirement: Step management follows lifecycle state
Only the owning PM or Admin SHALL manage steps. Pending steps in Planning and Running MAY be added, edited, removed, or reordered while the project is active; active and completed steps MAY only change name, Manager PIC, and description.

#### Scenario: Manage a pending step
- **WHEN** the owning PM renames, reorders, or removes a pending step
- **THEN** the change is applied and recorded in project history

#### Scenario: Edit a started step
- **WHEN** the owning PM edits an active or completed step
- **THEN** only its name, Manager PIC, or description can change and both values are audited

#### Scenario: Unauthorized step change
- **WHEN** a Manager, Assignee, Finance, Media, or non-owning PM tries to manage a step
- **THEN** the change is rejected

### Requirement: Step completion requires finished work
A step SHALL be completed only when its own work is finished: SIMPRO steps need at least one non-cancelled card with every remaining card Completed, Form steps need all non-cancelled entries approved, Gate steps need a decision, and Finance steps need an approved form. Legacy steps MAY instead use an explicit no-work confirmation.

#### Scenario: Complete a SIMPRO step
- **WHEN** the owning PM completes a SIMPRO step whose remaining cards are all Completed
- **THEN** the step becomes completed and the completion is audited

#### Scenario: Reject an unfinished step
- **WHEN** a SIMPRO step still has a card that is not Completed
- **THEN** completion is rejected and the outstanding work is identified

#### Scenario: Complete a legacy step with no work
- **WHEN** a legacy step has no work and the PM confirms no work with a note
- **THEN** the step can be completed and the confirmation is audited

### Requirement: Phase completion is ordered and Finance cannot be skipped
The owning PM or Admin SHALL complete a phase only when it is the current phase, has at least one step, and every step is Completed or skipped. A completed phase MUST NOT be reopened. Finance MUST NOT be skipped, and completing Finance MUST complete the project.

#### Scenario: Block phase completion with an unfinished step
- **WHEN** the current phase contains a step that is neither Completed nor skipped
- **THEN** phase completion is rejected

#### Scenario: Block an empty phase
- **WHEN** the current phase has no step
- **THEN** phase completion is rejected and at least one step is required

#### Scenario: Advance Planning to Running
- **WHEN** Planning is completed with all steps finished
- **THEN** the transition is audited and Running becomes the current phase

#### Scenario: Complete Finance and the project
- **WHEN** Finance is completed with all Finance steps finished
- **THEN** the project becomes completed, `done`, and read-only

#### Scenario: Reject a reverse transition
- **WHEN** a user tries to complete an earlier phase again or reopen a completed phase
- **THEN** the system rejects the action without changing history

### Requirement: Entering Finance creates BAST and Invoice steps
When a new-lifecycle project completes Running, the system SHALL create BAST and Invoice Finance steps if they are missing. PM and Admin SHALL still be able to add other Finance steps, and existing BAST or Invoice steps MUST NOT be duplicated.

#### Scenario: Running completes into Finance
- **WHEN** Running is completed on a new-lifecycle project
- **THEN** BAST and Invoice steps exist in Finance

#### Scenario: Keep existing Finance steps
- **WHEN** the project already has a BAST or Invoice step
- **THEN** the system does not duplicate it

#### Scenario: Backfill an active Finance project
- **WHEN** an active Finance project lacks BAST or Invoice
- **THEN** the missing step is created without changing other steps

### Requirement: Project detail exposes a five-tab workspace
CRM project detail SHALL show Overview, Journey Management, Board, Backlog, and Forms tabs, with Overview as the initial tab. Every tab SHALL offer `Selesaikan Tahap` for the active step when the user may manage steps.

#### Scenario: Open project detail
- **WHEN** an authorized user opens a project
- **THEN** the workspace shows the five tabs with Overview selected

#### Scenario: Open a legacy project
- **WHEN** a legacy project is opened
- **THEN** the same tabs are available and legacy content stays readable

#### Scenario: Complete a stage from a tab
- **WHEN** the owning PM opens any workspace tab while a step is active
- **THEN** `Selesaikan Tahap` is available below the tab bar

### Requirement: Overview summarises the project
The Overview tab SHALL show project attribution (Group when present), step completion, task distribution, progress overview, and recent activity. Distribusi task and Progress overview MUST appear above the activity history.

#### Scenario: Show project attribution
- **WHEN** a project belongs to a Group
- **THEN** Overview shows the Group name alongside the project identity

#### Scenario: Show task distribution
- **WHEN** the project has SIMPRO cards
- **THEN** Overview shows counts per status, Completed, Open, Overdue, and the completion percentage for this project only

#### Scenario: Show history
- **WHEN** the user opens Overview
- **THEN** recent project events are listed newest first with actor and summary

### Requirement: Progress reflects the creation mode
Manual projects SHALL report progress as the number of completed steps. Template and legacy projects SHALL report a percentage computed from completed non-skipped steps.

#### Scenario: Manual project progress
- **WHEN** a manual project has three steps and one is completed
- **THEN** its progress reads as a completed step count, not a percentage

#### Scenario: Template project progress
- **WHEN** a template project has completed and skipped steps
- **THEN** its percentage uses completed steps over non-skipped steps

### Requirement: Legacy journeys survive the phase port
Persisted projects SHALL keep their Prospek-phase steps, statuses, forms, groups, and audit history. `closing` steps and templates SHALL be migrated to `finance` without user action, and the migration MUST be idempotent.

#### Scenario: Migrate a Closing step
- **WHEN** persisted state contains a Closing-phase step
- **THEN** the step keeps its status and history under Finance

#### Scenario: Preserve a legacy Prospek journey
- **WHEN** an existing project has Prospek steps or a ProjectGroup
- **THEN** both remain intact and the project stays operable

#### Scenario: Run the migration twice
- **WHEN** the same persisted state is migrated more than once
- **THEN** no steps, events, groups, or media orders are duplicated

### Requirement: Closed projects remain complete and read-only
Projects with lifecycle `lost` or `cancelled` MUST keep their history, MUST be read-only, and MUST be excluded from workload and group completion denominators.

#### Scenario: Lost project is read-only
- **WHEN** a user opens a lost project
- **THEN** its steps, cards, and forms are read-only and an explanation is shown

#### Scenario: Cancelled project is excluded from group progress
- **WHEN** a group contains a cancelled project
- **THEN** group completion is computed from the remaining non-cancelled projects
