# Spec Delta

## ADDED Requirements

### Requirement: Workspace dashboard combines CRM and SIMPRO information

The workspace Dashboard at `/dashboard` MUST be the single dashboard for every role. It MUST combine project and task summaries with CRM journey phase, approval, and commercial signals, scoped to the user's visible projects. Assignee and Media MUST see only their assigned work, Finance MUST also see assigned finance work, and BOD MUST NOT use this dashboard.

#### Scenario: Commercial user opens the dashboard

- **WHEN** an Admin, Manager, or PM opens `/dashboard`
- **THEN** the dashboard shows summary cards, task distribution, progress overview, projects needing attention, journey/approval signals, recent projects, and upcoming deadlines

#### Scenario: Finance opens the dashboard

- **WHEN** a Finance user opens `/dashboard`
- **THEN** the dashboard shows their assigned finance work alongside the project and task summary

#### Scenario: Assignee dashboard is scoped

- **WHEN** an Assignee opens the dashboard
- **THEN** summary cards, distribution, progress, and lists count only tasks and forms assigned to that Assignee and the projects where they work

#### Scenario: Media uses the same dashboard

- **WHEN** Media opens the dashboard
- **THEN** task data is limited to their assigned work

#### Scenario: Empty assigned work

- **WHEN** an Assignee has no active task
- **THEN** the personal task panel shows the empty state `Tidak ada task aktif`

#### Scenario: BOD is redirected

- **WHEN** a BOD user opens `/dashboard`
- **THEN** the user is redirected to Business

#### Scenario: Dashboard reflects stored changes

- **WHEN** a card status or finance form status changes
- **THEN** the next dashboard view reflects the new state without manual refresh data entry

## REMOVED Requirements

### Requirement: SIMPRO dashboard for assignees

**Reason**: CRM and SIMPRO dashboards are merged into one workspace dashboard with role-scoped content, so the SIMPRO-only dashboard requirement no longer describes the product.

**Migration**: Use the `Workspace dashboard combines CRM and SIMPRO information` requirement and the existing `/dashboard` route.
