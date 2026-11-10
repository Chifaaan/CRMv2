# prospek-pitching Specification

## Purpose

Mengatur Pitching di dalam Prospek, termasuk RAB dan Quotation per Pitching, tugas berbasis Form, keputusan menang/kalah, kontrak dengan Termine, reminder in-app, dan riwayat read-only untuk Pitching yang kalah.

## Requirements

### Requirement: Pitching cards and detail page

Sistem SHALL menampilkan Pitching pada detail Prospek sebagai card ringkas dan membuka card tersebut menjadi halaman Pitching dengan section RAB, Quotation, Form Pitching, Kontrak, dan Finishing.

#### Scenario: Pitching card shows work summary
- **WHEN** pengguna membuka detail Prospek
- **THEN** setiap Pitching tampil sebagai card berisi status, total dan status RAB, status Quotation, kelengkapan kontrak, assignee, due date, dan tautan proyek bila sudah dikonversi

#### Scenario: Open pitching page from card
- **WHEN** pengguna menekan card Pitching
- **THEN** sistem membuka halaman Pitching dengan section RAB, Quotation, Form Pitching, Kontrak, dan Finishing

#### Scenario: Finishing contains decision and conversion
- **WHEN** pengguna membuka section Finishing
- **THEN** sistem menampilkan keputusan menang/kalah, undo kalah, kelengkapan kontrak, tombol konversi, dan riwayat Pitching

#### Scenario: Losing pitching card opens read-only page
- **WHEN** pengguna membuka card Pitching yang kalah
- **THEN** halaman Pitching tampil read-only beserta alasan kalah dan tombol undo bagi PM pemilik atau Admin

### Requirement: Assigned prospek work appears in My Tasks and Forms

Sistem SHALL menampilkan pekerjaan Prospek yang di-assign kepada pengguna pada My Tasks, menampilkan entri Form Pitching yang di-assign pada Forms, dan mengirim notifikasi in-app, tanpa memerlukan akses ke halaman Prospek.

#### Scenario: Assigned RAB, quotation, or contract appears in My Tasks
- **WHEN** RAB, Quotation, atau Kontrak Pitching di-assign kepada pengguna
- **THEN** pekerjaan tersebut muncul di My Tasks pengguna dengan tautan untuk membuka pekerjaan

#### Scenario: Assigned pitching form appears in My Tasks and Forms
- **WHEN** entri Form Pitching di-assign kepada pengguna
- **THEN** entri tersebut muncul di My Tasks dan Forms pengguna

#### Scenario: Assignment sends an in-app notification
- **WHEN** pekerjaan Prospek di-assign kepada Assignee, Manager, atau Finance
- **THEN** sistem membuat notifikasi in-app untuk penerima

#### Scenario: Completed work leaves the task list
- **WHEN** pekerjaan Prospek yang di-assign sudah disubmit atau diselesaikan
- **THEN** pekerjaan tersebut tidak lagi muncul sebagai pekerjaan aktif di My Tasks

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

Sistem SHALL menyediakan RAB per Pitching berisi item manpower dan biaya, submitter, tanggal submit, catatan, versi, serta status pengisian; RAB dapat diisi PM/Manager atau assignee yang ditunjuk dari Assignee, Manager, atau Finance.

#### Scenario: Fill and submit a pitching RAB
- **WHEN** pengguna yang berhak mengisi RAB Pitching lalu menekan submit
- **THEN** sistem menyimpan versi RAB beserta submitter dan tanggal submit

#### Scenario: RAB version is preserved
- **WHEN** RAB yang sudah disubmit diubah dan disubmit ulang
- **THEN** sistem menyimpan versi baru tanpa menghapus versi sebelumnya

#### Scenario: Assign RAB to an operational assignee
- **WHEN** PM pemilik atau Manager/Admin meng-assign pengisian RAB kepada Assignee, Manager, atau Finance
- **THEN** sistem mencatat assignee, mengirim notifikasi in-app, dan menampilkan RAB pada My Tasks assignee tersebut

#### Scenario: Finance fills an assigned RAB
- **WHEN** Finance membuka RAB yang di-assign kepadanya dari My Tasks
- **THEN** Finance dapat mengisi dan mensubmit RAB tanpa membuka halaman Prospek

#### Scenario: Reject RAB submission without items
- **WHEN** pengguna mensubmit RAB tanpa satu pun item biaya atau manpower
- **THEN** sistem menolak submit dan menampilkan alasan validasi

### Requirement: Quotation per pitching

Sistem SHALL menyediakan Quotation per Pitching dengan dua mode input, yaitu Submit Link atau Import PDF, serta assignee dari Assignee, Manager, atau Finance, status draft/submitted/approved, dan versi.

#### Scenario: Submit quotation as a link
- **WHEN** pengguna yang berhak memilih mode link dan mengisi URL quotation yang valid
- **THEN** sistem menyimpan Quotation dengan tautan tersebut dan status submitted

#### Scenario: Import quotation as PDF
- **WHEN** pengguna yang berhak memilih mode PDF dan mengunggah berkas PDF
- **THEN** sistem menyimpan berkas Quotation dan menampilkannya pada halaman Pitching

#### Scenario: Quotation is assigned to an assignee
- **WHEN** PM pemilik atau Manager/Admin meng-assign pembuatan Quotation kepada Assignee, Manager, atau Finance
- **THEN** sistem mencatat assignee, mengirim notifikasi in-app, dan menampilkan Quotation pada My Tasks assignee tersebut

#### Scenario: Quotation approval is recorded
- **WHEN** PM pemilik atau Admin menyetujui Quotation yang sudah disubmit
- **THEN** sistem menandai Quotation sebagai approved dan menyimpan versi yang disetujui

### Requirement: Prospek tasks use the Form engine

Sistem SHALL mengerjakan tugas Prospek seperti Presentasi dan Concept Deck sebagai entri Form yang memakai template Form, assignment, versi, submit, dan review yang sama dengan Form proyek; entri Form Pitching dapat di-assign kepada Assignee, Manager, atau Finance.

#### Scenario: Create a form entry from a pitching template
- **WHEN** PM pemilik membuat entri Form pada Pitching dari template Form yang tersedia
- **THEN** sistem membuat entri Form dengan field sesuai template dan status belum di-assign

#### Scenario: Assign a prospek form entry
- **WHEN** PM pemilik atau Manager/Admin meng-assign entri Form Prospek kepada Assignee, Manager, atau Finance
- **THEN** sistem mengubah status menjadi assigned, mengirim notifikasi in-app, dan menampilkan entri pada My Tasks dan Forms penerima

#### Scenario: Finance submits a prospek form entry
- **WHEN** Finance mengisi lalu mensubmit entri Form Pitching miliknya
- **THEN** sistem menyimpan versi dan menampilkan entri itu pada antrean review PM

#### Scenario: Assignee submits a prospek form entry
- **WHEN** Assignee mengisi lalu mensubmit entri Form Prospek miliknya
- **THEN** sistem menyimpan versi, mengubah status menjadi submitted, dan menampilkan entri itu pada antrean review PM

#### Scenario: PM reviews a prospek form entry
- **WHEN** PM pemilik atau Admin menyetujui atau meminta revisi entri Form Prospek
- **THEN** sistem mencatat keputusan review, komentar, dan status terbaru entri

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

Sistem SHALL mengunci section Kontrak sampai Pitching menang, mengizinkan kontrak di-assign kepada Assignee, Manager, atau Finance, dan mewajibkan nomor, tanggal, nilai, berkas, serta satu atau lebih Termine sebelum konversi.

#### Scenario: Contract section is locked before winning
- **WHEN** Pitching masih draft
- **THEN** section Kontrak tampil terkunci dengan penjelasan bahwa kontrak diisi setelah Pitching menang

#### Scenario: Assign contract work
- **WHEN** PM pemilik atau Manager/Admin meng-assign pengisian kontrak kepada Assignee, Manager, atau Finance
- **THEN** sistem mencatat assignee, mengirim notifikasi in-app, dan menampilkan pekerjaan kontrak pada My Tasks penerima

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

Sistem SHALL menampilkan Termine kontrak sebagai acuan pembayaran pada fase Closing anak proyek, tanpa membuat form Invoice atau Pembayaran secara otomatis.

#### Scenario: Show termine on the child project
- **WHEN** pengguna membuka fase Closing anak proyek hasil konversi
- **THEN** sistem menampilkan daftar Termine beserta nilai dan tanggal jatuh temponya sebagai referensi

#### Scenario: Termine does not create finance forms
- **WHEN** kontrak dengan Termine disimpan atau dikonversi
- **THEN** sistem tidak membuat entri Form Invoice maupun Pembayaran secara otomatis

### Requirement: In-app reminders only

Sistem SHALL mengirim reminder in-app untuk penugasan baru, pekerjaan yang mendekati due date, dan pekerjaan yang overdue pada Prospek; sistem tidak mengirim email.

#### Scenario: Remind on assignment
- **WHEN** task, RAB, Quotation, atau Form Prospek di-assign kepada pengguna
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
