# Spec Delta

## ADDED Requirements

### Requirement: Manager and Admin assign forms from CRM or the opened form

Manager and Admin MUST be able to assign a form entry or a finance form from CRM and from the opened form page. Assignment MUST record the actor, set the form to assigned, notify the assignee, and write an audit event. PM, Finance, Assignee, Media, and BOD users MUST NOT assign forms.

#### Scenario: Assign a form entry from CRM
- **WHEN** a Manager assigns an unassigned form entry to an eligible user in CRM
- **THEN** the entry becomes assigned, the assignee is notified, and the allocation is audited

#### Scenario: Assign a finance form from the opened form
- **WHEN** a Manager opens a finance form and selects an eligible assignee
- **THEN** the form becomes assigned without returning to CRM, the assignee is notified, and the allocation is audited

#### Scenario: PM cannot assign a form
- **WHEN** a PM attempts to assign a form entry or finance form
- **THEN** the system rejects the action with a role explanation

#### Scenario: Assignment notification links to the form
- **WHEN** a form entry or finance form is assigned
- **THEN** the assignee receives an unread in-app notification whose link opens that form

### Requirement: Form assignees are role-appropriate

Form entries MUST be assignable to Assignee or Media users. RAB, Invoice, and Pembayaran finance forms MUST be assignable only to Finance. BAST MUST be assignable to Finance or Media. Assignment to a user outside these sets MUST be rejected.

#### Scenario: BAST is assigned to Media
- **WHEN** a Manager assigns a BAST finance form to a Media user
- **THEN** the assignment succeeds and Media can open the BAST

#### Scenario: RAB cannot be assigned to Media
- **WHEN** a Manager attempts to assign a RAB finance form to a Media user
- **THEN** the system rejects the assignment

#### Scenario: Form entry is assigned to Assignee
- **WHEN** a Manager assigns a form entry to an Assignee user
- **THEN** the assignment succeeds and the entry appears in that user's SIMPRO Forms

### Requirement: Assigned forms appear in SIMPRO Forms

Every assigned form entry and finance form MUST appear in SIMPRO Forms for its assignee, grouped by project and form type. A Media assignee MUST be able to open and submit an assigned BAST; Finance MUST be able to open assigned RAB, BAST, Invoice, and Pembayaran forms. The owning PM and Admin MUST retain oversight visibility, and the Forms badge MUST count forms the user still has to fill.

#### Scenario: Assignee sees assigned form entries
- **WHEN** an Assignee opens SIMPRO Forms
- **THEN** only form entries assigned to that user are shown from operational work

#### Scenario: Media opens assigned BAST
- **WHEN** a Media user opens SIMPRO Forms with an assigned BAST
- **THEN** the BAST is listed and opens in an editable form for that user

#### Scenario: Finance sees assigned finance forms
- **WHEN** a Finance user opens SIMPRO Forms
- **THEN** only finance forms assigned to that user are shown for assignment work

#### Scenario: Non-assigned operational user does not see the form
- **WHEN** an Assignee or Media user is not the assignee of a form
- **THEN** that form is not shown in their SIMPRO Forms

#### Scenario: Forms badge counts pending assigned work
- **WHEN** a user has assigned, draft, or need-revision forms
- **THEN** the Forms badge counts those forms until they are submitted
