# Spec Delta

## MODIFIED Requirements

### Requirement: Only one step is active at a time

An active project SHALL have at most one active step. Completing a step SHALL activate the next pending step of the same phase, or the first step of the next phase when the current phase is finished, only when that step has a Manager PIC.

#### Scenario: Activate the next step

- **WHEN** the active step is completed and the next pending step of the same phase has a Manager PIC
- **THEN** that step becomes active and no other step is activated

#### Scenario: Keep the journey idle

- **WHEN** the last step of a phase is completed and the first step of the next phase has no Manager PIC
- **THEN** no step becomes active until a Manager PIC is assigned, and the next phase is still reachable

#### Scenario: Activate after assigning the missing PIC

- **WHEN** the owning PM assigns a Manager PIC to the first pending step of the current phase while no step is active
- **THEN** that step becomes active without another manual step

### Requirement: Phase completion is ordered and Finance cannot be skipped

The system SHALL advance a new-lifecycle project to the next phase when every step of the current phase is Completed or skipped. The owning PM or Admin MAY also complete the phase explicitly under the same conditions. A completed phase MUST NOT be reopened. Finance MUST NOT be skipped, and completing Finance MUST complete the project.

#### Scenario: Block phase completion with an unfinished step

- **WHEN** the current phase contains a step that is neither Completed nor skipped
- **THEN** phase completion is rejected and the phase stays current

#### Scenario: Block an empty phase

- **WHEN** the current phase has no step
- **THEN** phase completion is rejected and at least one step is required

#### Scenario: Advance Planning to Running

- **WHEN** the last Planning step is completed with all Planning steps finished
- **THEN** the transition is audited and the first Running step becomes active or, when it has no Manager PIC, Running becomes the current phase with its first step pending

#### Scenario: Continue after the last step finishes

- **WHEN** the last step of Planning or Running becomes Completed
- **THEN** the project continues to the next phase without requiring the user to find a hidden control

#### Scenario: Complete Finance and the project

- **WHEN** Finance is completed with all Finance steps finished
- **THEN** the project becomes completed, `done`, and read-only

#### Scenario: Reject a reverse transition

- **WHEN** a user tries to complete an earlier phase again or reopen a completed phase
- **THEN** the system rejects the action without changing history

### Requirement: Project detail exposes a five-tab workspace

CRM project detail SHALL show Overview, Journey Management, Board, Backlog, and Forms tabs, with Overview as the initial tab. Every tab SHALL offer `Selesaikan Tahap` for the active step when the user may manage steps.

#### Scenario: Open project detail

- **WHEN** an authorized user opens a project
- **THEN** the workspace shows the five tabs with Overview selected

#### Scenario: Open a legacy project

- **WHEN** a legacy project is opened
- **THEN** the same tabs are available and legacy content stays readable

#### Scenario: Complete a stage from a tab

- **WHEN** the owning PM opens any workspace tab while a step is active and its completion criteria are met
- **THEN** `Selesaikan Tahap` is enabled below the tab bar and completes the step

#### Scenario: Disabled while criteria are unmet

- **WHEN** the active step still has unfinished work, no card, or an unapproved form
- **THEN** `Selesaikan Tahap` is disabled, shows the unmet criteria, and does not report success

#### Scenario: Enable after the last requirement is met

- **WHEN** the final unfinished requirement of the active step is satisfied
- **THEN** `Selesaikan Tahap` becomes enabled without a reload
