# Spec Delta

## ADDED Requirements

### Requirement: Project workspace tabs

Detail proyek CRM SHALL menyediakan tiga tab: Overview, Journey Management, dan Board, untuk semua proyek termasuk legacy, dengan Overview sebagai tab awal.

#### Scenario: Open project detail
- **WHEN** pengguna membuka detail proyek
- **THEN** sistem menampilkan tab Overview, Journey Management, dan Board

#### Scenario: Legacy project uses the same tabs
- **WHEN** pengguna membuka proyek legacy
- **THEN** ketiga tab tetap tersedia dan isi legacy tetap dapat dibaca

#### Scenario: Default tab
- **WHEN** pengguna pertama kali membuka detail proyek
- **THEN** sistem menampilkan tab Overview

### Requirement: Overview summarizes project origin and history

Tab Overview SHALL menampilkan Asal Prospek, Riwayat Aktivitas, dan Penyelesaian Tahap.

#### Scenario: Show prospek origin
- **WHEN** proyek berasal dari Prospek
- **THEN** Overview menampilkan Prospek, Pitching, PIC, client, periode, pagu, RAB, Quotation, dan kontrak/Termine yang diwarisi

#### Scenario: Show activity history
- **WHEN** pengguna membuka Overview
- **THEN** sistem menampilkan riwayat aktivitas proyek terurut waktu beserta aktor dan ringkasan

#### Scenario: Show step completion
- **WHEN** pengguna membuka Overview
- **THEN** sistem menampilkan ringkasan step yang selesai, dilewati, dan belum selesai

### Requirement: New projects use a manual journey

Proyek baru SHALL dibuat tanpa step dari template; seluruh step dibuat dan dinamai bebas oleh PM/Admin di Journey Management.

#### Scenario: Create a new project
- **WHEN** PM atau Admin membuat proyek baru
- **THEN** proyek dibuat tanpa step dan berstatus belum dimulai

#### Scenario: Add any named step
- **WHEN** PM/Admin membuat step di Journey Management
- **THEN** step dibuat dengan nama bebas tanpa terikat template

#### Scenario: Create a step in the next phase
- **WHEN** PM/Admin membuat step untuk fase berikutnya
- **THEN** step disimpan sebagai pending sampai fasenya aktif

### Requirement: Workspace header actions and overview task distribution

Setiap tab workspace SHALL menampilkan tombol Selesaikan Tahap di bawah header, dan Overview SHALL menampilkan distribusi task SIMPRO proyek.

#### Scenario: Complete stage from any tab
- **WHEN** PM/Admin membuka Overview, Journey Management, atau Board dan ada step aktif
- **THEN** tombol Selesaikan Tahap tersedia di bawah header

#### Scenario: Select a step for the board
- **WHEN** PM memilih step di Journey Management
- **THEN** tab Board menampilkan task untuk step yang dipilih

#### Scenario: Edit a step
- **WHEN** PM/Admin memilih opsi Edit pada sebuah step
- **THEN** nama, deskripsi, dan Manager PIC step dapat diperbarui sesuai aturan lifecycle

#### Scenario: Show project task distribution
- **WHEN** pengguna membuka Overview
- **THEN** sistem menampilkan jumlah task per status SIMPRO dan progress task hanya untuk proyek tersebut

### Requirement: Running phase stays empty when starting in Planning

Memilih Planning sebagai fase awal SHALL NOT membuat step Running; step Running hanya ada jika PM/Admin menambahkannya.

#### Scenario: Start in Planning
- **WHEN** PM/Admin memulai proyek dari Planning
- **THEN** fase Running tidak memiliki step sampai ditambahkan secara manual

#### Scenario: Start directly in Running
- **WHEN** PM/Admin memulai proyek langsung dari Running
- **THEN** fase Planning ditandai Dilewati dan proyek masuk Running

## MODIFIED Requirements

### Requirement: New projects use the post-Prospek phase sequence

New projects, including projects converted from a winning Prospek Pitching, SHALL use Planning, Running, and Finance in that fixed order; Prospek SHALL NOT be a project step or phase in these new journeys.

#### Scenario: Create a project from a template
- **WHEN** PM atau Admin membuat proyek baru
- **THEN** proyek tidak menerima step dari template dan memakai urutan Planning, Running, Finance

#### Scenario: Convert a winning Prospek Pitching
- **WHEN** a winning Pitching is converted to a child project
- **THEN** the child project starts its execution journey after Prospek and contains no Prospek-phase project step

#### Scenario: Keep legacy Prospek steps
- **WHEN** a project created before this change contains Prospek-phase steps
- **THEN** those steps and their statuses remain available as legacy history and do not block the new three-phase flow for new projects

### Requirement: Initial phase selection starts the appropriate first step

The system SHALL allow Planning or Running as an initial phase and SHALL NOT allow Finance as an initial phase.

#### Scenario: Start a manual project
- **WHEN** the owner chooses an initial phase for a manual project
- **THEN** the system opens Create Step for that phase and creates/activates the step only after the step form is submitted

#### Scenario: Start a template project in Planning
- **WHEN** the owner chooses Planning for a manual project
- **THEN** the first Planning step becomes active after its required Manager PIC is set

#### Scenario: Start a template project in Running
- **WHEN** the owner chooses Running for a manual project
- **THEN** Planning is marked Dilewati and the first Running step becomes active after its required Manager PIC is set

#### Scenario: Finance cannot be selected as the initial phase
- **WHEN** the owner tries to start directly in Finance
- **THEN** the system rejects the choice and leaves Finance unavailable until Running is completed

### Requirement: Only one project step is active

An active project SHALL have at most one active step; a later step SHALL become active only after the current step is completed and any required phase transition is recorded.

#### Scenario: Activate a later template step
- **WHEN** the active step is completed and the next pending step is in the current active phase
- **THEN** the next step becomes active without activating any other step

#### Scenario: Activate a template step without Manager PIC
- **WHEN** a step is selected for activation without a Manager PIC
- **THEN** activation is blocked and the project remains at the previous lifecycle position

#### Scenario: Display current phase
- **WHEN** a project has an active step
- **THEN** its current phase is shown as Planning, Running, or Finance on project cards and project detail

### Requirement: Step management follows lifecycle state

Only the owning PM or Admin SHALL manage project steps; pending steps in Planning and Running may be added, removed, or reordered at any time while the project is active, while active or completed steps may only have their name, Manager PIC, or description changed.

#### Scenario: Add a manual step
- **WHEN** the owning PM or Admin creates a step after project start
- **THEN** its phase is set to Planning, Running, or the active Finance phase, and its type is SIMPRO in Planning/Running or Form Keuangan in Finance

#### Scenario: Manage Planning and Running steps at any time
- **WHEN** the owning PM or Admin manages a pending Planning or Running step while the project is active
- **THEN** the step can be added, edited, removed, or reordered regardless of which of those phases is currently active

#### Scenario: Change an unstarted step
- **WHEN** the owning PM or Admin edits, reorders, or removes a pending step
- **THEN** the change is applied subject to the fixed Planning → Running → Finance order and is recorded in project history

#### Scenario: Edit a started or completed step
- **WHEN** the owning PM or Admin edits an active or completed step
- **THEN** only its name, Manager PIC, or description can change and the before/after values are audited

#### Scenario: Reject unauthorized step changes
- **WHEN** a Manager, Assignee, Finance user, or non-owning PM attempts to manage a step
- **THEN** the system rejects the change

#### Scenario: View a skipped step
- **WHEN** a user selects a Dilewati step in the stepper
- **THEN** its skipped state remains visible and its project history can be opened

### Requirement: Project progress reflects its creation mode

Project detail and cards SHALL show progress in a way that does not imply a meaningful percentage for manually assembled steps.

#### Scenario: Show manual-project progress
- **WHEN** a manual project has steps
- **THEN** progress is shown as the number of completed steps (“Step ke-N selesai”) and not as a percentage

#### Scenario: Show template-project progress
- **WHEN** a legacy template project has steps
- **THEN** progress may be shown as a percentage calculated from its steps, with Dilewati steps still visible in the stepper

## REMOVED Requirements

### Requirement: New-project templates match the three-phase work model

**Reason**: Proyek baru tidak lagi memakai template; seluruh step dibuat manual.

**Migration**: Template lama dan snapshot proyek legacy tetap disimpan untuk histori; template tidak lagi ditawarkan saat membuat proyek baru.

### Requirement: New project creation supports template and manual modes

**Reason**: Pembuatan proyek baru disederhanakan menjadi manual-only.

**Migration**: Proyek baru dibuat tanpa step; PM/Admin menambahkan step di Journey Management. Proyek template lama tetap berjalan sebagai legacy.
