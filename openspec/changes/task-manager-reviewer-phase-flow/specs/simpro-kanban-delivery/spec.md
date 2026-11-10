# Spec Delta

## MODIFIED Requirements

### Requirement: Delivery follows the card lifecycle

A card MUST move from backlog to todo when its Manager Tugas is set, to in_progress when work starts, to awaiting_approval when submitted, to need_revision or completed on review. Only the owning PM or an Admin MUST review, and a Manager assignee MUST NOT review their own card. A PM/Admin MUST be able to request revision with a comment.

#### Scenario: Submit a card

- **WHEN** the assignee submits an in-progress card
- **THEN** the card moves to awaiting_approval

#### Scenario: Request revision

- **WHEN** the owning PM requests revision with a comment filled in the card dialog
- **THEN** the card moves to need_revision and the comment is visible to the assignee

#### Scenario: Revision without a comment is rejected

- **WHEN** the owning PM requests revision with an empty comment
- **THEN** the card stays in awaiting_approval and a validation message is shown

#### Scenario: Approve a card

- **WHEN** the owning PM approves a submitted card
- **THEN** the card becomes completed

#### Scenario: Manager assignee review is blocked

- **WHEN** the Manager who is the assignee of a submitted card tries to approve it
- **THEN** the review is denied

## ADDED Requirements

### Requirement: PM moves cards once a Manager Tugas or Assignee exists

The owning PM or an Admin MUST be able to move a card to any Kanban status when the card has a Manager Tugas or an Assignee. A card without either MUST remain blocked from movement. Moving to `in_progress` MUST still require a working link, moving to `need_revision` MUST still require a comment, and a `completed` card MUST remain locked.

#### Scenario: PM moves a card with only a Manager Tugas

- **WHEN** the owning PM moves a card that has a Manager Tugas but no assignee
- **THEN** the movement to the selected status is allowed except where a status-specific requirement blocks it

#### Scenario: PM moves a card with only an Assignee

- **WHEN** the owning PM moves a card that has an assignee but no Manager Tugas
- **THEN** the movement to the selected status is allowed except where a status-specific requirement blocks it

#### Scenario: PM cannot move an unassigned card

- **WHEN** the owning PM tries to move a card that has neither a Manager Tugas nor an Assignee
- **THEN** the system rejects the movement and explains that a Manager Tugas or Assignee is required

#### Scenario: PM requests revision from the card dialog

- **WHEN** the owning PM selects Need Revision, fills the review comment, and confirms the move
- **THEN** the card becomes need_revision and the comment is saved
