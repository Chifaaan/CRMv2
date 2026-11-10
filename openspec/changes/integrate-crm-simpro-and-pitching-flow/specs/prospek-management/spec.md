# Spec Delta

## MODIFIED Requirements

### Requirement: Prospek child projects are discoverable as project cards

Projects SHALL show every visible child project converted from Prospek as an individual project card in the flat Projects list with a clear Prospek/Umbrella label on its header. The Projects page MUST NOT render a Group accordion or Group section.

#### Scenario: Show a Prospek child in both project views

- **WHEN** a user with project access opens Projects
- **THEN** the child project is shown as an individual project card or table row with a clear Prospek label, without a Group accordion

#### Scenario: Link the child card to its Prospek

- **WHEN** a user activates the Prospek attribution on a child project card
- **THEN** the system navigates to the related Prospek

#### Scenario: Keep direct projects unattributed

- **WHEN** a project was created directly and has no `prospekId`
- **THEN** its project card has no Prospek attribution

#### Scenario: Preserve existing Groups behavior

- **WHEN** a user opens the CRM Groups menu or manages group data
- **THEN** Group membership and Group management remain available outside the Projects page

#### Scenario: Label an Umbrella project

- **WHEN** a project belongs to a Prospek or is part of an Umbrella project
- **THEN** its header shows a label such as “Prospek” together with the Prospek name

### Requirement: Projects search and filter include Prospek attribution

The Projects search SHALL match a child's parent Prospek name, and the project-type filtering SHALL offer a “Berasal dari Prospek” filter for child projects in both Card and Table views.

#### Scenario: Search by parent Prospek name

- **WHEN** a user searches Projects using a related Prospek name
- **THEN** visible child project cards matching that Prospek remain in the results

#### Scenario: Filter projects originating from Prospek

- **WHEN** a user selects “Berasal dari Prospek”
- **THEN** only visible projects with a `prospekId` are shown in the selected Card or Table view

### Requirement: Winning pitching becomes a child project

Sistem SHALL otomatis mengonversi setiap Pitching menang yang kontraknya lengkap menjadi anak proyek, menggunakan template yang tersimpan pada Pitching, menyimpan `prospekId` dan `pitchingId`, mewarisi RAB, Quotation, kontrak, PIC, client, periode, dan pagu Prospek, serta memulai journey eksekusi setelah fase Prospek.

#### Scenario: Convert a winning pitching

- **WHEN** Pitching berstatus menang dan kontraknya lengkap
- **THEN** sistem otomatis membuat satu anak proyek dengan `prospekId`, `pitchingId`, fase Planning/Running/Finance, data warisan Prospek, dan step dari template Pitching

#### Scenario: Show inherited opportunity data in the project header

- **WHEN** pengguna yang berhak membuka header anak proyek
- **THEN** sistem menampilkan PIC, client, periode, pagu/nilai proyek, kontrak beserta Termine, RAB, dan Quotation tanpa meminta data Prospek diisi ulang

#### Scenario: Block conversion without a win or complete contract

- **WHEN** Pitching belum menang atau kontraknya belum lengkap
- **THEN** sistem tidak mengonversi Pitching tersebut dan menampilkan syarat yang belum terpenuhi

#### Scenario: Conversion is idempotent

- **WHEN** Pitching yang sudah dikonversi memenuhi syarat konversi lagi
- **THEN** sistem tidak membuat proyek duplikat dan menampilkan proyek anak yang sudah ada

#### Scenario: Child project appears under its prospek

- **WHEN** anak proyek hasil konversi dibuka dari daftar Prospek
- **THEN** sistem menampilkan proyek tersebut sebagai anak dari Prospek dan Pitching asalnya

#### Scenario: Group is created from the prospek name

- **WHEN** Pitching menang dikonversi dan belum ada Group dengan nama Prospek
- **THEN** sistem membuat Group baru bernama sama dengan Prospek dan memasukkan anak proyek ke Group tersebut

#### Scenario: Existing group is reused

- **WHEN** Pitching menang dikonversi dan sudah ada Group dengan nama Prospek
- **THEN** sistem memakai Group tersebut tanpa membuat Group duplikat dan memasukkan anak proyek ke Group itu

#### Scenario: Multiple winning pitchings share the group

- **WHEN** dua Pitching menang dari Prospek yang sama dikonversi
- **THEN** kedua anak proyek menjadi anggota Group Prospek yang sama

#### Scenario: All eligible winners are converted
- **WHEN** kontrak lengkap disimpan pada salah satu Pitching menang
- **THEN** sistem mengonversi semua Pitching menang pada Prospek tersebut yang kontraknya lengkap

#### Scenario: No manual conversion

- **WHEN** pengguna membuka Pitching menang dengan kontrak lengkap
- **THEN** sistem tidak menampilkan tombol konversi manual karena konversi dijalankan otomatis
