# Spec Delta

## Purpose

Defines how work cards move through SIMPRO Kanban steps in Planning and Running, including assignment, review, required work links, access, and auditable cancellation.

## ADDED Requirements

### Requirement: Planning and Running steps use the existing SIMPRO Kanban
Each active Planning or Running step SHALL use the existing SIMPRO columns Backlog, To Do, In Progress, Awaiting Approval, Need Revision, and Completed.

#### Scenario: Open a project board
- **WHEN** an authorized user opens a project's board
- **THEN** the board shows cards for the active step by default and identifies the step on each card

#### Scenario: Open a completed step
- **WHEN** a user views a completed step's board
- **THEN** its cards are read-only and retain their status and history

#### Scenario: Keep Finance out of Kanban
- **WHEN** the active project phase is Finance
- **THEN** Finance work is presented as CRM Form Keuangan and not as SIMPRO cards

### Requirement: PM creates unassigned cards and Managers assign them
The owning PM or Admin SHALL create cards in Backlog without an assignee; any Manager or Admin SHALL be able to assign a card on any PM's project, independently of the step's Manager PIC.

#### Scenario: Create a card
- **WHEN** the owning PM or Admin creates a card in an active SIMPRO step
- **THEN** the card starts in Backlog without an assignee

#### Scenario: Assign a card
- **WHEN** any Manager or Admin assigns a Backlog card to an operational assignee
- **THEN** the card moves to To Do and records its assignee

#### Scenario: Manager PIC does not limit assignment
- **WHEN** a Manager who is not the step's Manager PIC assigns a card
- **THEN** the assignment is allowed and the step's Manager PIC remains unchanged

### Requirement: Only the assigned worker advances work cards
A card's assigned operational worker SHALL move it from To Do to In Progress and from In Progress to Awaiting Approval; the owning PM or Admin SHALL review Awaiting Approval cards.

#### Scenario: Assigned worker starts work with a link
- **WHEN** the assigned worker moves a card from To Do to In Progress with a valid Link Pekerjaan
- **THEN** the card enters In Progress and the link is saved

#### Scenario: Assigned worker submits work for review
- **WHEN** the assigned worker moves an In Progress card to Awaiting Approval
- **THEN** the card enters Awaiting Approval and is available to the owning PM for review

#### Scenario: PM approves submitted work
- **WHEN** the owning PM or Admin marks an Awaiting Approval card Completed
- **THEN** the card enters Completed and becomes read-only

#### Scenario: PM requests revision
- **WHEN** the owning PM or Admin moves an Awaiting Approval card to Need Revision with a comment
- **THEN** the card enters Need Revision and the comment is retained in its history

#### Scenario: Reject revision without a comment
- **WHEN** the owning PM or Admin requests revision without a comment
- **THEN** the system rejects the transition and leaves the card Awaiting Approval

### Requirement: A valid Link Pekerjaan is required to start a card
The system SHALL require an absolute HTTP or HTTPS URL before a card enters In Progress and SHALL preserve the existing link when work returns from Need Revision.

#### Scenario: Reject missing or invalid link
- **WHEN** an assigned worker moves a To Do card to In Progress without a valid HTTP or HTTPS URL
- **THEN** the transition is rejected and the card remains in To Do

#### Scenario: Resume revised work
- **WHEN** an assigned worker moves a Need Revision card to In Progress
- **THEN** the previous Link Pekerjaan remains saved and may be updated

#### Scenario: Provide link access guidance
- **WHEN** an assigned worker enters a Link Pekerjaan
- **THEN** the UI advises that the link must be accessible to the project PM and Managers

### Requirement: Link Pekerjaan visibility follows project work access
The system SHALL show a card's Link Pekerjaan to the owning PM, every Manager, Admin, and the card's current assignee, but not to unrelated Assignees or Finance users.

#### Scenario: Show a link to authorized project users
- **WHEN** the owning PM, any Manager, Admin, or the card's assignee views a linked card
- **THEN** the URL is visible in In Progress, Awaiting Approval, Need Revision, and Completed

#### Scenario: Hide a link from unrelated users
- **WHEN** an unrelated Assignee or Finance user views a linked card
- **THEN** the Link Pekerjaan is not exposed

### Requirement: Assignees may revise links until completion
The assigned operational worker SHALL be able to change Link Pekerjaan at any time before a card is Completed; each change SHALL preserve before/after values in project history.

#### Scenario: Update an active card link
- **WHEN** the card's assigned worker changes the link before completion
- **THEN** the latest valid URL is shown on the card and an audit event records the old and new URL

#### Scenario: Lock a completed card link
- **WHEN** a card is Completed
- **THEN** its Link Pekerjaan can no longer be changed

### Requirement: Early cards may be cancelled without erasing history
The owning PM or Admin SHALL be able to cancel or remove a card only while it is in Backlog or To Do; cards at later statuses SHALL remain in the project.

#### Scenario: Cancel a Backlog or To Do card
- **WHEN** the owning PM or Admin cancels a Backlog or To Do card
- **THEN** the card is excluded from active work and a deletion/cancellation event records its prior status and reason

#### Scenario: Reject cancellation of started work
- **WHEN** the owning PM or Admin tries to cancel a card at In Progress, Awaiting Approval, Need Revision, or Completed
- **THEN** the system rejects the action and preserves the card

#### Scenario: Reject cancellation by other roles
- **WHEN** a Manager, Assignee, Finance user, or non-owning PM tries to cancel a card
- **THEN** the system rejects the action

### Requirement: Kanban work changes are auditable
The system SHALL record project history for card creation, assignment, status changes, Link Pekerjaan changes, review comments, and card cancellation/removal.

#### Scenario: Read a card's work history
- **WHEN** an authorized project user opens the card's step history
- **THEN** the timeline shows ordered card work events with actor, time, and relevant before/after values

### Requirement: Assignee access is limited to SIMPRO work
An Assignee SHALL access only SIMPRO work assigned to that user and SHALL NOT access CRM project administration or Finance forms.

#### Scenario: Open assigned work
- **WHEN** an Assignee opens SIMPRO
- **THEN** only cards assigned to that Assignee are available for work

#### Scenario: Reject CRM or Finance access
- **WHEN** an Assignee attempts to open CRM project management, Prospek, or Finance forms
- **THEN** the system denies access
