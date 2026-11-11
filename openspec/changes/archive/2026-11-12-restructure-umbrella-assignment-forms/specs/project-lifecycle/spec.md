# Spec Delta

## REMOVED Requirements

### Requirement: Project workspace tabs

**Reason**: Detail proyek kini memiliki lima tab, sehingga kontrak dua tab dan larangan tab Board tidak lagi berlaku.

**Migration**: Board, Backlog, dan Forms tersedia sebagai tab; pengguna lama yang membuka tautan Board diarahkan ke tab Board yang sekarang aktif.

### Requirement: Workspace header actions and overview task distribution

**Reason**: Journey Management berhenti menjadi tempat eksekusi step, sehingga pemilih step dan panel kerja di bawahnya tidak lagi menjadi kontrak tab tersebut.

**Migration**: Ringkasan read-only setiap step dan tautan ke Board/Forms menggantikan pemilih step; Distribusi task tetap berada di Overview.

## MODIFIED Requirements

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

## ADDED Requirements

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
