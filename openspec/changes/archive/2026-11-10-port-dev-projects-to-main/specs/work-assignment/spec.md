# Spec Delta

## REMOVED Requirements

### Requirement: Starting work requires a working link
**Reason**: The working link is now opaque text with no URL validation, so the requirement that demanded an absolute `http`/`https` link is no longer true.
**Migration**: Stored links keep their latest value and map to the new single work-link field; cards already in progress stay in progress.

## MODIFIED Requirements

### Requirement: Role catalog covers operational and executive roles

The system MUST support seven roles: admin, manager, pm, finance, assignee, media, and bod. The local role switcher MUST offer every role, and each role MUST land on its permitted module.

#### Scenario: Role switcher lists all roles
- **WHEN** the user opens the role switcher
- **THEN** Admin, Manager, PM, Finance, Assignee, Media, and BOD are selectable

#### Scenario: Default landing per role
- **WHEN** the current user is Media
- **THEN** the user lands in SIMPRO, and when the current user is BOD the user lands on the Business Dashboard

#### Scenario: CRM roles land in CRM
- **WHEN** the current user is Admin, Manager, PM, or Finance
- **THEN** the user lands on the CRM dashboard

### Requirement: Module access is scoped per role

Admin, Manager, and PM MUST have both CRM and SIMPRO access. Finance MUST have CRM access and assigned finance work. Assignee and Media MUST have SIMPRO access. BOD MUST have only the Business Dashboard.

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

A PM who owns the project MUST be able to create task cards, and every new card MUST start in `backlog`. On a new-lifecycle project the PM MUST NOT assign the card; on a legacy project the PM MAY assign it only to the project Manager.

#### Scenario: PM creates a backlog card
- **WHEN** a PM creates a task on an active SIMPRO stage
- **THEN** the card is stored with status `backlog` and no assignee

#### Scenario: PM cannot assign on a new project
- **WHEN** a PM attempts to allocate a backlog card on a project created in template or manual mode
- **THEN** the system rejects the action with a role explanation

#### Scenario: PM cannot assign
- **WHEN** a PM attempts to allocate a backlog card or change its assignee
- **THEN** the system rejects the action with a role explanation

#### Scenario: PM assigns a form entry to the project Manager
- **WHEN** the owning PM assigns a project form entry to the Manager recorded on the project
- **THEN** the entry is assigned and the Manager is notified

### Requirement: Manager and Admin allocate backlog work

Only Manager and Admin MUST be able to allocate a backlog card to an Assignee, Manager, or Media user, which MUST move the card to `todo` and notify the assignee. A Manager MUST also be selectable as the assignee for operational work.

#### Scenario: Manager allocates to an assignee
- **WHEN** a Manager assigns a backlog card to an Assignee
- **THEN** the card becomes `todo`, the assignee is notified, and the allocation is audited

#### Scenario: Manager assigns the card to themselves
- **WHEN** a Manager selects themselves as the assignee of a backlog card
- **THEN** the card becomes `todo` and the Manager can work on it

#### Scenario: Manager allocates a card to a Media user
- **WHEN** a Manager assigns a backlog card to a Media user
- **THEN** the card becomes `todo` and appears on that Media user's board and My Tasks

#### Scenario: Non-manager cannot allocate
- **WHEN** a Finance, Assignee, Media, PM, or BOD user attempts to allocate a backlog card
- **THEN** the system rejects the action

### Requirement: Media handles operational and BAST work

A Media user MUST see only the SIMPRO projects, cards, and forms assigned to them. Media MUST be able to fill and submit a BAST entry assigned to them, MUST NOT edit RAB, Invoice, or Pembayaran forms, and MUST NOT browse CRM.

#### Scenario: Media board is filtered to their work
- **WHEN** a Media user opens the SIMPRO board
- **THEN** only cards assigned to that Media user are shown and only active or completed stages are offered

#### Scenario: Media fills an assigned BAST
- **WHEN** a Media user opens a BAST entry assigned to them from SIMPRO Forms
- **THEN** the entry opens as an editable finance form and can be submitted for PM review

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
- **WHEN** a Manager who is also the assignee attempts to approve or reject a card in `awaiting_approval`
- **THEN** the review action is denied

### Requirement: Workload separates cards from forms

Workload MUST count active task cards and active form entries separately. Cards in `backlog`, `completed`, or archived MUST NOT count, form entries MUST NOT be merged into the card count, and Assignees, Managers, and Media with active work MUST appear.

#### Scenario: Backlog is excluded
- **WHEN** a Manager opens workload
- **THEN** backlog cards are not included in the active card count

#### Scenario: Forms have their own count
- **WHEN** a user has active assigned form entries
- **THEN** workload shows them in a separate form count

#### Scenario: Media appears in workload
- **WHEN** a Media user has an active card
- **THEN** workload lists the Media user with that card counted separately from forms

## ADDED Requirements

### Requirement: Starting work requires a non-empty working link

Moving a card to `in_progress` MUST require a non-empty working link. The link MUST be stored on the card as opaque text, MUST NOT be URL-validated, and MUST be visible to the PM, Manager, and assignee. The card MUST offer a `Simpan` action for the link, and a missing link MUST block the transition.

#### Scenario: Missing link blocks the move
- **WHEN** an assignee moves a `todo` card to `in_progress` without a working link
- **THEN** the transition is rejected and the card stays in `todo`

#### Scenario: Any non-empty value is accepted
- **WHEN** an assignee saves a short reference that is not a URL and moves the card to `in_progress`
- **THEN** the card becomes `in_progress` with that value attached and an audit event records who set it and when

#### Scenario: Empty link is rejected
- **WHEN** an assignee submits only whitespace as the working link
- **THEN** the system shows a validation error and does not change the status

#### Scenario: Revision restart uses the stored link
- **WHEN** an assignee moves a `need_revision` card to `in_progress`
- **THEN** the transition succeeds when a working link is already stored or is entered at that moment

#### Scenario: Working link can be updated during work
- **WHEN** an assignee replaces the working link while the card is `in_progress`
- **THEN** the latest value is shown to the PM and Manager and the change is recorded in the card history

### Requirement: A project records an optional Manager

A project MUST record at most one Manager selected by the owning PM or an Admin. The assignment MUST be audited, and it MUST NOT change project visibility: Managers still see every project.

#### Scenario: Assign a project Manager
- **WHEN** the owning PM selects a Manager while creating or editing a project
- **THEN** the project stores that Manager and an audit event records the assignment

#### Scenario: Remove the project Manager
- **WHEN** the owning PM or an Admin clears the project Manager
- **THEN** the project has no Manager and the removal is audited

#### Scenario: Manager visibility is unchanged
- **WHEN** a Manager is assigned to one project
- **THEN** that Manager still sees all projects, not only the assigned one

### Requirement: Steps carry a Manager PIC

Every project step MUST record an optional Manager PIC. Activating a step MUST require a Manager PIC, and the owning PM or Admin MUST be able to change it.

#### Scenario: Set a step Manager PIC
- **WHEN** the owning PM edits a step and selects a Manager PIC
- **THEN** the step stores the PIC and the change is audited

#### Scenario: Block activation without a PIC
- **WHEN** a step without a Manager PIC would become active
- **THEN** activation is blocked until a Manager PIC is set

### Requirement: Manager assignees work without review rights

A Manager who receives operational work MUST be able to start, save, and submit it, but MUST NOT approve or reject it. Review MUST remain with the owning PM or an Admin.

#### Scenario: Manager submits their card
- **WHEN** a Manager who is the assignee submits a card for approval
- **THEN** the card moves to `awaiting_approval`

#### Scenario: Manager cannot approve
- **WHEN** the same Manager tries to approve the card
- **THEN** the review action is denied and the owning PM is responsible for the decision
