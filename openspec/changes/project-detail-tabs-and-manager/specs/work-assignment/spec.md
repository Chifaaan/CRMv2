# Spec Delta

## MODIFIED Requirements

### Requirement: Manager and Admin allocate backlog work

Only Manager and Admin MUST be able to allocate a backlog card to an assignee, which MUST move the card to `todo` and notify the assignee. A Manager MUST also be selectable as the assignee for operational work. A card MAY carry an attached Manager, who MUST also be allowed to assign or reassign that card and MUST be notified when attached.

#### Scenario: Manager allocates to an assignee
- **WHEN** a Manager assigns a backlog card to an Assignee
- **THEN** the card becomes `todo`, the assignee is notified, and the allocation is audited

#### Scenario: Manager assigns the card to themselves
- **WHEN** a Manager selects themselves as the assignee of a backlog card
- **THEN** the card becomes `todo` and the Manager can work on it

#### Scenario: Attached Manager allocates the card
- **WHEN** a Manager attached to a card assigns it to an Assignee
- **THEN** the card becomes `todo`, the assignee is notified, and the allocation is audited

#### Scenario: Non-manager cannot allocate
- **WHEN** a Finance, Assignee, Media, PM, or BOD user attempts to allocate a backlog card
- **THEN** the system rejects the action

### Requirement: Starting work requires a working link

Moving a card to `in_progress` MUST require a non-empty working link. The link MUST NOT be URL-validated; any non-empty text MUST be accepted. The link MUST be stored on the card, MUST be shown on the card and task detail with a `Simpan Link` action, and MUST be visible to the PM and Manager. A missing or empty link MUST block the transition with a clear reason.

#### Scenario: Missing link blocks the move
- **WHEN** an assignee moves a `todo` card to `in_progress` without a working link
- **THEN** the transition is rejected and the card stays in `todo`

#### Scenario: Invalid link is rejected
- **WHEN** an assignee submits an empty or whitespace-only working link
- **THEN** the system shows a validation error and does not change the status

#### Scenario: Valid link starts the work
- **WHEN** an assignee submits any non-empty text as the working link and moves the card to `in_progress`
- **THEN** the card becomes `in_progress` with the text attached and an audit event recording who set it and when

#### Scenario: Revision restart uses a valid link
- **WHEN** an assignee moves a `need_revision` card to `in_progress`
- **THEN** the transition succeeds when the card already has a non-empty link or a replacement non-empty link is saved

#### Scenario: Working link can be updated during work
- **WHEN** an assignee replaces the working link while the card is `in_progress`
- **THEN** the latest link is shown to the PM and Manager and the change is recorded in the card history

#### Scenario: Card shows the link input and save action
- **WHEN** a user opens a card's detail
- **THEN** the card shows the `Link Pekerjaan` input and a `Simpan Link` button

#### Scenario: Existing link allows starting without re-entry
- **WHEN** a card already has a saved working link and the assignee moves it to `in_progress`
- **THEN** the transition succeeds without asking for the link again

#### Scenario: Arbitrary text is accepted
- **WHEN** an assignee saves a non-URL text such as a folder name or instruction as the working link
- **THEN** the link is stored unchanged and no URL-format error is shown

## ADDED Requirements

### Requirement: Task cards carry an optional Manager

A task card MUST allow selecting one Manager alongside the assignee. The Manager MUST be optional, MUST be a user with the Manager role, MUST be stored on the card, and MUST be visible on the card and in the task detail. Attaching or changing the Manager MUST be audited and MUST notify the newly attached Manager.

#### Scenario: Choose a Manager on a card
- **WHEN** a Manager or Admin selects a Manager for a task card
- **THEN** the card stores the Manager and shows the Manager next to the assignee

#### Scenario: Manager attachment notifies the Manager
- **WHEN** a Manager is attached to a card
- **THEN** that Manager receives an in-app notification for the card

#### Scenario: Manager field is optional
- **WHEN** a card is created or assigned without a Manager
- **THEN** the card remains valid and no Manager notification is created

#### Scenario: Non-manager cannot be attached as Manager
- **WHEN** an Assignee, Media, Finance, PM, or BOD user is chosen in the Manager field
- **THEN** the system rejects the choice

### Requirement: Attached Manager can work and assign the card

A Manager attached to a card MUST be able to start and submit that card under the same rules as the assignee, including the required non-empty working link. The attached Manager MUST also be able to assign or reassign the card to an Assignee. The attached Manager MUST NOT approve or reject the card's review.

#### Scenario: Manager starts the card with a link
- **WHEN** the attached Manager moves the card to In Progress with a non-empty working link
- **THEN** the card becomes In Progress and the link is recorded in the card history

#### Scenario: Manager cannot start without a link
- **WHEN** the attached Manager tries to move the card to In Progress without a non-empty working link
- **THEN** the transition is rejected through the existing working-link rule

#### Scenario: Manager submits the card for review
- **WHEN** the attached Manager moves an In Progress card to Awaiting Approval
- **THEN** the owning PM is notified for review

#### Scenario: Manager assigns the card to an Assignee
- **WHEN** the attached Manager assigns or reassigns the card to an Assignee
- **THEN** the Assignee is notified and the change is audited

#### Scenario: Manager still cannot review
- **WHEN** the attached Manager tries to approve or reject an Awaiting Approval card
- **THEN** the system denies the review action

### Requirement: Assignees see only active or completed board stages

An Assignee or Media user bound to a project MUST see only board stages whose status is `active` or `completed`. A `pending` stage MUST be hidden from stage navigation and MUST reject direct access. A completed stage MUST remain openable on the board as read-only. PM, Manager, and Admin MUST keep access to every stage.

#### Scenario: Pending stage is hidden from the board
- **WHEN** an Assignee opens the SIMPRO board of a bound project
- **THEN** stages that have not started do not appear in the stage list

#### Scenario: Active stage is visible
- **WHEN** a stage is active
- **THEN** the Assignee can open it and see only their assigned cards

#### Scenario: Completed stage is visible again
- **WHEN** a stage has completed
- **THEN** the Assignee can reopen it on the board and its cards are read-only

#### Scenario: Direct access to a pending stage is denied
- **WHEN** an Assignee opens a board URL for a pending stage
- **THEN** the system denies access to that stage

#### Scenario: Managers keep full stage visibility
- **WHEN** a PM, Manager, or Admin opens the board
- **THEN** every stage, including pending stages, remains available

### Requirement: Owning PM can move a card to any status when it has an owner

The owning PM MUST be able to move a project card to any of the six task statuses when the card has an assignee or an attached Manager. Moving to In Progress MUST still require a non-empty working link. A card with neither an assignee nor a Manager MUST NOT be moved by the PM, and the PM MUST NOT assign it.

#### Scenario: PM moves an assigned card to In Progress
- **WHEN** the owning PM moves a card with an assignee or Manager to In Progress and a non-empty link exists
- **THEN** the card becomes In Progress and the change is audited

#### Scenario: PM moves a card to Completed
- **WHEN** the owning PM moves a card with an assignee or Manager to Completed
- **THEN** the card becomes Completed without requiring a Manager review

#### Scenario: PM moves a card to any other status
- **WHEN** the owning PM moves a card with an assignee or Manager to To Do, Awaiting Approval, Need Revision, or Backlog
- **THEN** the transition is allowed and recorded

#### Scenario: PM cannot move an ownerless card
- **WHEN** the owning PM tries to move a card that has neither an assignee nor a Manager
- **THEN** the system rejects the move and explains that an owner is required

#### Scenario: PM still cannot assign
- **WHEN** the owning PM tries to set or change the card's assignee
- **THEN** the system still rejects the assignment
