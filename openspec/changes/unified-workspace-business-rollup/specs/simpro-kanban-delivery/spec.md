# Spec Delta

## MODIFIED Requirements

### Requirement: Cards never appear in Forms and forms never appear in My Tasks

Task cards MUST appear on boards and in My Tasks only. Form entries MUST appear in Forms and project forms views, but MUST NOT appear as Kanban cards or anywhere on the My Tasks board.

#### Scenario: My Tasks shows cards

- **WHEN** an Assignee opens My Tasks
- **THEN** active cards assigned to them are listed

#### Scenario: Form entry is not a card

- **WHEN** a form entry is assigned to an Assignee
- **THEN** it appears in Forms and is never rendered as a Kanban card

#### Scenario: Forms stay out of My Tasks

- **WHEN** a user has assigned form entries
- **THEN** My Tasks shows only cards and the form work remains in Forms

### Requirement: Project workspace exposes Board and Backlog

CRM project detail MUST offer a Board tab and a Backlog tab for roles with board access. The Board tab MUST show every card of the project across active and completed SIMPRO stages, with the stage selector acting as a filter. The Backlog tab MUST list the project's cards with search and status filters, and an Assignee MUST see only their own cards in both tabs.

#### Scenario: Use the Board tab

- **WHEN** a user opens the Board tab of a project
- **THEN** the board shows cards from the active and completed SIMPRO stages and the stage filter groups those stages as Berjalan and Selesai

#### Scenario: All stages are shown by default

- **WHEN** the user opens the Board tab without a stage filter
- **THEN** cards from every active and completed stage of the project appear on one board

#### Scenario: Stage filter narrows the board

- **WHEN** the user selects one stage in the Board filter
- **THEN** only cards belonging to that stage remain visible

#### Scenario: Completed-stage cards are read-only

- **WHEN** the board includes cards from a completed stage
- **THEN** those cards cannot be moved while cards from the active stage remain movable

#### Scenario: Pending stage is excluded

- **WHEN** a project has a pending SIMPRO stage
- **THEN** its cards are not shown on the Board and the stage is not offered in the filter

#### Scenario: Filter the Backlog tab

- **WHEN** a user searches or filters by status in the Backlog tab
- **THEN** only matching project cards are listed

#### Scenario: Create from Backlog

- **WHEN** the project has an active SIMPRO stage and the user may create cards
- **THEN** the Backlog tab offers a new-task action that uses that active stage

#### Scenario: Assignee boards are scoped

- **WHEN** an Assignee opens the Board or Backlog tab of their project
- **THEN** only cards assigned to that Assignee are shown and no card-creation action is offered

## ADDED Requirements

### Requirement: My Tasks is a single cross-project board

My Tasks MUST present one board containing every card assigned to the current user across all projects. Each card MUST show the project name or code it belongs to, its stage, its priority, and its status column. My Tasks MUST NOT split cards into per-project accordions and MUST NOT offer alternate list or swimlane layouts.

#### Scenario: One board for all projects

- **WHEN** an Assignee has cards on three projects
- **THEN** My Tasks shows the cards in one status board instead of three project accordions

#### Scenario: Card shows its project

- **WHEN** a card is rendered in My Tasks
- **THEN** the card names its project and its stage

#### Scenario: Status columns

- **WHEN** a user opens My Tasks
- **THEN** the board offers the six supported card statuses with counts

#### Scenario: Filters apply to the single board

- **WHEN** the user searches or filters by project or status
- **THEN** only matching cards remain on the same board

#### Scenario: No alternate views

- **WHEN** a user opens My Tasks
- **THEN** no List or Swimlane layout switcher is offered

#### Scenario: Empty My Tasks

- **WHEN** the user has no assigned card
- **THEN** the page shows an empty state explaining that a Manager or Admin must assign work
