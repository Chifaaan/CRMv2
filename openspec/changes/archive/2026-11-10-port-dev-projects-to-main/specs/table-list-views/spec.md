# Spec Delta

## Purpose

Gives the CRM list surfaces — Projects, Groups, and Forms — consistent Card and Table presentations, shared filtering, pagination where lists grow, and a remembered view preference per page.

## ADDED Requirements

### Requirement: List pages offer Card and Table views

Projects, Groups, and Forms MUST each offer a Card/Table toggle. Both views MUST present the same data set, and Card MUST be the initial view.

#### Scenario: Switch Projects to Table
- **WHEN** a user selects Table on Projects
- **THEN** the same projects are shown as rows instead of cards

#### Scenario: Switch Groups to Table
- **WHEN** a user selects Table on Groups
- **THEN** the same groups are shown as rows instead of cards

#### Scenario: Default is Card
- **WHEN** a user opens a list page for the first time
- **THEN** the Card view is shown

### Requirement: Projects table shows group attribution

The Projects table MUST show project name and code, client, Group attribution, status, current phase, progress, and team members. The Group cell MUST name the project's group when it belongs to one.

#### Scenario: Grouped project row
- **WHEN** a project belongs to a Group
- **THEN** its Group cell shows the group name

#### Scenario: Direct project row
- **WHEN** a project is not in a group
- **THEN** its Group cell shows an empty marker

#### Scenario: Open a project row
- **WHEN** a user activates a Projects table row
- **THEN** the project detail opens

### Requirement: Lists expose their key columns

The Groups table MUST show group, description, project count, progress, and completed count. The Forms table MUST show form, project context, assignee, status, due date, and submit time.

#### Scenario: Group row content
- **WHEN** a user views the Groups table
- **THEN** each row shows the group name, description, project count, and progress

#### Scenario: Forms row content
- **WHEN** a user views the Forms table
- **THEN** each row shows the form name, its project context, assignee, status, and due date

### Requirement: Projects are paginated

Projects MUST paginate with a default page size of 10 and selectable sizes of 10, 25, 50, and 100. Changing a filter or page size MUST return the list to the first page.

#### Scenario: Page through Projects
- **WHEN** a user moves to the next page of Projects
- **THEN** the next slice of filtered projects is shown and the range label updates

#### Scenario: Change page size
- **WHEN** a user selects 25 rows per page
- **THEN** the list is recalculated with up to 25 rows and returns to page one

#### Scenario: Filter resets the page
- **WHEN** a user changes a search or filter while on a later page
- **THEN** the list returns to the first page

### Requirement: Filters apply to both views

Search and filters MUST produce the same result set in Card and Table views, and an empty result MUST render an empty state.

#### Scenario: Same results in both views
- **WHEN** a user filters Projects and then switches view
- **THEN** the same projects remain visible

#### Scenario: Empty table
- **WHEN** no row matches the filters
- **THEN** the table area shows an empty state instead of header-only rows

### Requirement: View preference is remembered per page

The Card/Table choice MUST be stored separately for Projects, Groups, and Forms, and MUST survive navigation and reloads.

#### Scenario: Preference survives navigation
- **WHEN** a user selects Table on Projects, opens another page, then returns
- **THEN** Projects is still in Table view

#### Scenario: Preferences are independent
- **WHEN** a user selects Table on Projects but Card on Groups
- **THEN** each page keeps its own choice
