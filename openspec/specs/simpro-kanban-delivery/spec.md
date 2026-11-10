# simpro-kanban-delivery Specification

## Purpose

Defines how project stages become SIMPRO Kanban delivery: which stages are reachable, how cards move between statuses, how completion is proven, and how Assignees, Managers, and Media see only the work that belongs to them.

## Requirements

### Requirement: Only active and completed stages are reachable

A SIMPRO stage MUST come from a project step of kind SIMPRO. The board MUST offer only stages that are active or completed, MUST default to the active stage, and MUST NOT expose pending stages through the selector or a deep link.

#### Scenario: Default stage
- **WHEN** a user opens a Board with one active SIMPRO stage
- **THEN** the board opens on that active stage

#### Scenario: Pending stage is hidden
- **WHEN** a project has a pending SIMPRO stage
- **THEN** the stage is not selectable and a deep link to it shows the default stage instead

#### Scenario: Completed stage stays reachable
- **WHEN** a stage is completed
- **THEN** it is still listed in the selector and opens read-only

### Requirement: Completed stages are read-only

A completed stage MUST show its cards without allowing creation, allocation, transition, or review. A pending stage MUST NOT accept cards either.

#### Scenario: Open a completed stage
- **WHEN** a user opens a completed stage
- **THEN** its cards are visible and every card action is disabled

#### Scenario: Create a card on a completed stage
- **WHEN** a PM tries to create a card on a completed stage
- **THEN** the action is rejected

### Requirement: Cards follow six fixed statuses

Every card MUST be in exactly one of `backlog`, `todo`, `in_progress`, `awaiting_approval`, `need_revision`, or `completed`. Cards MUST carry the stage they belong to, and the board MUST show that stage on the card.

#### Scenario: New card starts in backlog
- **WHEN** a PM creates a card on the active SIMPRO stage
- **THEN** the card is stored in `backlog` with that stage

#### Scenario: Card shows its stage
- **WHEN** a card is displayed on the board
- **THEN** the card shows its stage name

#### Scenario: No extra statuses
- **WHEN** a user inspects the board columns
- **THEN** only the six supported statuses are offered

### Requirement: Delivery follows the card lifecycle

A card MUST move from backlog to todo on allocation, to in_progress when work starts, to awaiting_approval when submitted, to need_revision or completed on review. Only the owning PM or an Admin MUST review, and a Manager assignee MUST NOT review their own card.

#### Scenario: Submit a card
- **WHEN** the assignee submits an in-progress card
- **THEN** the card moves to awaiting_approval

#### Scenario: Request revision
- **WHEN** the owning PM requests revision with a comment
- **THEN** the card moves to need_revision and the comment is visible to the assignee

#### Scenario: Approve a card
- **WHEN** the owning PM approves a submitted card
- **THEN** the card becomes completed

#### Scenario: Manager assignee review is blocked
- **WHEN** the Manager who is the assignee of a submitted card tries to approve it
- **THEN** the review is denied

### Requirement: Stage completion requires delivered cards

A new-lifecycle SIMPRO step MUST NOT complete without at least one non-cancelled card, and every remaining card MUST be Completed. Legacy steps MAY instead confirm no work with an audited note.

#### Scenario: Complete a delivered stage
- **WHEN** every remaining card of the step is Completed
- **THEN** the owning PM can complete the step

#### Scenario: Block an empty new-lifecycle stage
- **WHEN** a new-lifecycle stage has no card
- **THEN** completion is rejected

#### Scenario: Legacy no-work confirmation
- **WHEN** a legacy stage has no card and the PM confirms no work with a note
- **THEN** the step can be completed and the confirmation is audited

### Requirement: Board access is scoped by role

PM MUST see boards of their own projects. Manager and Admin MUST see every board. Assignee and Media MUST see only cards assigned to them, and Finance MUST NOT use the Kanban board.

#### Scenario: Assignee board is filtered
- **WHEN** an Assignee opens a board
- **THEN** only cards assigned to that Assignee are shown

#### Scenario: Media board is filtered
- **WHEN** a Media user opens a board
- **THEN** only cards assigned to that Media user are shown

#### Scenario: Finance has no board work
- **WHEN** a Finance user opens the Board tab
- **THEN** the system explains that Finance works through the Forms tab

### Requirement: Cards never appear in Forms and forms never appear in My Tasks

Task cards MUST appear on boards and in My Tasks only. Form entries MUST appear in Forms, My Tasks assignment lists, and project forms views, but MUST NOT appear as Kanban cards.

#### Scenario: My Tasks shows cards
- **WHEN** an Assignee opens My Tasks
- **THEN** active cards assigned to them are listed

#### Scenario: Form entry is not a card
- **WHEN** a form entry is assigned to an Assignee
- **THEN** it appears in Forms and is never rendered as a Kanban card

### Requirement: Project workspace exposes Board and Backlog

CRM project detail MUST offer a Board tab and a Backlog tab. The Board tab MUST reuse the SIMPRO board for the selected stage, and the Backlog tab MUST list the project's cards with search and status filters.

#### Scenario: Use the Board tab
- **WHEN** a user opens the Board tab of a project
- **THEN** the stage selector lists the active and completed SIMPRO stages of that project

#### Scenario: Filter the Backlog tab
- **WHEN** a user searches or filters by status in the Backlog tab
- **THEN** only matching project cards are listed

#### Scenario: Create from Backlog
- **WHEN** the project has an active SIMPRO stage and the user may create cards
- **THEN** the Backlog tab offers a new-task action that uses that active stage
