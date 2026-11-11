# prospek-pitching Specification

## Purpose

Mengatur Pitching di dalam Prospek, termasuk RAB dan Quotation per Pitching, tugas berbasis Form, keputusan menang/kalah, kontrak dengan Termine, reminder in-app, dan riwayat read-only untuk Pitching yang kalah.

## Requirements

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

### Requirement: Pitching belongs to a prospek

Sistem SHALL menyimpan Pitching sebagai bagian dari satu Prospek dengan judul, deskripsi, template proyek pilihan, status draft/menang/kalah, pembuat, dan waktu keputusan.

#### Scenario: Add a pitching with a project template
- **WHEN** PM pemilik, Manager, atau Admin menambahkan Pitching pada Prospek aktif dan memilih template proyek
- **THEN** sistem menyimpan Pitching berstatus draft beserta template yang akan dipakai anak proyeknya

#### Scenario: Reject pitching without a template
- **WHEN** pengguna menambahkan Pitching tanpa memilih template proyek
- **THEN** sistem menolak penyimpanan dan menampilkan alasan

#### Scenario: Multiple pitchings share one prospek
- **WHEN** Prospek memiliki lebih dari satu Pitching
- **THEN** sistem menampilkan seluruh Pitching sebagai daftar terpisah dengan status masing-masing

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

### Requirement: Pitching decision

Sistem SHALL mengizinkan PM pemilik atau Admin mencatat keputusan menang setelah RAB disubmit dan Quotation disubmit atau disetujui, serta mencatat keputusan kalah kapan saja untuk Pitching yang belum dikonversi; keputusan kalah wajib menyertakan alasan dan langsung mengarsipkan Pitching.

#### Scenario: Record a winning pitching
- **WHEN** PM pemilik atau Admin menandai Pitching menang setelah RAB dan Quotation memenuhi syarat
- **THEN** sistem menyimpan status menang beserta aktor dan waktu keputusan

#### Scenario: Record a losing pitching with a reason
- **WHEN** PM pemilik atau Admin menandai Pitching draft kalah meskipun RAB atau Quotation belum siap
- **THEN** sistem menyimpan status kalah beserta alasan, waktu keputusan, dan langsung memindahkan Pitching ke arsip

#### Scenario: Record a losing pitching after winning
- **WHEN** PM pemilik atau Admin menandai Pitching menang yang belum dikonversi sebagai kalah
- **THEN** sistem menyimpan status kalah, mengarsipkan Pitching, dan menyimpan status menang sebelumnya untuk undo

#### Scenario: Reject decision before RAB or quotation is ready
- **WHEN** pengguna mencatat keputusan menang saat RAB belum disubmit atau Quotation belum disubmit/disetujui
- **THEN** sistem menolak keputusan dan menampilkan syarat yang belum terpenuhi

#### Scenario: Converted pitching cannot be marked lost
- **WHEN** pengguna mencoba menandai kalah Pitching yang sudah dikonversi menjadi anak proyek
- **THEN** sistem menolak aksi tersebut

#### Scenario: Only the owning PM or Admin decides
- **WHEN** PM lain, Manager, Assignee, atau Finance mencoba mencatat keputusan Pitching
- **THEN** sistem menolak aksi tersebut

### Requirement: Losing pitching becomes read-only history

Sistem SHALL memindahkan Pitching kalah beserta RAB, Quotation, Form, dan kontraknya ke arsip read-only yang tetap dapat dilihat sebagai dokumentasi, serta menyediakan undo kalah yang mengembalikan status dan data sebelumnya.

#### Scenario: Losing pitching is frozen
- **WHEN** Pitching ditandai kalah
- **THEN** sistem mengunci perubahan pada Pitching tersebut dan langsung menampilkannya di arsip Prospek

#### Scenario: Read losing pitching documentation
- **WHEN** pengguna yang berhak membuka arsip Pitching kalah
- **THEN** sistem menampilkan RAB, Quotation, Form, alasan kalah, dan waktu keputusan tanpa tombol edit

#### Scenario: Undo restores a draft pitching
- **WHEN** PM pemilik atau Admin membatalkan keputusan kalah pada Pitching yang sebelumnya draft
- **THEN** sistem mengembalikan status draft, membuka kembali pengeditan, dan menghapus Pitching dari arsip

#### Scenario: Undo restores a winning pitching
- **WHEN** PM pemilik atau Admin membatalkan keputusan kalah pada Pitching yang sebelumnya menang
- **THEN** sistem mengembalikan status menang beserta kontrak yang sudah ada dan menghapus Pitching dari arsip

#### Scenario: Undo is unavailable after conversion
- **WHEN** Pitching sudah dikonversi menjadi anak proyek
- **THEN** sistem tidak menyediakan undo kalah untuk Pitching tersebut

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

### Requirement: Termine is a closing payment reference

Sistem SHALL menampilkan Termine kontrak sebagai acuan awal Invoice dan Pembayaran pada fase Finance anak proyek, tanpa membuat form Invoice atau Pembayaran secara otomatis.

#### Scenario: Show termine on the child project
- **WHEN** pengguna membuka fase Finance anak proyek hasil konversi
- **THEN** sistem menampilkan daftar Termine beserta nilai dan tanggal jatuh temponya sebagai referensi pembayaran

#### Scenario: Use Termine as payment references
- **WHEN** Finance mengisi Invoice atau Pembayaran pada anak proyek
- **THEN** nilai dan tanggal Termine tersedia sebagai acuan awal tanpa menggantikan isian atau keputusan Finance

#### Scenario: Termine does not create finance forms
- **WHEN** kontrak dengan Termine disimpan atau dikonversi
- **THEN** sistem tidak membuat entri Form Invoice maupun Pembayaran secara otomatis

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
