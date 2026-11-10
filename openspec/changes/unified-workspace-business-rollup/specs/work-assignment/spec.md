# Spec Delta

## MODIFIED Requirements

### Requirement: Module access is scoped per role

Admin, Manager, and PM MUST have full workspace access. Finance MUST have commercial workspace access plus assigned finance work. Assignee MUST have a workspace scoped to their assigned work, including the projects where that work lives. Media MUST have only work surfaces for assigned cards and forms. BOD MUST have only the Business submenu.

#### Scenario: Media is denied CRM browsing

- **WHEN** a Media user opens a project list or a CRM project route
- **THEN** the system redirects to the Media landing page instead of showing project data

#### Scenario: BOD is limited to the dashboard

- **WHEN** a BOD user opens a project, task, form, or dashboard route outside Business
- **THEN** the system denies access and redirects to Business

#### Scenario: Admin keeps full access

- **WHEN** an Admin opens any workspace, project, form, or Business route
- **THEN** the route is available

#### Scenario: Assignee browses their projects

- **WHEN** an Assignee opens Projects
- **THEN** only projects where the Assignee holds a card or an assigned form are listed

#### Scenario: Commercial roles open Business

- **WHEN** a PM, Manager, Finance, or Admin opens Business
- **THEN** the Business Dashboard, RAB, and MO surfaces are available read-only

### Requirement: Visibility follows role scope

PM MUST see only projects they created. Assignee MUST see only work assigned to them and the projects where that work lives. Media MUST see only work assigned to them. Manager, Finance, and Admin MUST see all projects, with Finance editing only assigned finance forms and Manager reviewing no tasks.

#### Scenario: PM cannot see another PM's project

- **WHEN** a PM opens a project created by a different PM
- **THEN** the project is not listed and direct access is denied

#### Scenario: Assignee sees only assigned work

- **WHEN** an Assignee opens My Tasks or Forms
- **THEN** only cards and entries assigned to that user are shown

#### Scenario: Assignee project list follows their work

- **WHEN** an Assignee has a card on a project but no form
- **THEN** that project is listed and opens with the Assignee workspace tabs

#### Scenario: Manager cannot review tasks

- **WHEN** a Manager who is also the assignee attempts to approve or reject a card in `awaiting_approval`
- **THEN** the review action is denied

## ADDED Requirements

### Requirement: Role catalog and default landing

The system MUST support seven roles: admin, manager, pm, finance, assignee, media, and bod. The local role switcher MUST offer every role, and each role MUST land on its permitted surface: Assignee and Media on My Tasks, BOD on Business, and Admin, Manager, PM, and Finance on the workspace Dashboard.

#### Scenario: Role switcher lists every role

- **WHEN** the user opens the role switcher
- **THEN** Admin, Manager, PM, Finance, Assignee, Media, and BOD are selectable

#### Scenario: Default landing per role

- **WHEN** the current user is Assignee or Media
- **THEN** the user lands on My Tasks, and when the current user is BOD the user lands on Business

#### Scenario: Commercial roles land on the dashboard

- **WHEN** the current user is Admin, Manager, PM, or Finance
- **THEN** the user lands on the single workspace Dashboard

### Requirement: Workspace navigation is unified

The workspace MUST present one sidebar with no CRM or SIMPRO sub-sections and no module switcher. Navigation items MUST be role-scoped and MUST identify the active page. Legacy `/crm` and `/dashboard` URLs MUST remain reachable without exposing a second navigation model.

#### Scenario: One navigation list

- **WHEN** a commercial user opens the workspace
- **THEN** the sidebar lists Dashboard, Projects, My Tasks, Forms, Umbrella Projects, Templates, Workload, and Business according to role without CRM or SIMPRO headings

#### Scenario: Module switcher is gone

- **WHEN** the user inspects the top bar
- **THEN** no CRM/SIMPRO module switcher is offered

#### Scenario: Role-scoped items

- **WHEN** a user without template rights opens the workspace
- **THEN** Templates is not offered, and a user without workload rights does not see Workload

#### Scenario: Legacy URLs still resolve

- **WHEN** a user opens `/crm` or `/crm/projects`
- **THEN** the unified dashboard or project list opens with the unified navigation

#### Scenario: Active item is identified

- **WHEN** a user opens a project detail page
- **THEN** Projects is marked as the active navigation item

## REMOVED Requirements

### Requirement: Role catalog covers operational and executive roles

**Reason**: The role catalog is unchanged, but default landing surfaces moved to the unified workspace (Assignee and Media on My Tasks, BOD on Business, other roles on the single Dashboard).

**Migration**: Use the `Role catalog and default landing` requirement.
