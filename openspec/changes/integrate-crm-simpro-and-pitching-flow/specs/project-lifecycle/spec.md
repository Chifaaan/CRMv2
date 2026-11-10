# Spec Delta

## MODIFIED Requirements

### Requirement: Project workspace tabs

Detail proyek CRM SHALL menyediakan lima tab: Overview, Journey Management, Board, Backlog, dan Forms, untuk semua proyek termasuk legacy, dengan Overview sebagai tab awal.

#### Scenario: Open project detail

- **WHEN** pengguna membuka detail proyek
- **THEN** sistem menampilkan tab Overview, Journey Management, Board, Backlog, dan Forms

#### Scenario: Legacy project uses the same tabs

- **WHEN** pengguna membuka proyek legacy
- **THEN** kelima tab tetap tersedia dan isi legacy tetap dapat dibaca

#### Scenario: Default tab

- **WHEN** pengguna pertama kali membuka detail proyek
- **THEN** sistem menampilkan tab Overview

#### Scenario: Board tab is no longer available

- **WHEN** pengguna membuka route Board milik Detail Proyek SIMPRO lama
- **THEN** sistem mengarahkan pengguna ke tab Board pada Detail Proyek CRM

#### Scenario: CRM work tabs show project data

- **WHEN** pengguna membuka tab Board, Backlog, atau Forms pada Detail Proyek CRM
- **THEN** sistem menampilkan data proyek tersebut sesuai fungsi tab tanpa berpindah ke Detail Proyek SIMPRO

### Requirement: New projects use a manual journey

Proyek baru yang dibuat langsung SHALL dibuat tanpa step dari template; seluruh step dibuat dan dinamai bebas oleh PM/Admin di Journey Management. Proyek yang lahir dari konversi Pitching SHALL memakai template yang tersimpan pada Pitching tersebut.

#### Scenario: Create a new project

- **WHEN** PM atau Admin membuat proyek baru secara langsung
- **THEN** proyek dibuat tanpa step dan berstatus belum dimulai

#### Scenario: Add any named step

- **WHEN** PM/Admin membuat step di Journey Management
- **THEN** step dibuat dengan nama bebas tanpa terikat template untuk proyek manual

#### Scenario: Create a step in the next phase

- **WHEN** PM/Admin membuat step untuk fase berikutnya
- **THEN** step disimpan sebagai pending sampai fasenya aktif

#### Scenario: Prospek project receives template steps

- **WHEN** Pitching menang dengan kontrak lengkap dikonversi menjadi proyek
- **THEN** proyek baru dibuat dengan tahapan dan step dari template Pitching, bukan sebagai proyek manual kosong

### Requirement: Step management follows lifecycle state

Only the owning PM or Admin SHALL manage project steps; pending steps in Planning and Running may be added, removed, edited, or reordered at any time while the project is active, while active or completed steps may only have their name, Manager PIC, or description changed.

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

#### Scenario: Edit or delete a pending Prospek template step

- **WHEN** the owning PM or Admin edits or deletes a pending step copied from a Pitching template
- **THEN** the change is applied only to that project and the template Pitching is not modified

## ADDED Requirements

### Requirement: Prospek projects copy their Pitching template

A project converted from a winning Pitching SHALL create its stages and steps from the template stored on that Pitching, preserving the template version used by the Pitching.

#### Scenario: Convert with a project template
- **WHEN** a winning Pitching with a complete contract is converted
- **THEN** the child project receives stages and steps copied from the Pitching template

#### Scenario: Keep the Pitching template version
- **WHEN** the Pitching references a template version
- **THEN** the child project records that template and version without switching to a different template

#### Scenario: Start the copied journey
- **WHEN** the converted project is started from Planning or Running
- **THEN** the copied template steps follow the normal lifecycle, activation, and phase rules

#### Scenario: Direct projects remain manual
- **WHEN** a project is created directly without a Prospek
- **THEN** it remains a manual project with no template steps
