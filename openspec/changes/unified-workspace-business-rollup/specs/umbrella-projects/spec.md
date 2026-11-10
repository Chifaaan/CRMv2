# Spec Delta

## Purpose

Groups related projects into an Umbrella Project that owns a program-level view, progress, related projects, and cumulative commercial totals across its members.

## ADDED Requirements

### Requirement: Groups are presented as Umbrella Projects

Every user-facing surface that previously used the term `Groups` MUST use `Umbrella Projects`: navigation, list pages and tables, project attribution, filters, and dialog copy. Existing group records, membership, and commercial rollups MUST be preserved. The canonical list route MUST be `/crm/umbrella-projects`, and the legacy `/crm/groups` route MUST continue to resolve to it.

#### Scenario: Renamed surfaces

- **WHEN** a user opens navigation, the project list, or a project header
- **THEN** the grouping concept is labelled `Umbrella Projects` and `Umbrella Project`

#### Scenario: Legacy route resolves

- **WHEN** a user opens `/crm/groups`
- **THEN** the Umbrella Projects list opens with the same records

#### Scenario: Existing membership is preserved

- **WHEN** persisted state is loaded after the rename
- **THEN** every project keeps its umbrella membership and every umbrella keeps its name, description, status, and owner

#### Scenario: Existing group data is not duplicated

- **WHEN** the rename migration runs more than once
- **THEN** no umbrella record or membership is duplicated

### Requirement: Umbrella Projects have a detail page

An Umbrella Project MUST have a detail page at `/crm/umbrella-projects/[id]` showing an overview (name, description, status, owner, and member count), umbrella progress, the related projects with their identity and progress, cumulative RAB, cumulative MO, and a per-project breakdown of RAB and MO. Each related project MUST link to its project detail.

#### Scenario: Open an umbrella detail

- **WHEN** an authorized user opens an Umbrella Project
- **THEN** the page shows its overview, progress, related projects, cumulative RAB, cumulative MO, and per-project breakdown

#### Scenario: Open a related project

- **WHEN** the user selects a related project on the umbrella detail
- **THEN** that project's detail page opens

#### Scenario: Empty umbrella

- **WHEN** an Umbrella Project has no member project
- **THEN** the detail page shows an empty related-projects state and zero-value totals described as empty rather than real revenue

#### Scenario: Unauthorized role is denied

- **WHEN** an Assignee or Media user requests an umbrella detail route
- **THEN** the system denies access and returns the user to their landing page

### Requirement: Umbrella totals aggregate member projects

Cumulative RAB MUST be the sum of qualified item totals (quantity times unit price) from approved RAB forms of member projects. Cumulative MO MUST be the sum of qualified item totals (quantity times client unit price) from non-cancelled Media Order documents of member projects. Projects with lifecycle `lost` or `cancelled` MUST be excluded from both totals, and items without a business unit MUST be excluded from the totals and reported as unmapped.

#### Scenario: Two member projects are summed

- **WHEN** two active projects in one umbrella have qualified RAB and MO items
- **THEN** the umbrella shows the combined RAB and MO totals of both projects

#### Scenario: Closed projects are excluded

- **WHEN** an umbrella contains a lost or cancelled project with RAB or MO data
- **THEN** that project's amounts are excluded from the umbrella totals

#### Scenario: Unmapped items are excluded and flagged

- **WHEN** an RAB or MO item has no business unit
- **THEN** the item is excluded from the cumulative totals and the umbrella shows an unmapped-item warning

#### Scenario: Drill into one member project

- **WHEN** the user inspects the per-project breakdown
- **THEN** each member project shows its own cumulative RAB and MO separately

### Requirement: Umbrella progress reflects member completion

Umbrella progress MUST be the share of completed member projects over non-cancelled member projects. A cancelled member MUST be excluded from the denominator, and an umbrella with no countable member MUST report zero progress without dividing by zero.

#### Scenario: Cancelled member is skipped

- **WHEN** an umbrella has one completed project, one active project, and one cancelled project
- **THEN** progress is 50 percent over the two countable projects

#### Scenario: Fully completed umbrella

- **WHEN** every countable member project is completed
- **THEN** the umbrella shows 100 percent progress

#### Scenario: No countable member

- **WHEN** all members of an umbrella are cancelled
- **THEN** the umbrella reports zero progress and an empty state

### Requirement: Project and umbrella cards show cumulative commercial totals

A project card or project detail header MUST show cumulative RAB and cumulative MO when the project has at least one qualified amount, and MUST omit a badge when the amount is absent. An Umbrella Project card MUST show the umbrella's cumulative RAB and MO. Assignee and Media users MUST NOT see RAB or MO nominal values on cards, headers, or overview.

#### Scenario: Project shows both totals

- **WHEN** a project has an approved RAB and a non-cancelled MO
- **THEN** its card and detail header show cumulative RAB and cumulative MO

#### Scenario: Only one amount exists

- **WHEN** a project has MO data but no approved RAB
- **THEN** only the cumulative MO badge is shown

#### Scenario: Umbrella card totals

- **WHEN** an umbrella has member projects with commercial data
- **THEN** its card shows the umbrella's cumulative RAB and MO

#### Scenario: Assignee does not see commercial totals

- **WHEN** an Assignee opens a project they work on
- **THEN** no RAB, MO, or margin nominal is shown on the card or header

#### Scenario: Umbrella attribution on project surfaces

- **WHEN** a user views a project that belongs to an umbrella
- **THEN** the card, project header, and Overview show `Umbrella Project · <name>` linking to the umbrella detail

### Requirement: Umbrella management is limited to Managers and Admins

Manager and Admin MUST be able to create, edit, disband, and change membership of an Umbrella Project. PM and Finance MUST be able to view umbrellas in their scope without changing membership, and Assignee and Media MUST NOT see umbrella surfaces. An Umbrella Project MUST keep at least two projects before it can remain active, and disbanding it MUST clear member attribution without deleting projects.

#### Scenario: Manager creates an umbrella

- **WHEN** a Manager creates an Umbrella Project with a name and description
- **THEN** the umbrella exists and is available for membership

#### Scenario: PM cannot edit membership

- **WHEN** a PM opens an umbrella detail
- **THEN** no create, edit, add-member, remove-member, or disband action is offered

#### Scenario: Disband keeps projects

- **WHEN** a Manager disbands an umbrella
- **THEN** its members lose their umbrella attribution and the projects remain available
