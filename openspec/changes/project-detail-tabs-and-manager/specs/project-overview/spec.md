# Spec Delta

## Purpose

Provides a single-project workspace overview inside CRM project detail: stage completion, SIMPRO task distribution, work progress, and recent activity for the opened project only.

## ADDED Requirements

### Requirement: Project detail is organized into two project-scoped tabs

CRM project detail MUST present two tabs, `Overview` and `Journey Management`, above the active step content. Both tabs MUST operate on the single opened project, and switching tabs MUST NOT change the project, its steps, or its work.

#### Scenario: Overview and Journey Management tabs are available
- **WHEN** an authorized user opens a CRM project detail page
- **THEN** the page shows an `Overview` tab and a `Journey Management` tab

#### Scenario: Switching tabs keeps the project
- **WHEN** the user switches from Overview to Journey Management
- **THEN** the same project remains open and no other project's data appears

#### Scenario: Default tab is Overview
- **WHEN** the user opens project detail without choosing a tab
- **THEN** the Overview tab is selected

### Requirement: Overview is scoped to the opened project

The Overview tab MUST aggregate only the opened project's stages, tasks, forms, and audit events. It MUST NOT include totals from other projects, groups, or the global dashboard.

#### Scenario: Other projects do not affect the overview
- **WHEN** another project has completed stages or many tasks
- **THEN** the opened project's overview counts remain unchanged

#### Scenario: Project without activity shows zeros
- **WHEN** the opened project has no tasks or completed stages
- **THEN** the overview shows zero counts instead of hiding the sections

### Requirement: Overview summarizes stage completion

The Overview tab MUST show the opened project's stage completion as completed, skipped, and not completed counts.

#### Scenario: Stage completion reflects the journey
- **WHEN** the project has two completed stages, one skipped stage, and one pending stage
- **THEN** the overview shows 2 completed, 1 skipped, and 1 not completed

### Requirement: Overview shows SIMPRO task distribution

The Overview tab MUST list every SIMPRO task status with its card count and percentage of the opened project's non-archived tasks.

#### Scenario: Task distribution uses all six statuses
- **WHEN** the project has cards in Backlog, To Do, In Progress, Awaiting Approval, Need Revision, and Completed
- **THEN** the overview lists all six statuses with their counts and percentages

#### Scenario: Archived cards are excluded
- **WHEN** a card has been archived
- **THEN** it is not counted in the task distribution

### Requirement: Overview shows work progress

The Overview tab MUST show completed, open, and overdue task counts plus the percentage of completed tasks for the opened project.

#### Scenario: Progress overview counts completed and open work
- **WHEN** the project has three completed cards, two open cards, and one overdue card
- **THEN** the overview shows 3 completed, 3 open, 1 overdue, and 50 percent task completion

#### Scenario: No tasks shows zero percent
- **WHEN** the project has no task cards
- **THEN** the progress overview shows zero for every count and zero percent

### Requirement: Overview shows recent project activity

The Overview tab MUST show the most recent project audit events with actor, time, and summary, and MUST show an empty state when no events exist.

#### Scenario: Recent activity is listed
- **WHEN** the project has audit events
- **THEN** the overview shows the newest events with actor, timestamp, and summary

#### Scenario: Empty activity shows an empty state
- **WHEN** the project has no audit events
- **THEN** the overview shows that there is no recent activity

### Requirement: Overview completes the active stage

The Overview tab MUST offer a `Selesaikan Tahap` action that completes the currently active journey stage through the existing gate and no-work rules. The action MUST be available only to the owning PM or Admin and MUST be hidden or disabled when no stage is active.

#### Scenario: PM completes the active stage
- **WHEN** the owning PM uses `Selesaikan Tahap` while the active stage satisfies its completion rules
- **THEN** the stage is completed, the journey advances, and the action is recorded in the project history

#### Scenario: Gate blocks completion
- **WHEN** the active stage is a gate whose requirements are not met
- **THEN** the action is disabled and explains the unmet requirement

#### Scenario: Non-manager cannot complete the stage
- **WHEN** a Manager, Finance, Assignee, Media, or BOD user opens the overview
- **THEN** the `Selesaikan Tahap` action is not available to them
