# revenue-tracking Specification

## Purpose

Defines how RAB and Media Order line items carry business-unit ownership, how revenue and margin are derived, and how BOD sees the aggregated commercial picture per business unit and umbrella campaign.

## Requirements

### Requirement: RAB remains an interactive line-item table

RAB MUST be editable as an interactive table while the project allows edits. Users MUST be able to add, edit, and remove line items, and the total MUST recalculate immediately from quantity and unit price.

#### Scenario: Add and edit RAB items
- **WHEN** an authorized Finance user adds a line item and changes its quantity or unit price
- **THEN** the RAB total recalculates from the current items without a page reload

#### Scenario: Remove a RAB item
- **WHEN** an authorized user removes a line item
- **THEN** the item disappears and the total excludes it

#### Scenario: RAB is read-only after baseline lock
- **WHEN** the winning gate has locked the RAB baseline
- **THEN** the RAB table is read-only

### Requirement: Media Order is an interactive project table

An MO MUST be attached to a project and MUST behave as an interactive table of line items. Each line item MUST record description, quantity, unit, client unit price, vendor unit cost, and business unit. MO totals MUST recalculate immediately.

#### Scenario: Create an MO for a project
- **WHEN** an authorized user creates an MO on an active project
- **THEN** the MO is stored against that project and opens as an editable table

#### Scenario: MO follows negotiation changes
- **WHEN** an authorized user changes an MO item quantity, client price, or vendor cost
- **THEN** the line revenue, line margin, and MO totals recalculate

#### Scenario: Closed project MO is read-only
- **WHEN** the project lifecycle is `done`, `lost`, or `cancelled`
- **THEN** the MO table is read-only

### Requirement: Every commercial item has a business unit

Every RAB and MO line item MUST be mapped to exactly one business unit. The selectable units MUST include Makerspace, Makerspace Video, and Spektrum. An item without a business unit MUST be rejected on save.

#### Scenario: Missing business unit blocks save
- **WHEN** a user saves an MO item without selecting a business unit
- **THEN** the system shows a validation error and does not save the item

#### Scenario: Business unit is shown per item
- **WHEN** a user opens an RAB or MO table
- **THEN** each row shows its owning business unit

### Requirement: Revenue and margin derive from MO items

MO line revenue MUST equal quantity times client unit price. MO line cost MUST equal quantity times vendor unit cost. MO line margin MUST equal revenue minus cost, and margin percentage MUST equal margin divided by revenue when revenue is greater than zero.

#### Scenario: Line margin is calculated
- **WHEN** an MO item has quantity 2, client unit price 1,000,000, and vendor unit cost 700,000
- **THEN** the line shows revenue 2,000,000, cost 1,400,000, margin 600,000, and margin percentage 30 percent

#### Scenario: Zero revenue does not divide by zero
- **WHEN** an MO item has zero client price
- **THEN** margin percentage is shown as zero or not available instead of an error

#### Scenario: Negative margin is visible
- **WHEN** vendor cost exceeds client price on an item
- **THEN** the negative margin is displayed and flagged, and saving is not silently blocked

### Requirement: RAB is the planned cost baseline

The approved RAB MUST act as the planned cost baseline. The system MUST compare the planned RAB cost per business unit with the MO cost per business unit and expose the variance.

#### Scenario: Baseline versus MO variance
- **WHEN** a project has an approved RAB and an MO mapped to the same business unit
- **THEN** the dashboard shows planned cost, MO cost, and the variance for that unit

#### Scenario: Project without MO shows baseline only
- **WHEN** a project has an approved RAB but no MO
- **THEN** the dashboard shows the baseline cost and marks revenue and margin as not available

### Requirement: MO rolls up to the umbrella campaign

An MO MUST roll up to the project's group when the project belongs to one. A project without a group MUST be reported as a standalone project.

#### Scenario: Group totals include member MOs
- **WHEN** two projects in the same group each have an MO
- **THEN** the group's revenue, cost, and margin include both projects' MOs

#### Scenario: Standalone project is reported separately
- **WHEN** a project is not in any group
- **THEN** its MO appears under standalone projects and not under an umbrella

### Requirement: Business Dashboard is restricted to BOD and Admin

The Business Dashboard MUST be available only to the BOD and Admin roles and MUST be read-only. Manager, PM, Finance, Assignee, and Media MUST NOT open it.

#### Scenario: BOD opens the dashboard
- **WHEN** a BOD user opens the Business Dashboard
- **THEN** the dashboard shows revenue, cost, margin, and margin percentage per business unit

#### Scenario: Other roles are denied
- **WHEN** a Manager, PM, Finance, Assignee, or Media user opens the Business Dashboard route
- **THEN** access is denied and the user is redirected to their landing page

#### Scenario: Dashboard has no edit actions
- **WHEN** a BOD or Admin user views the dashboard
- **THEN** no action can change RAB, MO, or project data from the dashboard

### Requirement: Dashboard aggregates by business unit and umbrella

The Business Dashboard MUST aggregate MO and RAB data by business unit and by umbrella campaign. It MUST allow filtering by period and by umbrella, and MUST show a clear empty state when no commercial data exists.

#### Scenario: Aggregate per business unit
- **WHEN** MO items exist for Makerspace, Makerspace Video, and Spektrum
- **THEN** each unit shows its revenue, cost, margin, margin percentage, and item count

#### Scenario: Filter by umbrella
- **WHEN** a BOD user selects one umbrella group
- **THEN** totals include only projects in that group

#### Scenario: Empty state
- **WHEN** no RAB or MO data exists for the selected filter
- **THEN** the dashboard shows an empty state instead of zero-value charts presented as real data

### Requirement: Commercial changes are audited

Creating, editing, or deleting an MO or RAB item MUST be recorded in the project audit trail with the actor, time, and affected item. Business-unit mapping changes MUST be recorded as part of the same event.

#### Scenario: MO edit is audited
- **WHEN** a user changes an MO item's revenue or business unit
- **THEN** a project event records the before and after values and the actor

#### Scenario: Delete is audited
- **WHEN** a user deletes an MO or RAB item
- **THEN** the audit trail records that the item was removed with its identifying description
