# prospek-pitching Specification

## Purpose

Mengatur Pitching di dalam Prospek, termasuk RAB dan Quotation per Pitching, tugas berbasis Form, keputusan menang/kalah, kontrak dengan Termine, reminder in-app, dan riwayat read-only untuk Pitching yang kalah.

## Requirements

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

Sistem SHALL menyediakan RAB per Pitching berisi item manpower dan biaya, submitter, tanggal submit, catatan, versi, serta status pengisian; RAB dapat diisi PM/Manager atau assignee yang ditunjuk.

#### Scenario: Fill and submit a pitching RAB
- **WHEN** pengguna yang berhak mengisi RAB Pitching lalu menekan submit
- **THEN** sistem menyimpan versi RAB beserta submitter dan tanggal submit

#### Scenario: RAB version is preserved
- **WHEN** RAB yang sudah disubmit diubah dan disubmit ulang
- **THEN** sistem menyimpan versi baru tanpa menghapus versi sebelumnya

#### Scenario: Assign RAB to an operational assignee
- **WHEN** PM pemilik atau Manager/Admin meng-assign pengisian RAB kepada Assignee atau Manager
- **THEN** sistem mencatat assignee dan mengirim notifikasi penugasan in-app

#### Scenario: Reject RAB submission without items
- **WHEN** pengguna mensubmit RAB tanpa satu pun item biaya atau manpower
- **THEN** sistem menolak submit dan menampilkan alasan validasi

### Requirement: Quotation per pitching

Sistem SHALL menyediakan Quotation per Pitching dengan dua mode input, yaitu Submit Link atau Import PDF, serta assignee, status draft/submitted/approved, dan versi.

#### Scenario: Submit quotation as a link
- **WHEN** pengguna yang berhak memilih mode link dan mengisi URL quotation yang valid
- **THEN** sistem menyimpan Quotation dengan tautan tersebut dan status submitted

#### Scenario: Import quotation as PDF
- **WHEN** pengguna yang berhak memilih mode PDF dan mengunggah berkas PDF
- **THEN** sistem menyimpan berkas Quotation dan menampilkannya pada detail Pitching

#### Scenario: Quotation is assigned to an assignee
- **WHEN** PM pemilik atau Manager/Admin meng-assign pembuatan Quotation kepada Assignee atau Manager
- **THEN** sistem mencatat assignee, mengirim notifikasi in-app, dan menampilkan Quotation pada daftar tugas assignee tersebut

#### Scenario: Quotation approval is recorded
- **WHEN** PM pemilik atau Admin menyetujui Quotation yang sudah disubmit
- **THEN** sistem menandai Quotation sebagai approved dan menyimpan versi yang disetujui

### Requirement: Prospek tasks use the Form engine

Sistem SHALL mengerjakan tugas Prospek seperti Presentasi dan Concept Deck sebagai entri Form yang memakai template Form, assignment, versi, submit, dan review yang sama dengan Form proyek.

#### Scenario: Create a form entry from a pitching template
- **WHEN** PM pemilik membuat entri Form pada Pitching dari template Form yang tersedia
- **THEN** sistem membuat entri Form dengan field sesuai template dan status belum di-assign

#### Scenario: Assign a prospek form entry
- **WHEN** PM pemilik atau Manager/Admin meng-assign entri Form Prospek kepada Assignee atau Manager
- **THEN** sistem mengubah status menjadi assigned dan mengirim notifikasi in-app

#### Scenario: Assignee submits a prospek form entry
- **WHEN** Assignee mengisi lalu mensubmit entri Form Prospek miliknya
- **THEN** sistem menyimpan versi, mengubah status menjadi submitted, dan menampilkan entri itu pada antrean review PM

#### Scenario: PM reviews a prospek form entry
- **WHEN** PM pemilik atau Admin menyetujui atau meminta revisi entri Form Prospek
- **THEN** sistem mencatat keputusan review, komentar, dan status terbaru entri

### Requirement: Pitching decision

Sistem SHALL mengizinkan PM pemilik atau Admin mencatat keputusan Pitching sebagai menang atau kalah setelah RAB disubmit dan Quotation disubmit atau disetujui; keputusan kalah wajib menyertakan alasan.

#### Scenario: Record a winning pitching
- **WHEN** PM pemilik atau Admin menandai Pitching menang setelah RAB dan Quotation memenuhi syarat
- **THEN** sistem menyimpan status menang beserta aktor dan waktu keputusan

#### Scenario: Record a losing pitching with a reason
- **WHEN** PM pemilik atau Admin menandai Pitching kalah dan mengisi alasan
- **THEN** sistem menyimpan status kalah beserta alasan dan waktu keputusan

#### Scenario: Reject decision before RAB or quotation is ready
- **WHEN** pengguna mencatat keputusan saat RAB belum disubmit atau Quotation belum disubmit/disetujui
- **THEN** sistem menolak keputusan dan menampilkan syarat yang belum terpenuhi

#### Scenario: Only the owning PM or Admin decides
- **WHEN** PM lain, Manager, atau Assignee mencoba mencatat keputusan Pitching
- **THEN** sistem menolak aksi tersebut

### Requirement: Losing pitching becomes read-only history

Sistem SHALL memindahkan Pitching kalah beserta RAB, Quotation, Form, dan kontraknya ke riwayat read-only yang tetap dapat dilihat sebagai dokumentasi.

#### Scenario: Losing pitching is frozen
- **WHEN** Pitching ditandai kalah
- **THEN** sistem mengunci perubahan pada Pitching tersebut dan menampilkannya di riwayat Prospek

#### Scenario: Read losing pitching documentation
- **WHEN** pengguna yang berhak membuka riwayat Pitching kalah
- **THEN** sistem menampilkan RAB, Quotation, Form, alasan kalah, dan waktu keputusan tanpa tombol edit

### Requirement: Contract with termine before conversion

Sistem SHALL mewajibkan kontrak pada Pitching menang sebelum konversi, dengan nomor, tanggal, nilai, berkas, dan satu atau lebih Termine.

#### Scenario: Save a complete contract
- **WHEN** PM pemilik atau Admin mengisi nomor, tanggal, nilai, berkas kontrak, dan minimal satu Termine
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
