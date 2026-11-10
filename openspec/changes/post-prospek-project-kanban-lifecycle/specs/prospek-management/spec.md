# Spec Delta

## MODIFIED Requirements

### Requirement: Winning pitching becomes a child project

Sistem SHALL mengizinkan PM pemilik atau Admin mengonversi Pitching menang yang kontraknya lengkap menjadi anak proyek, menyimpan tautan `prospekId` dan `pitchingId`, mewarisi RAB, Quotation, kontrak, PIC, client, periode, dan pagu Prospek, serta memulai journey eksekusi setelah fase Prospek tanpa membuat step Prospek.

#### Scenario: Convert a winning pitching
- **WHEN** PM pemilik atau Admin mengonversi Pitching berstatus menang dengan kontrak lengkap
- **THEN** sistem membuat satu anak proyek dengan `prospekId`, `pitchingId`, fase Planning/Running/Finance, data RAB/Quotation/kontrak, PIC, client, periode, dan pagu yang diwarisi dari Prospek

#### Scenario: Show inherited opportunity data in the project header
- **WHEN** pengguna yang berhak membuka header anak proyek
- **THEN** sistem menampilkan PIC, client, periode, pagu/nilai proyek, kontrak beserta Termine, RAB, dan Quotation tanpa meminta data Prospek diisi ulang

#### Scenario: Block conversion without a win or complete contract
- **WHEN** pengguna mencoba mengonversi Pitching yang belum menang atau kontraknya belum lengkap
- **THEN** sistem menolak konversi dan menampilkan syarat yang belum terpenuhi

#### Scenario: Conversion is idempotent
- **WHEN** Pitching yang sudah dikonversi dicoba dikonversi lagi
- **THEN** sistem tidak membuat proyek duplikat dan menampilkan proyek anak yang sudah ada

#### Scenario: Child project appears under its prospek
- **WHEN** anak proyek hasil konversi dibuka dari daftar Prospek
- **THEN** sistem menampilkan proyek tersebut sebagai anak dari Prospek dan Pitching asalnya tanpa mengubah perilaku Groups atau keanggotaan ProjectGroup

#### Scenario: Group is created from the prospek name
- **WHEN** Pitching menang dikonversi dan belum ada Group dengan nama Prospek
- **THEN** sistem membuat Group baru bernama sama dengan Prospek dan memasukkan anak proyek ke Group tersebut

#### Scenario: Existing group is reused
- **WHEN** Pitching menang dikonversi dan sudah ada Group dengan nama Prospek
- **THEN** sistem memakai Group tersebut tanpa membuat Group duplikat dan memasukkan anak proyek ke Group itu

#### Scenario: Multiple winning pitchings share the group
- **WHEN** dua Pitching menang dari Prospek yang sama dikonversi
- **THEN** kedua anak proyek menjadi anggota Group Prospek yang sama

## ADDED Requirements

### Requirement: Prospek child projects are discoverable as project cards
Projects SHALL show every visible child project converted from Prospek as an individual project card in the main Projects list and retain it as a member of its existing Group accordion.

#### Scenario: Show a Prospek child in both project views
- **WHEN** a user with project access opens Projects and the relevant Group
- **THEN** the child project is shown as an individual card in the Projects list and remains available as a project card in the Group accordion

#### Scenario: Link the child card to its Prospek
- **WHEN** a user activates the Prospek attribution on a child project card
- **THEN** the system navigates to the related Prospek or its linked Group detail

#### Scenario: Keep direct projects unattributed
- **WHEN** a project was created directly and has no `prospekId`
- **THEN** its project card has no Prospek attribution

#### Scenario: Preserve existing Groups behavior
- **WHEN** a user opens Groups or uses manual group drag-and-drop and accordion controls in Projects
- **THEN** group membership, cards, progress, and management behave as before

### Requirement: Projects search and filter include Prospek attribution
The Projects search SHALL match a child's parent Prospek name, and the existing project-type filtering SHALL offer a “Berasal dari Prospek” filter for child projects.

#### Scenario: Search by parent Prospek name
- **WHEN** a user searches Projects using a related Prospek name
- **THEN** visible child project cards matching that Prospek remain in the results

#### Scenario: Filter projects originating from Prospek
- **WHEN** a user selects “Berasal dari Prospek”
- **THEN** only visible projects with a `prospekId` are shown, while Group accordion behavior is preserved
