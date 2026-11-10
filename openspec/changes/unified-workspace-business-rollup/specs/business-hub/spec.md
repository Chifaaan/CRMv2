# Spec Delta

## Purpose

Provides one Business area where commercial roles review per-project RAB and Media Order data and monitor automatic revenue and margin performance.

## ADDED Requirements

### Requirement: Business is a submenu with three surfaces

The workspace MUST expose a Business navigation entry containing `Business Dashboard`, `RAB`, and `MO`. The Dashboard MUST remain at `/business`, and the tables MUST live at `/business/rab` and `/business/mo`. Admin, Manager, PM, Finance, and BOD MUST be able to open all three surfaces. Assignee and Media MUST NOT see or open Business.

#### Scenario: Commercial role opens Business

- **WHEN** an Admin, Manager, PM, Finance, or BOD user opens Business
- **THEN** the Business Dashboard opens and the RAB and MO tabs are available

#### Scenario: Navigate between Business tabs

- **WHEN** the user selects the MO tab
- **THEN** `/business/mo` opens with the MO table and the Business navigation still identifies the active tab

#### Scenario: Operational role has no Business entry

- **WHEN** an Assignee or Media user opens the workspace navigation
- **THEN** Business is not offered

#### Scenario: Operational role is redirected

- **WHEN** an Assignee or Media user requests `/business/rab` or `/business/mo`
- **THEN** the system denies access and returns the user to their landing page

### Requirement: Business RAB table summarises every eligible project

The RAB table MUST show one row per project that has a RAB form with at least one item. Each row MUST show the project code and name, umbrella attribution, project phase or status, item count, total RAB, RAB status, last update, and an action to open the project's RAB detail. The total MUST sum quantity times unit price for items with a business unit. Rows for finished projects MUST remain readable.

#### Scenario: Row content

- **WHEN** a project has an approved RAB with three mapped items
- **THEN** its row shows the project identity, umbrella, phase, three items, the summed total, and the approved status

#### Scenario: Open RAB detail

- **WHEN** the user selects a RAB row action
- **THEN** the project's RAB detail opens showing the line items and their business units

#### Scenario: Unmapped items are flagged

- **WHEN** a RAB contains items without a business unit
- **THEN** the row reports them as unmapped and excludes them from the total

#### Scenario: Project without RAB

- **WHEN** a project has no RAB form or an empty RAB
- **THEN** it is not listed in the RAB table

#### Scenario: Empty RAB table

- **WHEN** no project in scope has RAB data
- **THEN** the table area shows an empty state

### Requirement: Business MO table summarises project Media Orders

The MO table MUST show one row per project that has at least one non-cancelled Media Order. Each row MUST show the project code and name, umbrella attribution, project phase or status, MO document count, item count, revenue, cost, margin, margin percentage, mapping status, and an action to open the project's MO detail. Revenue MUST equal quantity times client unit price, cost MUST equal quantity times vendor unit cost, and only mapped items MUST count. Cancelled MO documents MUST be excluded.

#### Scenario: Row content

- **WHEN** a project has two non-cancelled MO documents with mapped items
- **THEN** its row shows both documents, the item count, revenue, cost, margin, margin percentage, and mapping status

#### Scenario: Cancelled MO is excluded

- **WHEN** a project has one final MO and one cancelled MO
- **THEN** the cancelled document's items do not affect the row totals or document count

#### Scenario: Negative margin is visible

- **WHEN** vendor cost exceeds client price on MO items
- **THEN** the row shows the negative margin and margin percentage without hiding the row

#### Scenario: Open MO detail

- **WHEN** the user selects an MO row action
- **THEN** the project's Media Order detail opens with its documents and line items

#### Scenario: Project without MO

- **WHEN** a project has no non-cancelled Media Order
- **THEN** it is not listed in the MO table

#### Scenario: Empty MO table

- **WHEN** no project in scope has MO data
- **THEN** the table area shows an empty state

### Requirement: Business tables respect project visibility

A PM MUST see only rows for projects they created. Manager, Finance, and Admin MUST see every project, and BOD MUST see the non-closed commercial portfolio. Rows for projects with lifecycle `lost` or `cancelled` MUST NOT contribute values, and a project that is not visible to the PM MUST NOT appear even when it has commercial data.

#### Scenario: PM table scope

- **WHEN** a PM opens the RAB or MO table
- **THEN** only their own projects are listed

#### Scenario: Manager table scope

- **WHEN** a Manager opens the RAB or MO table
- **THEN** every eligible project is listed

#### Scenario: Lost project is excluded

- **WHEN** a lost project has an approved RAB
- **THEN** it does not appear as a contributing row valued in the dashboard

### Requirement: Business surfaces are read-only

The Business submenu MUST NOT allow creating, editing, or deleting RAB items, MO documents, or MO items. Users with edit rights MUST follow a row action to the project surface where editing is allowed, and BOD MUST never be offered an edit action.

#### Scenario: No edit controls in the hub

- **WHEN** a Finance or BOD user views the RAB or MO table
- **THEN** no inline editing control is available

#### Scenario: Edit through the project

- **WHEN** an Admin opens a RAB row action and then edits an item on the project surface
- **THEN** the change saves and the Business table reflects the new total

#### Scenario: BOD stays read-only

- **WHEN** BOD opens any Business surface
- **THEN** every value is read-only and no project editing route is offered

### Requirement: Business Dashboard pulls commercial data automatically

The Business Dashboard MUST derive revenue, cost, margin, margin percentage, and RAB variance from approved RAB forms and non-cancelled Media Orders without manual entry. It MUST aggregate per business unit and support filtering by period and umbrella, and it MUST update after any qualified commercial change.

#### Scenario: MO edit reaches the dashboard

- **WHEN** an authorized user changes an MO item's client price
- **THEN** the dashboard revenue and margin update from the stored item without manual adjustment

#### Scenario: Aggregate per business unit

- **WHEN** MO items exist for Makerspace, Makerspace Video, and Spektrum
- **THEN** each unit shows its revenue, cost, margin, margin percentage, and item count

#### Scenario: Filter by umbrella

- **WHEN** the user selects one Umbrella Project
- **THEN** dashboard totals include only that umbrella's member projects

#### Scenario: No qualified data

- **WHEN** no qualified RAB or MO data exists for the selected filters
- **THEN** the dashboard shows an empty state instead of zero-value charts presented as real data
