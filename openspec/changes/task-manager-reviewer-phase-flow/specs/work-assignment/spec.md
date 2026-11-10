# Spec Delta

## MODIFIED Requirements

### Requirement: PM creates cards in backlog

A PM who owns the project MUST be able to create task cards, and every new card MUST start in `backlog`. On a new-lifecycle project the PM MUST set a Manager Tugas instead of an assignee; on a legacy project the PM MAY assign the card only to the project Manager.

#### Scenario: PM creates a backlog card

- **WHEN** a PM creates a task on an active SIMPRO stage
- **THEN** the card is stored with status `backlog` and no assignee

#### Scenario: PM cannot assign on a new project

- **WHEN** a PM attempts to allocate a backlog card on a project created in template or manual mode
- **THEN** the system rejects the assignee selection and explains that a Manager Tugas must be set first

#### Scenario: PM cannot assign

- **WHEN** a PM attempts to allocate a backlog card or change its assignee
- **THEN** the system rejects the action with a role explanation

#### Scenario: PM assigns a form entry to the project Manager

- **WHEN** the owning PM assigns a project form entry to the Manager recorded on the project
- **THEN** the entry is assigned and the Manager is notified

### Requirement: Manager and Admin allocate backlog work

Only the card's Manager Tugas or an Admin MUST be able to allocate a card to an Assignee, Manager, or Media user. Allocation MUST move the card to `todo` and notify the assignee. A Manager MUST also be selectable as the assignee for operational work.

#### Scenario: Manager allocates to an assignee

- **WHEN** the card's Manager Tugas assigns an unassigned To Do card to an Assignee
- **THEN** the card stays in `todo`, the assignee is notified, and the allocation is audited

#### Scenario: Manager assigns the card to themselves

- **WHEN** the card's Manager Tugas selects themselves as the assignee
- **THEN** the card becomes owned by that Manager as an operational assignee and can be worked

#### Scenario: Manager allocates a card to a Media user

- **WHEN** the card's Manager Tugas assigns a card to a Media user
- **THEN** the card appears on that Media user's board and My Tasks

#### Scenario: Non-manager cannot allocate

- **WHEN** a Finance, Assignee, Media, PM without the Manager Tugas role, or BOD user attempts to allocate a card
- **THEN** the system rejects the action

### Requirement: Media handles operational and BAST work

A Media user MUST see only the SIMPRO projects, cards, and forms assigned to them. Media MUST be able to fill and submit any finance form assigned to them, including RAB, Media Order, BAST, Invoice, and Pembayaran. Media MUST NOT open a finance form that is not assigned to them and MUST NOT browse CRM.

#### Scenario: Media board is filtered to their work

- **WHEN** a Media user opens the SIMPRO board
- **THEN** only cards assigned to that Media user are shown and only active or completed stages are offered

#### Scenario: Media fills an assigned RAB

- **WHEN** a Media user opens a RAB form assigned to them from SIMPRO Forms
- **THEN** the finance form page opens with editing enabled and the form can be submitted for review

#### Scenario: Media fills an assigned BAST

- **WHEN** a Media user opens a BAST entry assigned to them from SIMPRO Forms
- **THEN** the entry opens as an editable finance form and can be submitted for review

#### Scenario: Media cannot edit RAB

- **WHEN** a Media user opens a RAB, Invoice, Pembayaran, or Media Order form that is not assigned to them
- **THEN** the form opens read-only without editing controls

### Requirement: Visibility follows role scope

PM MUST see only projects they created. Assignee and Media MUST see only work assigned to them. Manager, Finance, and Admin MUST see all projects, with Finance editing only assigned finance forms and Manager reviewing no tasks. A selected form reviewer MUST be able to open the project and form they review.

#### Scenario: PM cannot see another PM's project

- **WHEN** a PM opens a project created by a different PM
- **THEN** the project is not listed and direct access is denied

#### Scenario: Assignee sees only assigned work

- **WHEN** an Assignee opens My Tasks or Forms
- **THEN** only cards and entries assigned to that user are shown

#### Scenario: Manager cannot review tasks

- **WHEN** a Manager who is also the assignee attempts to approve or reject a card in `awaiting_approval`
- **THEN** the review action is denied

#### Scenario: Reviewer can open the reviewed form

- **WHEN** a Finance user is selected as reviewer of a submitted project form
- **THEN** that user can open the project form page and use the review actions

## ADDED Requirements

### Requirement: Cards record a Manager Tugas

A new-lifecycle card MUST record at most one Manager Tugas selected by the owning PM or an Admin. Setting the Manager Tugas on a Backlog card MUST move the card to `todo`, keep the assignee empty, and reveal the Assignee selection to that Manager. The Manager Tugas MUST be able to choose an Assignee, Manager, or Media user, including themselves.

#### Scenario: PM sets the Manager Tugas

- **WHEN** the owning PM selects a Manager in the Manager Tugas field of a Backlog card
- **THEN** the card moves to `todo` with no assignee and an audit event records the Manager Tugas

#### Scenario: Assignee input appears after the Manager Tugas is set

- **WHEN** a card in `todo` has a Manager Tugas and no assignee
- **THEN** the card shows a `Pilih Assignee` control to the Manager Tugas and to Admin

#### Scenario: Other Managers cannot allocate the card

- **WHEN** a Manager who is not the card's Manager Tugas opens the card's assignee control
- **THEN** the allocation action is not offered

#### Scenario: Manager Tugas cannot be cleared after work starts

- **WHEN** a card has moved beyond `todo` and the owning PM tries to remove its Manager Tugas
- **THEN** the system rejects the change
