# project-journey Specification

## Purpose

Defines how project templates and four fixed phases produce a project journey that is composed and locked phase by phase, gated by a winning client decision, while preserving legacy Umum behaviour.

## Requirements

### Requirement: Project creation starts from a registered template

A project MUST be created from exactly one active template, and the project MUST record the template id and version. The system MUST copy the template stages for the first phase into the project; later changes to the template MUST NOT alter an existing project.

#### Scenario: Create a project from a template
- **WHEN** a PM creates a project and selects the KOL Campaign template
- **THEN** the project stores the KOL template id and version and shows only the Prospek stages copied from that template

#### Scenario: Template edit does not affect existing projects
- **WHEN** an Admin edits or archives a template that a project already used
- **THEN** the existing project keeps its copied stages, order, and progress unchanged

### Requirement: Journey is authored and locked per phase

A project MUST materialize stages only for the phase that is currently due. Stages of a future phase MUST be composed by the PM at the defined transition point, and a phase MUST lock once that phase starts. A locked or completed phase MUST reject adding, removing, reordering, or skipping its stages.

#### Scenario: Only the first phase exists at creation
- **WHEN** a project is created from the Event Program template
- **THEN** only Prospek stages exist and Planning, Running, and Closing stages are not yet materialized

#### Scenario: Future phase is composed at the transition point
- **WHEN** the winning gate is approved for a project
- **THEN** the PM can compose the Planning and Running stages before starting Planning

#### Scenario: Locked phase rejects structural changes
- **WHEN** a user tries to add, remove, reorder, or skip a stage in a phase that has already started or completed
- **THEN** the system rejects the action with a message that the phase is locked

#### Scenario: Completed phase is read-only history
- **WHEN** a phase is completed and the project moves to the next phase
- **THEN** the completed phase's stages remain visible as read-only history and cannot be edited

### Requirement: Winning gate closes the prospecting phase

The Prospek phase MUST end with a client approval gate that records Close Won or Close Loss. Approving the gate MUST set lifecycle `won`, lock the approved RAB as the baseline, and open Planning. Rejecting the gate MUST set lifecycle `lost` with a required reason and MUST end the journey.

#### Scenario: Client approves the proposal
- **WHEN** an authorized user approves the client approval gate with all gate requirements met
- **THEN** the project lifecycle becomes `won`, the RAB baseline is locked, and Planning becomes the active phase

#### Scenario: Client rejects the proposal
- **WHEN** an authorized user rejects the client approval gate without a reason
- **THEN** the system rejects the action and requires a loss reason

#### Scenario: Rejection closes the project
- **WHEN** an authorized user rejects the client approval gate with a reason
- **THEN** the project becomes `lost`, stays complete with history, and becomes read-only

### Requirement: Planning and Running composition is required before execution

After a win, the system MUST require the PM to compose at least one Planning stage and at least one Running stage before Planning can start. Closing MUST NOT be manually composed: BAST, Invoice, and Pembayaran stages MUST be appended from the template rules.

#### Scenario: Planning cannot start empty
- **WHEN** the PM tries to start Planning without any Planning stage
- **THEN** the system blocks the transition and explains that the phase needs at least one stage

#### Scenario: Closing stages are appended by rule
- **WHEN** the PM starts Running
- **THEN** the system appends the template's Closing stages, including the parallel BAST and Invoice finance stages

### Requirement: Event Program Brief Received groups detailed work as entries

The Event Program template MUST represent client briefing work as one Brief Received stage. Create Strategy & Concept, Create KV & Key Visual Assets, Contact Vendor, Site Survey, Budget & Quotation Review, and Vendor Selection MUST be entry types under Brief Received, not separate stages. Client Approval MUST remain the winning gate stage.

#### Scenario: Event journey reflects briefing entries
- **WHEN** a project is created from the Event Program template
- **THEN** Brief Received appears as one Prospek stage and the six briefing activities appear as entries under it

#### Scenario: Briefing entries are tracked per project
- **WHEN** the PM creates or assigns a briefing entry under Brief Received
- **THEN** the entry follows the existing Form entry lifecycle of assign, fill, submit, and review

#### Scenario: KOL keeps its stage list
- **WHEN** a project is created from the KOL Campaign template
- **THEN** Listing and Rate Inquiry remain separate Prospek stages

### Requirement: Media owns defined journey steps

The Media role MUST be the default responsible role for Event steps 4 through 12, for KOL Listing and Rate Inquiry, and for BAST document handling. Those stages and entries MUST be assignable to a Media user.

#### Scenario: Media is offered as responsible role
- **WHEN** a PM configures Event or KOL stages
- **THEN** the Media role is available for the relevant stages and entries

#### Scenario: Media can be assigned those entries
- **WHEN** a Manager allocates an Event briefing entry or a BAST entry
- **THEN** a Media user can be selected as the assignee

### Requirement: Progress counts only materialized stages

Journey progress MUST be the weighted share of completed materialized stages over non-skipped materialized stages. Future phases that are not yet materialized MUST NOT appear in the denominator. The Umum template MUST continue to produce the legacy progress values.

#### Scenario: Future phases do not dilute progress
- **WHEN** a project has completed all materialized Prospek stages and no later phase is composed
- **THEN** journey progress is 100 percent for the current scope

#### Scenario: Umum progress matches legacy numbers
- **WHEN** an Umum project completes Pitching, Survey, RAB, and Running with BAST and Invoice submitted
- **THEN** journey progress equals the value produced by the legacy formula

### Requirement: Existing projects migrate without changing history

Projects stored before this change MUST be mapped to the per-phase model using their existing stages and history. Migration MUST be idempotent and MUST NOT change recorded form versions or audit events.

#### Scenario: Legacy project is mapped to phases
- **WHEN** the persisted data is loaded after the change
- **THEN** the legacy project keeps its six Umum stages, lifecycle, and progress, and receives a migration audit event

#### Scenario: Migration runs twice safely
- **WHEN** the migration executes on data that is already migrated
- **THEN** no duplicate stages or migration events are created

### Requirement: Lost and cancelled projects stay complete and read-only

Projects with lifecycle `lost` or `cancelled` MUST keep their history and MUST be excluded from workload and group completion denominators. They MUST reject stage, task, and form edits.

#### Scenario: Lost project is read-only
- **WHEN** a user opens a lost project's stages
- **THEN** all stages and forms are read-only and an explanation is shown

#### Scenario: Cancelled project does not block a group
- **WHEN** a group contains a cancelled project
- **THEN** group completion is calculated from the remaining non-cancelled projects
