# Spec Delta

## MODIFIED Requirements

### Requirement: List pages offer Card and Table views

Projects, Umbrella Projects, and Forms MUST each offer a Card/Table toggle. Both views MUST present the same data set, and Card MUST be the initial view.

#### Scenario: Switch Projects to Table

- **WHEN** a user selects Table on Projects
- **THEN** the same projects are shown as rows instead of cards

#### Scenario: Switch Groups to Table

- **WHEN** a user selects Table on Umbrella Projects
- **THEN** the same umbrellas are shown as rows instead of cards

#### Scenario: Default is Card

- **WHEN** a user opens a list page for the first time
- **THEN** the Card view is shown

### Requirement: Lists expose their key columns

The Umbrella Projects table MUST show umbrella, description, project count, progress, completed count, cumulative RAB, and cumulative MO. The Forms table MUST show form, project context, category, assignee, status, due date, and submit time.

#### Scenario: Group row content

- **WHEN** a user views the Umbrella Projects table
- **THEN** each row shows the umbrella name, description, project count, progress, and completed count

#### Scenario: Umbrella commercial columns

- **WHEN** an umbrella has member projects with RAB and MO data
- **THEN** its row shows cumulative RAB and cumulative MO, or an empty marker when absent

#### Scenario: Forms row content

- **WHEN** a user views the Forms table
- **THEN** each row shows the form name, its project context, category, assignee, status, and due date

### Requirement: View preference is remembered per page

The Card/Table choice MUST be stored separately for Projects, Umbrella Projects, and Forms, and MUST survive navigation and reloads.

#### Scenario: Preference survives navigation

- **WHEN** a user selects Table on Projects, opens another page, then returns
- **THEN** Projects is still in Table view

#### Scenario: Preferences are independent

- **WHEN** a user selects Table on Projects but Card on Umbrella Projects
- **THEN** each page keeps its own choice

## ADDED Requirements

### Requirement: Projects table shows umbrella attribution

The Projects table MUST show project name and code, client, umbrella attribution, status, current phase, progress, and team members. The umbrella cell MUST name the project's Umbrella Project when it belongs to one and offer a link to the umbrella detail.

#### Scenario: Umbrella project row

- **WHEN** a project belongs to an Umbrella Project
- **THEN** its umbrella cell shows the umbrella name linking to the umbrella detail

#### Scenario: Direct project row

- **WHEN** a project is not in an umbrella
- **THEN** its umbrella cell shows an empty marker

#### Scenario: Open a project row

- **WHEN** a user activates a Projects table row
- **THEN** the project detail opens

## REMOVED Requirements

### Requirement: Projects table shows group attribution

**Reason**: The grouping concept is renamed to Umbrella Projects and its attribution now links to the umbrella detail page.

**Migration**: Use the `Projects table shows umbrella attribution` requirement.
