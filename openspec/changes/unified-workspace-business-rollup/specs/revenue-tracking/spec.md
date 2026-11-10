# Spec Delta

## MODIFIED Requirements

### Requirement: Media Order is an interactive project table

An MO MUST be attached to a project and MUST behave as an interactive table of line items. Each line item MUST record description, quantity, unit, client unit price, vendor unit cost, and business unit. MO totals MUST recalculate immediately. The owning PM, Manager, Finance, and Admin MUST be able to manage an MO while the project is active. MO MUST also be exposed as a Form Keuangan category with multiple documents per project.

#### Scenario: Create an MO for a project

- **WHEN** an authorized user creates an MO on an active project
- **THEN** the MO is stored against that project and opens as an editable table

#### Scenario: MO follows negotiation changes

- **WHEN** an authorized user changes an MO item quantity, client price, or vendor cost
- **THEN** the line revenue, line margin, and MO totals recalculate

#### Scenario: Closed project MO is read-only

- **WHEN** the project lifecycle is `done`, `lost`, or `cancelled`
- **THEN** the MO table is read-only

#### Scenario: Unauthorized role cannot manage MO

- **WHEN** an Assignee, Media, or BOD user views a project MO
- **THEN** the MO is read-only for that user

#### Scenario: MO is a Finance form category

- **WHEN** a project has a Media Order form
- **THEN** Media Order is listed as a Form Keuangan category and opens as a full finance form page

#### Scenario: Multiple MO documents per project

- **WHEN** an authorized user creates a second MO on the same project
- **THEN** both documents are stored, listed on the MO form page, and included in the project's cumulative MO

#### Scenario: MO step in Prospek

- **WHEN** a user adds a Media Order step to the Prospek phase
- **THEN** the step is a Finance form step whose form page manages the project's MO documents

## ADDED Requirements

### Requirement: MO rolls up to the umbrella project

An MO MUST roll up to the project's umbrella project when the project belongs to one. A project without an umbrella MUST be reported as standalone.

#### Scenario: Umbrella totals include member MOs

- **WHEN** two projects in the same umbrella each have an MO
- **THEN** the umbrella's revenue, cost, and margin include both projects' MOs

#### Scenario: Project joined to an umbrella

- **WHEN** a project is added to an Umbrella Project from the Umbrella Projects page and has an MO
- **THEN** the MO appears under that umbrella in the dashboard

#### Scenario: Standalone project is reported separately

- **WHEN** a project is not in any umbrella
- **THEN** its MO appears under standalone projects and not under an umbrella

### Requirement: Project commercial totals are derived consistently

A project's cumulative RAB MUST sum quantity times unit price from approved RAB items that have a business unit. Its cumulative MO MUST sum quantity times client unit price from non-cancelled MO documents, counting only mapped items. Projects with lifecycle `lost` or `cancelled` MUST NOT contribute commercial totals.

#### Scenario: Only approved RAB counts

- **WHEN** a project has a draft RAB and an approved RAB
- **THEN** the cumulative RAB uses the approved RAB items

#### Scenario: Non-cancelled MO counts

- **WHEN** a project has one final MO and one cancelled MO
- **THEN** the cumulative MO uses only the final MO

#### Scenario: Unmapped items are excluded

- **WHEN** a RAB or MO contains an item without a business unit
- **THEN** the item is excluded from the project total and reported as unmapped

#### Scenario: Closed project reports no contribution

- **WHEN** a project becomes lost or cancelled
- **THEN** its RAB and MO no longer contribute to project or umbrella totals

## REMOVED Requirements

### Requirement: Business Dashboard is restricted to BOD and Admin

**Reason**: Business access is expanded to Admin, Manager, PM, Finance, and BOD through the Business submenu, with read-only rules owned by the `business-hub` capability.

**Migration**: Use the `business-hub` requirements `Business is a submenu with three surfaces`, `Business surfaces are read-only`, and `Business Dashboard pulls commercial data automatically` for access and behavior.

### Requirement: MO rolls up to the umbrella campaign

**Reason**: The grouping concept is renamed to Umbrella Project and the rollup now also covers cumulative RAB and MO totals.

**Migration**: Use the `MO rolls up to the umbrella project` requirement and the `umbrella-projects` capability.
