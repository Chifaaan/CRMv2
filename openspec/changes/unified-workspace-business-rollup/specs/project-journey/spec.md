# Spec Delta

## MODIFIED Requirements

### Requirement: Overview summarises the project

The Overview tab SHALL show project attribution (Umbrella Project when present), step completion, task distribution, progress overview, and recent activity. Distribusi task and Progress overview MUST appear above the activity history. For Admin, Manager, PM, and Finance it MUST also show the project's cumulative RAB and MO.

#### Scenario: Show project attribution

- **WHEN** a project belongs to an Umbrella Project
- **THEN** Overview shows the umbrella name alongside the project identity

#### Scenario: Show task distribution

- **WHEN** the project has SIMPRO cards
- **THEN** Overview shows counts per status, Completed, Open, Overdue, and the completion percentage for this project only

#### Scenario: Show history

- **WHEN** the user opens Overview
- **THEN** recent project events are listed newest first with actor and summary

#### Scenario: Show cumulative commercial totals

- **WHEN** an Admin, Manager, PM, or Finance user opens Overview for a project with RAB and MO data
- **THEN** Overview shows the project's cumulative RAB and cumulative MO

#### Scenario: Assignee overview hides commercial totals

- **WHEN** an Assignee opens Overview
- **THEN** no RAB, MO, or margin nominal is shown

### Requirement: Closed projects remain complete and read-only

Projects with lifecycle `lost` or `cancelled` MUST keep their history, MUST be read-only, and MUST be excluded from workload and umbrella completion denominators.

#### Scenario: Lost project is read-only

- **WHEN** a user opens a lost project
- **THEN** its steps, cards, and forms are read-only and an explanation is shown

#### Scenario: Cancelled project is excluded from group progress

- **WHEN** an umbrella contains a cancelled project
- **THEN** umbrella completion is computed from the remaining non-cancelled projects

## ADDED Requirements

### Requirement: Project detail exposes a tabbed workspace

Project detail SHALL show Overview, Journey Management, Board, Backlog, Forms, and Media Order tabs, with Overview as the initial tab. Every tab SHALL offer `Selesaikan Tahap` for the active step when the user may manage steps. The tab set and the content of each tab MUST reflect the current user's role.

#### Scenario: Open project detail

- **WHEN** an authorized commercial user opens a project
- **THEN** the workspace shows the six tabs with Overview selected

#### Scenario: Open a legacy project

- **WHEN** a legacy project is opened
- **THEN** the same tabs are available and legacy content stays readable

#### Scenario: Complete a stage from a tab

- **WHEN** the owning PM opens any workspace tab while a step is active
- **THEN** `Selesaikan Tahap` is available below the tab bar

### Requirement: Workspace tabs are scoped by role

An Assignee MUST see only Overview, Board, and Backlog in project detail, and both Board and Backlog MUST be filtered to cards assigned to that Assignee. Assignee, Media, and BOD MUST NOT be offered Journey Management, Forms, or Media Order. Finance MUST NOT be offered Board or Backlog. Media and BOD MUST NOT open project detail through the workspace.

#### Scenario: Assignee tab set

- **WHEN** an Assignee opens a project where they hold a card
- **THEN** only Overview, Board, and Backlog are offered

#### Scenario: Assignee board is filtered

- **WHEN** an Assignee opens the Board tab
- **THEN** only cards assigned to that Assignee are shown

#### Scenario: Assignee backlog is filtered

- **WHEN** an Assignee opens the Backlog tab
- **THEN** only cards assigned to that Assignee are listed

#### Scenario: Finance has no board tabs

- **WHEN** a Finance user opens project detail
- **THEN** Board and Backlog are not offered

#### Scenario: Media and BOD cannot open project detail

- **WHEN** a Media or BOD user requests a project detail route
- **THEN** the system denies access and returns the user to their landing page

### Requirement: Media Order is an optional Prospek finance step

Media Order MUST be selectable as a Finance form step kind with `mo` as the form type. It MUST NOT be created automatically as a mandatory step. A user MAY add it to the Prospek phase through Journey Management or include it in a template, and the step MUST complete under the same rule as other Finance form steps. The Media Order form MUST NOT be approved without at least one non-cancelled MO document.

#### Scenario: Add a Media Order step

- **WHEN** the owning PM adds a step with jenis `Form keuangan` and form type `Media Order` to Prospek
- **THEN** the step is stored in Prospek, is labelled `Opsional`, and opens the Media Order form page

#### Scenario: MO is not auto-created

- **WHEN** a template or project includes Prospek without a Media Order step
- **THEN** no Media Order step is added automatically

#### Scenario: Complete the MO step

- **WHEN** the Media Order form is approved and has a non-cancelled document
- **THEN** the Media Order step can be completed

#### Scenario: Block approval without a document

- **WHEN** an authorized user tries to approve a Media Order form with no non-cancelled document
- **THEN** approval is rejected and the form stays fillable

#### Scenario: MO step is audited

- **WHEN** a Media Order step or MO document is added, edited, or removed
- **THEN** a project event records the actor, time, and affected item

## REMOVED Requirements

### Requirement: Project detail exposes a five-tab workspace

**Reason**: Project detail now has six tabs including Media Order, and the available tabs differ by role.

**Migration**: Use the `Project detail exposes a tabbed workspace` and `Workspace tabs are scoped by role` requirements.
