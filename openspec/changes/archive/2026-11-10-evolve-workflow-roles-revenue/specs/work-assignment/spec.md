# Spec Delta

## Purpose

Defines the role model, module access, backlog-first allocation, and the accountability rules that govern who may assign, start, and see project work.

## ADDED Requirements

### Requirement: Role catalog covers operational and executive roles

The system MUST support seven roles: admin, manager, pm, finance, assignee, media, and bod. The local role switcher MUST offer every role, and each role MUST land on its permitted module.

#### Scenario: Role switcher lists all roles
- **WHEN** the user opens the role switcher
- **THEN** Admin, Manager, PM, Finance, Assignee, Media, and BOD are selectable

#### Scenario: Default landing per role
- **WHEN** the current user is Media
- **THEN** the user lands in SIMPRO, and when the current user is BOD the user lands on the Business Dashboard

### Requirement: Module access is scoped per role

Admin, Manager, and PM MUST have both CRM and SIMPRO access. Finance MUST have CRM access. Assignee and Media MUST have SIMPRO access. BOD MUST have only the Business Dashboard.

#### Scenario: Media is denied CRM browsing
- **WHEN** a Media user opens a CRM project route
- **THEN** the system redirects to the Media landing page instead of showing CRM data

#### Scenario: BOD is limited to the dashboard
- **WHEN** a BOD user opens a CRM or SIMPRO project route
- **THEN** the system denies access and redirects to the Business Dashboard

#### Scenario: Admin keeps full access
- **WHEN** an Admin opens any CRM, SIMPRO, or Business Dashboard route
- **THEN** the route is available

### Requirement: PM creates cards in backlog

A PM who owns the project MUST be able to create task cards, and every new card MUST start in `backlog`. The PM MUST NOT assign the card to an assignee.

#### Scenario: PM creates a backlog card
- **WHEN** a PM creates a task on an active SIMPRO stage
- **THEN** the card is stored with status `backlog` and no assignee

#### Scenario: PM cannot assign
- **WHEN** a PM attempts to allocate a backlog card or change its assignee
- **THEN** the system rejects the action with a role explanation

### Requirement: Manager and Admin allocate backlog work

Only Manager and Admin MUST be able to allocate a backlog card to an assignee, which MUST move the card to `todo` and notify the assignee. A Manager MUST also be selectable as the assignee for operational work.

#### Scenario: Manager allocates to an assignee
- **WHEN** a Manager assigns a backlog card to an Assignee
- **THEN** the card becomes `todo`, the assignee is notified, and the allocation is audited

#### Scenario: Manager assigns the card to themselves
- **WHEN** a Manager selects themselves as the assignee of a backlog card
- **THEN** the card becomes `todo` and the Manager can work on it

#### Scenario: Non-manager cannot allocate
- **WHEN** a Finance, Assignee, Media, PM, or BOD user attempts to allocate a backlog card
- **THEN** the system rejects the action

### Requirement: Starting work requires a working link

Moving a card to `in_progress` MUST require a valid working link. The link MUST be an absolute `http` or `https` URL, MUST be stored on the card, and MUST be visible to the PM and Manager. A missing or invalid link MUST block the transition with a clear reason.

#### Scenario: Missing link blocks the move
- **WHEN** an assignee moves a `todo` card to `in_progress` without a working link
- **THEN** the transition is rejected and the card stays in `todo`

#### Scenario: Invalid link is rejected
- **WHEN** an assignee submits a working link that is empty or does not use `http` or `https`
- **THEN** the system shows a validation error and does not change the status

#### Scenario: Valid link starts the work
- **WHEN** an assignee submits a valid Google Docs, Slides, or Drive URL and moves the card to `in_progress`
- **THEN** the card becomes `in_progress` with the link attached and an audit event recording who set it and when

#### Scenario: Revision restart uses a valid link
- **WHEN** an assignee moves a `need_revision` card to `in_progress`
- **THEN** the transition succeeds only when a valid working link is present, reusing the existing link or storing a replacement

#### Scenario: Working link can be updated during work
- **WHEN** an assignee replaces the working link while the card is `in_progress`
- **THEN** the latest link is shown to the PM and Manager and the change is recorded in the card history

### Requirement: Media handles operational and BAST work

A Media user MUST see only the SIMPRO projects, cards, and forms assigned to them. Media MUST be able to fill and submit a BAST entry assigned to them, and MUST NOT edit RAB or Invoice forms.

#### Scenario: Media board is filtered to their work
- **WHEN** a Media user opens the SIMPRO board
- **THEN** only cards assigned to that Media user are shown

#### Scenario: Media fills an assigned BAST
- **WHEN** a Media user opens a BAST entry assigned to them
- **THEN** the entry is editable and can be submitted for PM review

#### Scenario: Media cannot edit RAB
- **WHEN** a Media user opens a RAB form
- **THEN** the form is read-only

### Requirement: Visibility follows role scope

PM MUST see only projects they created. Assignee and Media MUST see only work assigned to them. Manager, Finance, and Admin MUST see all projects, with Finance editing only assigned finance forms and Manager reviewing no tasks.

#### Scenario: PM cannot see another PM's project
- **WHEN** a PM opens a project created by a different PM
- **THEN** the project is not listed and direct access is denied

#### Scenario: Assignee sees only assigned work
- **WHEN** an Assignee opens My Tasks or Forms
- **THEN** only cards and entries assigned to that user are shown

#### Scenario: Manager cannot review tasks
- **WHEN** a Manager attempts to approve or reject a card in `awaiting_approval`
- **THEN** the review action is denied

### Requirement: Workload separates cards from forms

Workload MUST count active task cards and active form entries separately. Cards in `backlog`, `completed`, or archived MUST NOT count, and form entries MUST NOT be merged into the card count.

#### Scenario: Backlog is excluded
- **WHEN** a Manager opens workload
- **THEN** backlog cards are not included in the active card count

#### Scenario: Forms have their own count
- **WHEN** a user has active assigned form entries
- **THEN** workload shows them in a separate form count

### Requirement: Read-only projects reject work changes

Projects with lifecycle `lost` or `cancelled` MUST reject new cards, allocation, transitions, and form edits, while keeping their history visible.

#### Scenario: Allocation on a lost project is denied
- **WHEN** a Manager tries to allocate a card on a lost project
- **THEN** the action is rejected and the card remains read-only
