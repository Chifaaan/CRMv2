# project-lifecycle Specification

## Purpose

Defines the post-Prospek lifecycle for new projects, from initial phase selection through Planning, Running, and Finance, while preserving older project journeys as readable and operable legacy records.

## Requirements

### Requirement: Overview summarizes project origin and history

Tab Overview SHALL menampilkan Asal Prospek, Riwayat Aktivitas, Penyelesaian Tahap, Distribusi task dan Progress overview proyek, serta keputusan Gerbang yang menunggu atau sudah tercatat.

#### Scenario: Show prospek origin

- **WHEN** proyek berasal dari Prospek
- **THEN** Overview menampilkan Prospek, Pitching, PIC, client, periode, pagu, RAB, Quotation, dan kontrak/Termine yang diwarisi

#### Scenario: Show activity history

- **WHEN** pengguna membuka Overview
- **THEN** sistem menampilkan riwayat aktivitas proyek terurut waktu beserta aktor dan ringkasan

#### Scenario: Show step completion

- **WHEN** pengguna membuka Overview
- **THEN** sistem menampilkan ringkasan step yang selesai, dilewati, dan belum selesai

#### Scenario: Task distribution appears above activity history

- **WHEN** pengguna membuka Overview pada proyek yang memiliki task SIMPRO
- **THEN** Distribusi task dan Progress overview tampil di atas Riwayat Aktivitas

#### Scenario: Show gate decision

- **WHEN** proyek memiliki step Gerbang yang aktif atau sudah diputuskan
- **THEN** Overview menampilkan status keputusan Gerbang beserta aksi keputusan bagi PM pemilik atau Admin

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

### Requirement: Running phase stays empty when starting in Planning

Memilih Planning sebagai fase awal SHALL NOT membuat step Running; step Running hanya ada jika PM/Admin menambahkannya.

#### Scenario: Start in Planning
- **WHEN** PM/Admin memulai proyek dari Planning
- **THEN** fase Running tidak memiliki step sampai ditambahkan secara manual

#### Scenario: Start directly in Running
- **WHEN** PM/Admin memulai proyek langsung dari Running
- **THEN** fase Planning ditandai Dilewati dan proyek masuk Running

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

### Requirement: Start a new project with an authorized initial phase
On a new project's first opening, the system SHALL offer its owning PM or Admin a start prompt, retain an alternative start action on the project page, and explain to other roles that the project is waiting for its PM.

#### Scenario: Owner starts from the prompt
- **WHEN** the owning PM or Admin opens a new project
- **THEN** the prompt offers “Mulai dari Planning” and “Langsung ke Running”

#### Scenario: Non-owner opens an unstarted project
- **WHEN** a Manager, Assignee, or Finance user opens an unstarted project
- **THEN** the user sees “Menunggu PM memulai proyek” and cannot start it

#### Scenario: Prompt is dismissed
- **WHEN** the owning PM or Admin closes the initial prompt without starting
- **THEN** a start-project action remains available on the project page

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

### Requirement: A new-project marker ends when work starts
The system SHALL distinguish a project with no active first step as NEW Project and SHALL remove that marker after its first step is activated.

#### Scenario: Show an unstarted project
- **WHEN** a project has not activated its first step
- **THEN** its card shows “NEW Project” with a distinguishing outline

#### Scenario: Remove the new-project marker
- **WHEN** the first manual or template step is activated
- **THEN** the NEW Project label and outline are removed

### Requirement: Step management follows lifecycle state

Only the owning PM or Admin SHALL manage project steps; pending steps may be added, edited, reordered, or removed while the project is active, while active, completed, and skipped steps SHALL be read-only.

#### Scenario: Add a manual step

- **WHEN** the owning PM or Admin creates a step after project start
- **THEN** its phase is set to Planning, Running, or the active Finance phase, and its type is SIMPRO in Planning/Running or Form Keuangan in Finance

#### Scenario: Manage Planning and Running steps at any time

- **WHEN** the owning PM or Admin manages a pending step while the project is active
- **THEN** the step can be added, edited, removed, or reordered regardless of which phase is currently active

#### Scenario: Change an unstarted step

- **WHEN** the owning PM or Admin edits, reorders, or removes a pending step
- **THEN** the change is applied subject to the fixed Planning → Running → Finance order and is recorded in project history

#### Scenario: Edit a started or completed step

- **WHEN** the owning PM or Admin views an active, completed, or skipped step
- **THEN** no edit, reorder, or delete action is available for that step

#### Scenario: Reject unauthorized step changes

- **WHEN** a Manager, Assignee, Media, Finance user, or non-owning PM attempts to manage a step
- **THEN** the system rejects the change

#### Scenario: View a skipped step

- **WHEN** a user selects a Dilewati step in the stepper
- **THEN** its skipped state remains visible and its project history can be opened

### Requirement: Complete a step only after its work is complete
A Planning or Running step SHALL be completed only when it has at least one non-cancelled Kanban card and every remaining card is Completed.

#### Scenario: Complete a non-empty step
- **WHEN** the owning PM or Admin completes a step with one or more remaining cards and every card is Completed
- **THEN** the step becomes completed and the completion is audited

#### Scenario: Reject an empty step
- **WHEN** the owning PM or Admin tries to complete a SIMPRO step with no remaining cards
- **THEN** the system rejects completion

#### Scenario: Reject a step with unfinished work
- **WHEN** any non-cancelled card is not Completed
- **THEN** the system rejects step completion and identifies outstanding work

### Requirement: Phase completion is ordered and irreversible
The owning PM or Admin SHALL be able to mark a phase complete only when it has at least one step and all of its steps are Completed or Dilewati; a completed phase cannot be reopened. Finance cannot be skipped.

#### Scenario: Block phase completion with an unfinished step
- **WHEN** a phase contains a step that is neither Completed nor Dilewati
- **THEN** the system rejects the phase-completion action

#### Scenario: Block an empty Finance phase
- **WHEN** the owning PM or Admin tries to complete Finance without any Finance step
- **THEN** the system rejects the action and requires at least one Finance step

#### Scenario: Advance from Planning to Running
- **WHEN** Planning is marked complete after all its steps are Completed or Dilewati
- **THEN** the phase transition is audited and the project advances to Running

#### Scenario: Advance from Running to Finance
- **WHEN** Running is marked complete after all its steps are Completed or Dilewati
- **THEN** the phase transition is audited and the Finance phase becomes available

#### Scenario: Complete Finance and the project
- **WHEN** Finance is marked complete after all Finance steps are completed
- **THEN** the project becomes completed and read-only

#### Scenario: Reject a repeated or reverse transition
- **WHEN** a user tries to undo a completed phase or mark an earlier phase complete again
- **THEN** the system rejects the action without changing history

### Requirement: Finance steps use financial forms rather than Kanban
Finance steps SHALL use Form Keuangan in CRM; a Finance step cannot create or display SIMPRO cards.

#### Scenario: Create a Finance step
- **WHEN** the owning PM or Admin creates a step while Finance is active
- **THEN** the step form requires selection of a supported Finance form type, and does not offer SIMPRO Kanban

#### Scenario: Record BAST PIC
- **WHEN** the BAST Finance step is completed
- **THEN** it records the designated PIC without requiring a SIMPRO card

#### Scenario: Fill Invoice or Payment
- **WHEN** Finance fills an Invoice or Pembayaran step
- **THEN** the form is handled in CRM under the existing Finance permissions and validation

#### Scenario: Show contract Termine
- **WHEN** a converted project opens its Finance phase
- **THEN** the inherited contract Termine are shown as payment references without being recreated as Finance forms

### Requirement: Project progress reflects its creation mode

Project detail and cards SHALL show progress in a way that does not imply a meaningful percentage for manually assembled steps.

#### Scenario: Show manual-project progress
- **WHEN** a manual project has steps
- **THEN** progress is shown as the number of completed steps (“Step ke-N selesai”) and not as a percentage

#### Scenario: Show template-project progress
- **WHEN** a legacy template project has steps
- **THEN** progress may be shown as a percentage calculated from its steps, with Dilewati steps still visible in the stepper

### Requirement: Legacy project data remains usable after phase migration
The system SHALL migrate persisted Closing phase data to Finance without requiring user action, while preserving legacy Prospek steps, statuses, groups, and audit history.

#### Scenario: Migrate an existing Closing step
- **WHEN** a persisted project contains a Closing phase step
- **THEN** its phase is migrated to Finance and the step remains usable with its existing status and history

#### Scenario: Preserve a legacy Prospek journey
- **WHEN** an existing project contains Prospek-phase steps or belongs to an existing ProjectGroup
- **THEN** the steps and group membership remain intact and the project remains operable without manual migration

#### Scenario: Repeat persistence migration
- **WHEN** the same persisted state is migrated more than once
- **THEN** migration is idempotent and does not duplicate steps, events, or groups

### Requirement: All lifecycle phases are always visible

Detail proyek siklus baru SHALL selalu menampilkan tab fase Planning, Running, dan Finance, termasuk fase yang belum memiliki step. Fase tanpa step SHALL menampilkan keterangan `0 Step`.

#### Scenario: Show empty phases on a new project
- **WHEN** PM membuka detail proyek siklus baru yang belum memiliki step
- **THEN** tab Planning, Running, dan Finance tetap tampil dan setiap fase kosong menampilkan `0 Step`

#### Scenario: Open an empty phase
- **WHEN** pengguna memilih fase yang belum memiliki step
- **THEN** panel menampilkan bahwa fase tersebut belum memiliki step dan tidak menampilkan task dari fase lain

#### Scenario: Keep legacy phases data-driven
- **WHEN** pengguna membuka proyek legacy
- **THEN** tab fase yang tampil mengikuti fase yang benar-benar ada pada proyek legacy tersebut

### Requirement: Finance phase auto-creates BAST and Invoice steps

Saat proyek siklus baru masuk fase Finance, sistem SHALL otomatis membuat step BAST dan Invoice jika belum ada. PM/Admin SHALL tetap dapat menambahkan step Finance lain, dan step yang sudah ada MUST NOT diduplikasi.

#### Scenario: Enter Finance from Running
- **WHEN** fase Running diselesaikan pada proyek siklus baru
- **THEN** sistem membuat step BAST dan Invoice pada fase Finance

#### Scenario: Keep existing Finance steps
- **WHEN** proyek sudah memiliki step BAST atau Invoice pada fase Finance
- **THEN** sistem tidak membuat duplikat untuk step yang sudah ada

#### Scenario: Add another Finance step
- **WHEN** PM/Admin menambahkan step Finance baru setelah BAST dan Invoice otomatis dibuat
- **THEN** step tambahan tersebut tersimpan pada fase Finance

#### Scenario: Backfill an existing Finance project
- **WHEN** proyek aktif sudah berada di fase Finance tetapi belum memiliki step BAST atau Invoice
- **THEN** sistem melengkapi step yang belum ada tanpa mengubah step lain

### Requirement: Project workspace has five tabs

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

#### Scenario: Board tab remains available

- **WHEN** pengguna membuka detail proyek melalui tautan yang meminta tab Board
- **THEN** sistem menampilkan tab Board dengan step SIMPRO yang aktif atau selesai

### Requirement: Workspace header actions and step summaries

Setiap tab workspace SHALL menampilkan tombol Selesaikan Tahap di bawah header. Overview SHALL menampilkan Distribusi task dan Progress overview proyek, sedangkan Journey Management SHALL menampilkan ringkasan read-only setiap step beserta tautan ke Board atau Forms.

#### Scenario: Complete stage from any tab

- **WHEN** PM/Admin membuka Overview atau Journey Management dan ada step aktif
- **THEN** tombol Selesaikan Tahap tersedia di bawah header

#### Scenario: Open step work from its summary

- **WHEN** PM/Admin membuka step SIMPRO pada Journey Management
- **THEN** ringkasan step tampil beserta tautan ke tab Board untuk step tersebut

#### Scenario: Open form work from its summary

- **WHEN** PM/Admin membuka step Form atau Form Keuangan pada Journey Management
- **THEN** ringkasan step tampil beserta tautan ke tab Forms

#### Scenario: Edit a pending step

- **WHEN** PM/Admin memilih opsi Edit pada step pending
- **THEN** nama, deskripsi, Manager PIC, dan fase step dapat diperbarui

#### Scenario: Show project task distribution

- **WHEN** pengguna membuka Overview
- **THEN** sistem menampilkan jumlah task per status SIMPRO, hitungan Completed, Open, Overdue, dan persentase task selesai hanya untuk proyek tersebut

### Requirement: Journey Management is structural only

Journey Management SHALL hanya menampilkan pengelolaan step dan fase, ringkasan status setiap step, serta tautan ke pekerjaan terkait; tab ini SHALL NOT menampilkan panel isian Form, panel Kartu SIMPRO, atau aksi review.

#### Scenario: Open a form step in Journey

- **WHEN** pengguna membuka step Form pada Journey Management
- **THEN** sistem menampilkan status entry, progress, dan tautan ke tab Forms tanpa kontrol create, assign, fill, atau review

#### Scenario: Open a SIMPRO step in Journey

- **WHEN** pengguna membuka step SIMPRO pada Journey Management
- **THEN** sistem menampilkan ringkasan kartu dan tautan ke Board tanpa daftar kartu yang dapat dikerjakan

#### Scenario: Open a gate step in Journey

- **WHEN** pengguna membuka step Gerbang pada Journey Management
- **THEN** sistem menampilkan status gerbang dan tautan ke keputusan Gerbang pada Overview

#### Scenario: Form controls are not duplicated

- **WHEN** pengguna membuka Journey Management
- **THEN** tidak ada tombol buat entry, assign, atau buka form yang berasal dari panel Form lama

### Requirement: Project Forms tab owns all project form work

Tab Forms pada Detail Proyek SHALL menampung seluruh pekerjaan Form proyek, yaitu entri Form stage dan Form Keuangan, beserta aksi buat, assign, buka isian, dan review sesuai hak pengguna. Tab Forms SHALL menampilkan banner jumlah form yang perlu di-assign, perlu diisi, menunggu review, dan perlu revisi.

#### Scenario: Show every project form

- **WHEN** pengguna membuka tab Forms pada Detail Proyek
- **THEN** sistem menampilkan Form Keuangan dan entri Form stage yang relevan beserta status, assignee, dan due date

#### Scenario: Manager assigns from the Forms tab

- **WHEN** Manager meng-assign entri Form yang belum memiliki assignee dari tab Forms
- **THEN** entri menjadi assigned dan audit proyek mencatat assignment

#### Scenario: PM reviews from the Forms tab

- **WHEN** PM pemilik atau Admin membuka entri Form yang sudah disubmit dari tab Forms
- **THEN** aksi review tersedia dan keputusan tercatat pada entri tersebut

#### Scenario: Banner counts outstanding work

- **WHEN** tab Forms dibuka dan ada form yang belum di-assign, perlu diisi, menunggu review, atau perlu revisi
- **THEN** banner menampilkan jumlah untuk setiap kategori

#### Scenario: Scheduled forms do not enter the banner

- **WHEN** entri Form berada pada step pending
- **THEN** entri tersebut tampil sebagai terjadwal dan tidak dihitung pada banner sampai step aktif

### Requirement: Gate decision is recorded from Overview

Keputusan step Gerbang SHALL dicatat dari tab Overview oleh PM pemilik atau Admin, dengan syarat dan akibat yang sama seperti sebelumnya: gerbang kemenangan mengunci RAB sebagai baseline dan memindahkan proyek ke Planning, sedangkan penolakan wajib beralasan.

#### Scenario: Approve a winning gate from Overview

- **WHEN** PM pemilik atau Admin menyetujui gerbang kemenangan dari Overview
- **THEN** lifecycle proyek menjadi menang, RAB dikunci sebagai baseline, dan proyek pindah ke Planning

#### Scenario: Reject a gate with a reason

- **WHEN** PM pemilik atau Admin menolak gerbang dari Overview dengan alasan
- **THEN** lifecycle proyek menjadi kalah, alasan tersimpan, dan keputusan tercatat di riwayat

#### Scenario: Gate requirements are shown

- **WHEN** pengguna membuka keputusan Gerbang pada Overview
- **THEN** sistem menampilkan syarat yang belum terpenuhi sebelum keputusan dapat dicatat

#### Scenario: Unauthorized role cannot decide

- **WHEN** Manager, Assignee, Media, atau Finance mencoba mencatat keputusan Gerbang
- **THEN** sistem menolak aksi tersebut

### Requirement: Managers and Admins can pre-assign work on pending steps

Manager dan Admin SHALL dapat meng-assign kartu task dan entri Form yang berada pada step pending. Item tersebut SHALL berlabel terjadwal, SHALL NOT dapat dikerjakan atau dipindahkan ke status kerja sampai step aktif, dan SHALL NOT dihitung pada badge Forms maupun Workload sampai step aktif.

#### Scenario: Pre-assign a card on a pending step

- **WHEN** Manager meng-assign kartu pada step SIMPRO pending kepada assignee operasional
- **THEN** kartu tetap ditandai terjadwal dengan assignee tercatat dan belum muncul di Board step pending

#### Scenario: Pre-assign a form entry on a pending step

- **WHEN** Manager meng-assign entri Form pada step Form pending
- **THEN** entri menjadi assigned dan ditandai menunggu step aktif tanpa dapat diisi

#### Scenario: Work starts when the step activates

- **WHEN** step pending yang memiliki item terjadwal menjadi aktif
- **THEN** item tersebut kehilangan label terjadwal dan dapat dikerjakan sesuai aturan jenis step

#### Scenario: Scheduled work is excluded from load

- **WHEN** item terjadwal ada pada step pending
- **THEN** item tersebut tidak dihitung pada badge Forms, Workload, atau antrean pekerjaan aktif

#### Scenario: Pending step remains inaccessible for work

- **WHEN** pengguna mencoba membuka step pending melalui Board atau tautan langsung
- **THEN** sistem tetap tidak menampilkan step tersebut sebagai step yang dapat dikerjakan
