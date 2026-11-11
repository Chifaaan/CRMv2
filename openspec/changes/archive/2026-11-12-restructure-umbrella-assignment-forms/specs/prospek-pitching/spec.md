# Spec Delta

## REMOVED Requirements

### Requirement: Assigned prospek work appears in SIMPRO Forms with a category

**Reason**: Sumber pekerjaan Pitching berubah: Form Pitching menjadi kartu SIMPRO, sehingga daftar Forms tidak lagi memuat entri Form Pitching.

**Migration**: RAB, Quotation, dan Kontrak tetap tampil di Forms dengan kategori Prospek; kartu Form Pitching dibuka dari My Tasks dan board Pitching.

### Requirement: Assigned prospek work appears in My Tasks and Forms

**Reason**: Pekerjaan Form Pitching tidak lagi berupa entri Form, sehingga kontrak yang menyebut tampil di Forms tidak berlaku.

**Migration**: Kartu Form Pitching tampil di My Tasks dengan konteks Pitching; RAB, Quotation, dan Kontrak tetap tampil di My Tasks dan Forms.

### Requirement: Prospek tasks use the Form engine

**Reason**: Pekerjaan Form Pitching dipindahkan ke kartu SIMPRO agar sesuai dengan alur kerja board, assignment, review, dan reminder yang sama dengan pekerjaan operasional lainnya.

**Migration**: Entri `FormEntry` ber-scope Prospek tidak lagi dibaca oleh aplikasi. Data Pitching pada seed diperbarui menjadi kartu Form Pitching, dan keputusan apakah `localStorage` lama dimigrasikan atau di-reset ditunda sampai tahap apply.

## MODIFIED Requirements

### Requirement: Pitching cards and detail page

Sistem SHALL menampilkan Pitching pada detail Prospek sebagai card ringkas dan membuka card tersebut menjadi halaman Pitching dengan section RAB, Quotation, Form Pitching berupa board SIMPRO, Kontrak, dan Finishing.

#### Scenario: Pitching card shows work summary

- **WHEN** pengguna membuka detail Prospek
- **THEN** setiap Pitching tampil sebagai card berisi status, total dan status RAB, status Quotation, jumlah kartu Form Pitching, kelengkapan kontrak, assignee, due date, dan tautan proyek bila sudah dikonversi

#### Scenario: Open pitching page from card

- **WHEN** pengguna menekan card Pitching
- **THEN** sistem membuka halaman Pitching dengan section RAB, Quotation, Form Pitching, Kontrak, dan Finishing

#### Scenario: Form Pitching uses a board

- **WHEN** pengguna membuka section Form Pitching
- **THEN** sistem menampilkan board enam kolom status SIMPRO berisi kartu Form Pitching tersebut

#### Scenario: Finishing contains decision and conversion

- **WHEN** pengguna membuka section Finishing
- **THEN** sistem menampilkan keputusan menang/kalah, undo kalah, kelengkapan kontrak, tombol konversi, dan riwayat Pitching

#### Scenario: Losing pitching card opens read-only page

- **WHEN** pengguna membuka card Pitching yang kalah
- **THEN** halaman Pitching tampil read-only beserta alasan kalah dan tombol undo bagi PM pemilik atau Admin

### Requirement: RAB per pitching

Sistem SHALL menyediakan RAB per Pitching berisi item manpower dan biaya, submitter, tanggal submit, catatan, versi, serta status pengisian; RAB dapat diisi oleh assignee yang ditunjuk dari Finance atau Media.

#### Scenario: Fill and submit a pitching RAB

- **WHEN** pengguna yang berhak mengisi RAB Pitching lalu menekan submit
- **THEN** sistem menyimpan versi RAB beserta submitter dan tanggal submit

#### Scenario: RAB version is preserved

- **WHEN** RAB yang sudah disubmit diubah dan disubmit ulang
- **THEN** sistem menyimpan versi baru tanpa menghapus versi sebelumnya

#### Scenario: Assign RAB to an operational assignee

- **WHEN** Manager atau Admin meng-assign pengisian RAB kepada Finance atau Media
- **THEN** sistem mencatat assignee, mengirim notifikasi in-app, dan menampilkan RAB pada My Tasks assignee tersebut

#### Scenario: Finance fills an assigned RAB

- **WHEN** Finance membuka RAB yang di-assign kepadanya dari My Tasks
- **THEN** Finance dapat mengisi dan mensubmit RAB tanpa membuka halaman Prospek

#### Scenario: Media fills an assigned RAB

- **WHEN** Media membuka RAB yang di-assign kepadanya dari My Tasks
- **THEN** Media dapat mengisi dan mensubmit RAB tanpa membuka halaman Prospek

#### Scenario: PM owner cannot assign RAB

- **WHEN** PM pemilik Pitching mencoba meng-assign RAB
- **THEN** kontrol assignment tidak tersedia atau aksi ditolak

#### Scenario: Reject RAB submission without items

- **WHEN** pengguna mensubmit RAB tanpa satu pun item biaya atau manpower
- **THEN** sistem menolak submit dan menampilkan alasan validasi

### Requirement: Quotation per pitching

Sistem SHALL menyediakan Quotation per Pitching dengan dua mode input, yaitu Submit Link atau Import PDF, assignee dari Finance atau Media, status draft/submitted/approved, dan versi.

#### Scenario: Submit quotation as a link

- **WHEN** pengguna yang berhak memilih mode link dan mengisi URL quotation yang valid
- **THEN** sistem menyimpan Quotation dengan tautan tersebut dan status submitted

#### Scenario: Import quotation as PDF

- **WHEN** pengguna yang berhak memilih mode PDF dan mengunggah berkas PDF
- **THEN** sistem menyimpan berkas Quotation dan menampilkannya pada halaman Pitching

#### Scenario: Quotation is assigned to an assignee

- **WHEN** Manager atau Admin meng-assign pembuatan Quotation kepada Finance atau Media
- **THEN** sistem mencatat assignee, mengirim notifikasi in-app, dan menampilkan Quotation pada My Tasks assignee tersebut

#### Scenario: Quotation approval is recorded

- **WHEN** PM pemilik atau Admin menyetujui Quotation yang sudah disubmit
- **THEN** sistem menandai Quotation sebagai approved dan menyimpan versi yang disetujui

#### Scenario: PM owner cannot assign Quotation

- **WHEN** PM pemilik Pitching mencoba meng-assign Quotation
- **THEN** kontrol assignment tidak tersedia atau aksi ditolak

### Requirement: Contract with termine before conversion

Sistem SHALL mengunci section Kontrak sampai Pitching menang, mengizinkan kontrak di-assign oleh Manager atau Admin kepada Assignee, Manager, Media, atau Finance, dan mewajibkan nomor, tanggal, nilai, berkas, serta satu atau lebih Termine sebelum konversi.

#### Scenario: Contract section is locked before winning

- **WHEN** Pitching masih draft
- **THEN** section Kontrak tampil terkunci dengan penjelasan bahwa kontrak diisi setelah Pitching menang

#### Scenario: Assign contract work

- **WHEN** Manager atau Admin meng-assign pengisian kontrak kepada Assignee, Manager, Media, atau Finance
- **THEN** sistem mencatat assignee, mengirim notifikasi in-app, dan menampilkan pekerjaan kontrak pada My Tasks penerima

#### Scenario: PM owner cannot assign contract

- **WHEN** PM pemilik Pitching mencoba meng-assign kontrak
- **THEN** kontrol assignment tidak tersedia atau aksi ditolak

#### Scenario: Save a complete contract

- **WHEN** PM pemilik atau Admin mengisi nomor, tanggal, nilai, berkas kontrak, dan minimal satu Termine pada Pitching menang
- **THEN** sistem menyimpan kontrak dan menandai Pitching siap dikonversi

#### Scenario: Reject incomplete contract

- **WHEN** kontrak disimpan tanpa nomor, tanggal, nilai, berkas, atau Termine
- **THEN** sistem menolak penyimpanan dan menampilkan field yang belum lengkap

#### Scenario: Contract is locked after conversion

- **WHEN** Pitching sudah dikonversi menjadi anak proyek
- **THEN** sistem menampilkan kontrak sebagai read-only

### Requirement: In-app reminders only

Sistem SHALL mengirim reminder in-app untuk penugasan baru, pekerjaan yang mendekati due date, dan pekerjaan yang overdue pada Prospek, termasuk RAB, Quotation, Kontrak, dan kartu Form Pitching; sistem tidak mengirim email.

#### Scenario: Remind on assignment

- **WHEN** RAB, Quotation, Kontrak, atau kartu Form Pitching di-assign kepada pengguna
- **THEN** sistem membuat notifikasi in-app untuk penerima

#### Scenario: Remind near due date

- **WHEN** pekerjaan Prospek memasuki ambang mendekati due date
- **THEN** sistem membuat notifikasi in-app untuk assignee

#### Scenario: Remind overdue work

- **WHEN** pekerjaan Prospek melewati due date tanpa selesai
- **THEN** sistem membuat notifikasi in-app untuk assignee

#### Scenario: No email is sent

- **WHEN** sistem membuat reminder Prospek
- **THEN** sistem tidak mengirim email atau integrasi pesan eksternal

## ADDED Requirements

### Requirement: My Tasks includes Pitching cards

Kartu Form Pitching yang di-assign SHALL tampil di My Tasks dengan konteks Prospek dan Pitching, dan SHALL dapat dibuka tanpa akses ke halaman Prospek.

#### Scenario: Assigned Pitching card appears

- **WHEN** kartu Form Pitching di-assign kepada Assignee, Manager, Media, atau Finance
- **THEN** kartu tersebut tampil di My Tasks dengan konteks Pitching dan tautan ke board Pitching

#### Scenario: Completed Pitching card leaves active work

- **WHEN** kartu Form Pitching menjadi Completed
- **THEN** kartu tersebut tidak lagi muncul sebagai pekerjaan aktif di My Tasks

#### Scenario: Archived Pitching card is not actionable

- **WHEN** Pitching berstatus kalah atau Prospek dibatalkan
- **THEN** kartu Form Pitching tampil sebagai riwayat read-only

### Requirement: Only Managers and Admins assign Prospek work

Manager dan Admin SHALL menjadi satu-satunya role yang dapat meng-assign pekerjaan Prospek, termasuk RAB, Quotation, Kartu Form Pitching, dan Kontrak. PM pemilik tetap membuat Pitching, mereview, dan memutuskan.

#### Scenario: Manager assigns work

- **WHEN** Manager meng-assign RAB, Quotation, kartu Form Pitching, atau Kontrak
- **THEN** penugasan tersimpan tanpa memerlukan persetujuan PM

#### Scenario: Admin assigns work

- **WHEN** Admin meng-assign pekerjaan Prospek
- **THEN** penugasan tersimpan dan dapat dilakukan pada Prospek mana pun

#### Scenario: PM owner loses assignment rights

- **WHEN** PM pemilik Prospek membuka panel pekerjaan Prospek
- **THEN** kontrol assign tidak tampil meskipun ia boleh membuat, mereview, dan memutuskan

#### Scenario: Other roles cannot assign

- **WHEN** Assignee, Media, atau Finance mencoba meng-assign pekerjaan Prospek
- **THEN** aksi ditolak

### Requirement: Pitching form work uses a SIMPRO board

Pekerjaan Form Pitching SHALL disimpan sebagai kartu task ber-scope Pitching dan dikerjakan pada board SIMPRO khusus Pitching, bukan sebagai entri Form.

#### Scenario: Create cards from the template

- **WHEN** Manager atau Admin memilih "Buat dari template" pada board Form Pitching
- **THEN** sistem membuat satu kartu untuk setiap form stage fase Prospek pada template Pitching yang belum memiliki kartu

#### Scenario: Create a custom card

- **WHEN** Manager atau Admin membuat kartu Form Pitching secara manual
- **THEN** kartu dibuat di Backlog tanpa assignee dan tanpa terikat form stage template

#### Scenario: Filter cards by stage

- **WHEN** pengguna memilih salah satu form stage pada filter board
- **THEN** board hanya menampilkan kartu dari form stage tersebut

#### Scenario: Only one card per template stage

- **WHEN** "Buat dari template" dijalankan ulang untuk Pitching yang sama
- **THEN** sistem tidak membuat kartu duplikat untuk form stage yang sudah memiliki kartu

#### Scenario: Work a pitching card

- **WHEN** assignee kartu memindahkan kartu dari To Do ke In Progress lalu ke Awaiting Approval
- **THEN** kartu mengikuti aturan transisi SIMPRO termasuk kewajiban Link Pekerjaan sebelum In Progress

#### Scenario: Review a pitching card

- **WHEN** PM pemilik Prospek atau Admin menyetujui atau meminta revisi kartu Awaiting Approval
- **THEN** kartu menjadi Completed atau Need Revision dan komentar revisi tersimpan

#### Scenario: Pitching board is read-only when archived

- **WHEN** Pitching berstatus kalah atau Prospek tidak aktif
- **THEN** board Form Pitching tampil read-only tanpa aksi transisi

### Requirement: Pitching decision requires Form Pitching completion

Keputusan menang SHALL hanya dapat dicatat ketika Form Pitching memiliki minimal satu kartu non-arsip dan seluruh kartu tersebut Completed, selain syarat RAB dan Quotation yang sudah berlaku.

#### Scenario: Block decision with unfinished cards

- **WHEN** PM pemilik atau Admin mencatat keputusan menang saat masih ada kartu Form Pitching yang belum Completed
- **THEN** sistem menolak keputusan dan menampilkan kartu yang belum selesai

#### Scenario: Block decision without cards

- **WHEN** PM pemilik atau Admin mencatat keputusan menang tanpa satu pun kartu Form Pitching
- **THEN** sistem menolak keputusan dan meminta minimal satu kartu

#### Scenario: Allow decision after all cards complete

- **WHEN** RAB dan Quotation memenuhi syarat serta semua kartu Form Pitching Completed
- **THEN** keputusan menang dapat dicatat
