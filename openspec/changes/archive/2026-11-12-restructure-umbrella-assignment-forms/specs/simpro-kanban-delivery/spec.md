# Spec Delta

## MODIFIED Requirements

### Requirement: PM creates unassigned cards and Managers assign them

The owning PM or Admin SHALL create cards in Backlog without an assignee; any Manager or Admin SHALL be able to assign a card on any PM's project, independently of the step's Manager PIC.

#### Scenario: Create a card

- **WHEN** the owning PM or Admin creates a card in an active SIMPRO step
- **THEN** the card starts in Backlog without an assignee

#### Scenario: Assign a card

- **WHEN** any Manager or Admin assigns a Backlog card to an operational assignee
- **THEN** the card moves to To Do and records its assignee

#### Scenario: Assign a card to Media

- **WHEN** any Manager or Admin assigns a Backlog card to a user with role Media
- **THEN** the card moves to To Do and records that user as its assignee

#### Scenario: Manager PIC does not limit assignment

- **WHEN** a Manager who is not the step's Manager PIC assigns a card
- **THEN** the assignment is allowed and the step's Manager PIC remains unchanged

### Requirement: Only the assigned worker advances work cards

A card's assigned operational worker SHALL move it from To Do to In Progress and from In Progress to Awaiting Approval; the owning PM or Admin SHALL review Awaiting Approval cards. Media is an operational worker, and Finance is a worker only for Pitching cards.

#### Scenario: Assigned worker starts work with a link

- **WHEN** the assigned worker moves a card from To Do to In Progress with a valid Link Pekerjaan
- **THEN** the card enters In Progress and the link is saved

#### Scenario: Media starts assigned work

- **WHEN** a Media user assigned to a project card moves it from To Do to In Progress with a valid Link Pekerjaan
- **THEN** the card enters In Progress and the link is saved

#### Scenario: Finance works a Pitching card

- **WHEN** Finance is assigned a Pitching card and moves it from To Do to In Progress with a valid Link Pekerjaan
- **THEN** the card enters In Progress and the link is saved

#### Scenario: Assigned worker submits work for review

- **WHEN** the assigned worker moves an In Progress card to Awaiting Approval
- **THEN** the card enters Awaiting Approval and is available to the owning PM for review

#### Scenario: PM approves submitted work

- **WHEN** the owning PM or Admin marks an Awaiting Approval card Completed
- **THEN** the card enters Completed and becomes read-only

#### Scenario: PM requests revision

- **WHEN** the owning PM or Admin moves an Awaiting Approval card to Need Revision with a comment
- **THEN** the card enters Need Revision and the comment is retained in its history

#### Scenario: Reject revision without a comment

- **WHEN** the owning PM or Admin requests revision without a comment
- **THEN** the system rejects the transition and leaves the card Awaiting Approval

#### Scenario: Scheduled card cannot start

- **WHEN** the assigned worker tries to move a card that is still tied to a pending step into To Do or In Progress
- **THEN** the system rejects the transition until the step becomes active

### Requirement: Assignee access is limited to SIMPRO work

An Assignee or Media user SHALL access only SIMPRO work assigned to that user and SHALL NOT access CRM project administration, Prospek pages, or Finance forms.

#### Scenario: Open assigned work

- **WHEN** an Assignee or Media user opens SIMPRO
- **THEN** only cards assigned to that user are available for work

#### Scenario: Reject CRM or Finance access

- **WHEN** an Assignee or Media user attempts to open CRM project management, Prospek, or Finance forms
- **THEN** the system denies access

## ADDED Requirements

### Requirement: Pitching form work uses a Pitching-scoped SIMPRO board

Sistem SHALL menyediakan board SIMPRO untuk kartu Form Pitching yang tidak terikat proyek, memakai enam kolom status SIMPRO, dan SHALL NOT mencampur kartu tersebut dengan Board proyek atau dengan step SIMPRO proyek.

#### Scenario: Pitching card lives outside a project

- **WHEN** sebuah kartu Form Pitching dibuat
- **THEN** kartu tersebut tersimpan dengan konteks Prospek dan Pitching tanpa `projectId` dan tidak tampil pada Board proyek mana pun

#### Scenario: Open the Pitching board

- **WHEN** pengguna yang berhak membuka section Form Pitching
- **THEN** sistem menampilkan kolom Backlog, To Do, In Progress, Awaiting Approval, Need Revision, dan Completed berisi kartu Pitching tersebut

#### Scenario: Assign a Pitching card

- **WHEN** Manager atau Admin meng-assign kartu Form Pitching kepada Assignee, Manager, Media, atau Finance
- **THEN** kartu berpindah ke To Do, assignee tercatat, dan penerima mendapat notifikasi

#### Scenario: Pitching card requires a work link

- **WHEN** assignee memindahkan kartu Form Pitching dari To Do ke In Progress tanpa Link Pekerjaan
- **THEN** transisi ditolak dan kartu tetap di To Do

#### Scenario: PM reviews a Pitching card

- **WHEN** PM pemilik Prospek atau Admin menyetujui kartu Form Pitching yang Awaiting Approval
- **THEN** kartu menjadi Completed dan tersimpan pada riwayat Pitching

#### Scenario: Archived Pitching freezes its cards

- **WHEN** Pitching berstatus kalah atau Prospek dibatalkan
- **THEN** kartu Form Pitching tampil read-only tanpa aksi transisi atau assignment

#### Scenario: Pitching cards are not Forms entries

- **WHEN** pengguna membuka halaman Forms
- **THEN** kartu Form Pitching tidak muncul sebagai row Form dan tidak dihitung pada badge Forms
