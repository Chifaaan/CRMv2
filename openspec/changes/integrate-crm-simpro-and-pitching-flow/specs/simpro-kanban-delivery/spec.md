# Spec Delta

## MODIFIED Requirements

### Requirement: Assignee sees only running and completed SIMPRO stages

Pada tab Board di Detail Proyek CRM, pilihan tahap SHALL hanya berisi step SIMPRO yang sedang berjalan atau sudah selesai untuk semua role. Step yang belum berjalan MUST NOT ditampilkan atau dapat diakses, dan step selesai bersifat read-only.

#### Scenario: Hide pending stages from Assignee

- **WHEN** pengguna mana pun membuka tab Board proyek di CRM
- **THEN** pilihan tahap hanya berisi step aktif dan step selesai

#### Scenario: Assignee cannot access a pending stage

- **WHEN** Assignee mencoba membuka step SIMPRO yang belum berjalan melalui pilihan tahap atau tautan langsung
- **THEN** sistem tidak menampilkan step tersebut dan memilih step aktif atau step selesai yang tersedia

#### Scenario: View completed stage read-only

- **WHEN** pengguna memilih step yang sudah selesai
- **THEN** board menampilkan task step tersebut tanpa aksi edit

#### Scenario: Default to the running stage

- **WHEN** proyek memiliki step SIMPRO yang sedang berjalan
- **THEN** Board memilih step tersebut secara default

### Requirement: Planning and Running steps use the existing SIMPRO Kanban

Each active Planning or Running step SHALL use the existing SIMPRO columns Backlog, To Do, In Progress, Awaiting Approval, Need Revision, and Completed on the Board tab of CRM Project Detail.

#### Scenario: Open a project board

- **WHEN** an authorized user opens a project's Board tab in CRM
- **THEN** the board shows cards for the active step by default and identifies the step on each card

#### Scenario: Open a completed step

- **WHEN** a user views a completed step's board
- **THEN** its cards are read-only and retain their status and history

#### Scenario: Keep Finance out of Kanban

- **WHEN** the active project phase is Finance
- **THEN** Finance work is presented as CRM Form Keuangan and not as SIMPRO cards
