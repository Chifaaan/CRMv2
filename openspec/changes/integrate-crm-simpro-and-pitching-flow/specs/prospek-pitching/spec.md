# Spec Delta

## MODIFIED Requirements

### Requirement: Pitching cards and detail page

Sistem SHALL menampilkan Pitching pada detail Prospek sebagai card ringkas dan membuka card tersebut menjadi halaman Pitching dengan langkah berurutan RAB, Quotation, Form Pitching, Decision, dan Kontrak untuk Pitching menang.

#### Scenario: Pitching card shows work summary

- **WHEN** pengguna membuka detail Prospek
- **THEN** setiap Pitching tampil sebagai card berisi status, progres tahap RAB/Quotation/Form/Decision/Kontrak, assignee, due date, dan tautan proyek bila sudah dikonversi

#### Scenario: Open pitching page from card

- **WHEN** pengguna menekan card Pitching
- **THEN** sistem membuka halaman Pitching dengan urutan langkah RAB, Quotation, Form Pitching, Decision, dan Kontrak

#### Scenario: Finishing contains decision and conversion

- **WHEN** pengguna membuka tahap Decision
- **THEN** sistem menampilkan keputusan menang/kalah dan status auto-konversi, tanpa tombol konversi manual

#### Scenario: Losing pitching card opens read-only page

- **WHEN** pengguna membuka card Pitching yang kalah
- **THEN** halaman Pitching tampil read-only beserta alasan kalah dan tombol undo bagi PM pemilik atau Admin

### Requirement: RAB per pitching

Sistem SHALL menyediakan RAB per Pitching berisi item manpower dan biaya, submitter, tanggal submit, catatan, versi, serta status pengisian. PM meng-assign RAB kepada Finance; Finance mengisi dan submit; PM mereview serta menandai RAB selesai atau perlu revisi.

#### Scenario: Fill and submit a pitching RAB

- **WHEN** Finance yang di-assign mengisi RAB Pitching lalu menekan submit
- **THEN** sistem menyimpan versi RAB beserta submitter dan tanggal submit

#### Scenario: RAB version is preserved

- **WHEN** RAB yang sudah disubmit diubah dan disubmit ulang
- **THEN** sistem menyimpan versi baru tanpa menghapus versi sebelumnya

#### Scenario: Assign RAB to an operational assignee

- **WHEN** PM pemilik atau Admin meng-assign pengisian RAB kepada Finance
- **THEN** sistem mencatat assignee Finance, mengirim notifikasi in-app, dan menampilkan RAB pada My Tasks assignee tersebut

#### Scenario: Finance fills an assigned RAB

- **WHEN** Finance membuka RAB yang di-assign kepadanya dari My Tasks
- **THEN** Finance dapat mengisi dan mensubmit RAB tanpa membuka halaman Prospek

#### Scenario: Reject RAB submission without items

- **WHEN** pengguna mensubmit RAB tanpa satu pun item biaya atau manpower
- **THEN** sistem menolak submit dan menampilkan alasan validasi

#### Scenario: PM approves or requests RAB revision

- **WHEN** PM pemilik atau Admin mereview RAB yang sudah disubmit
- **THEN** sistem mencatat keputusan selesai atau perlu revisi beserta komentar dan status terbaru

#### Scenario: RAB step completes only after approval

- **WHEN** RAB masih assigned, draft, atau submitted
- **THEN** tahap RAB belum dianggap selesai dan tahap Quotation tetap terkunci

### Requirement: Quotation per pitching

Sistem SHALL menyediakan Quotation per Pitching dengan dua mode input, yaitu Submit Link atau Import PDF, assignee Finance, status draft/submitted/approved/need_revision, dan versi. PM mereview Quotation dan menandainya selesai sebelum tahap Form Pitching dapat dibuka.

#### Scenario: Submit quotation as a link

- **WHEN** Finance yang di-assign memilih mode link dan mengisi URL quotation yang valid
- **THEN** sistem menyimpan Quotation dengan tautan tersebut dan status submitted

#### Scenario: Import quotation as PDF

- **WHEN** Finance yang di-assign memilih mode PDF dan mengunggah berkas PDF
- **THEN** sistem menyimpan berkas Quotation dan menampilkannya pada halaman Pitching

#### Scenario: Quotation is assigned to an assignee

- **WHEN** PM pemilik atau Admin meng-assign pembuatan Quotation kepada Finance
- **THEN** sistem mencatat assignee Finance, mengirim notifikasi in-app, dan menampilkan Quotation pada My Tasks assignee tersebut

#### Scenario: Quotation approval is recorded

- **WHEN** PM pemilik atau Admin menyetujui Quotation yang sudah disubmit
- **THEN** sistem menandai Quotation sebagai approved dan menyimpan versi yang disetujui

#### Scenario: Quotation step completes only after approval

- **WHEN** Quotation masih assigned, draft, submitted, atau need_revision
- **THEN** tahap Quotation belum dianggap selesai dan tahap Form Pitching tetap terkunci

### Requirement: Pitching decision

Sistem SHALL mengizinkan PM pemilik atau Admin mencatat keputusan menang atau kalah setelah RAB disetujui, Quotation disetujui, dan seluruh entri Form Pitching non-batal disetujui. Keputusan kalah wajib menyertakan alasan dan langsung mengarsipkan Pitching.

#### Scenario: Record a winning pitching

- **WHEN** PM pemilik atau Admin menandai Pitching menang setelah RAB, Quotation, dan Form Pitching selesai
- **THEN** sistem menyimpan status menang beserta aktor dan waktu keputusan, lalu membuka tahap Kontrak

#### Scenario: Record a losing pitching with a reason

- **WHEN** PM pemilik atau Admin menandai Pitching kalah setelah tahap sebelumnya selesai
- **THEN** sistem menyimpan status kalah beserta alasan, waktu keputusan, dan langsung memindahkan Pitching ke arsip

#### Scenario: Record a losing pitching after winning

- **WHEN** PM pemilik atau Admin menandai Pitching menang yang belum dikonversi sebagai kalah
- **THEN** sistem menyimpan status kalah, mengarsipkan Pitching, dan menyimpan status menang sebelumnya untuk undo

#### Scenario: Reject decision before RAB or quotation is ready

- **WHEN** pengguna mencatat keputusan saat RAB, Quotation, atau Form Pitching belum selesai
- **THEN** sistem menolak keputusan dan menampilkan tahap yang belum terpenuhi

#### Scenario: Converted pitching cannot be marked lost

- **WHEN** pengguna mencoba menandai kalah Pitching yang sudah dikonversi menjadi anak proyek
- **THEN** sistem menolak aksi tersebut

#### Scenario: Only the owning PM or Admin decides

- **WHEN** PM lain, Manager, Assignee, atau Finance mencoba mencatat keputusan Pitching
- **THEN** sistem menolak aksi tersebut

### Requirement: Contract with termine before conversion

Sistem SHALL mengunci section Kontrak sampai Pitching menang, mengizinkan kontrak di-assign kepada Assignee, Manager, atau Finance, mewajibkan nomor, tanggal, nilai, berkas, serta satu atau lebih Termine, dan menandai Pitching siap dikonversi otomatis setelah kontrak lengkap.

#### Scenario: Contract section is locked before winning

- **WHEN** Pitching masih draft atau belum menang
- **THEN** section Kontrak tampil terkunci dengan penjelasan bahwa kontrak diisi setelah Pitching menang

#### Scenario: Assign contract work

- **WHEN** PM pemilik atau Manager/Admin meng-assign pengisian kontrak kepada Assignee, Manager, atau Finance
- **THEN** sistem mencatat assignee, mengirim notifikasi in-app, dan menampilkan pekerjaan kontrak pada My Tasks penerima

#### Scenario: Save a complete contract

- **WHEN** pengguna yang berhak mengisi nomor, tanggal, nilai, berkas kontrak, dan minimal satu Termine pada Pitching menang
- **THEN** sistem menyimpan kontrak dan menandai Pitching memenuhi syarat konversi otomatis

#### Scenario: Reject incomplete contract

- **WHEN** kontrak disimpan tanpa nomor, tanggal, nilai, berkas, atau Termine
- **THEN** sistem menolak penyimpanan dan menampilkan field yang belum lengkap

#### Scenario: Contract is locked after conversion

- **WHEN** Pitching sudah dikonversi menjadi anak proyek
- **THEN** sistem menampilkan kontrak sebagai read-only

## ADDED Requirements

### Requirement: Pitching stages follow a fixed order

Tahap Pitching SHALL diisi berurutan: RAB → Quotation → Form Pitching → Decision → Kontrak untuk Pitching menang. Tahap berikutnya MUST NOT dibuka sebelum tahap sebelumnya selesai, dan status selesai, aktif, serta terkunci SHALL dibedakan dengan warna.

#### Scenario: Start with RAB
- **WHEN** Pitching baru dibuat
- **THEN** hanya tahap RAB yang aktif; Quotation, Form Pitching, Decision, dan Kontrak terkunci

#### Scenario: Quotation unlocks after RAB
- **WHEN** RAB disetujui PM
- **THEN** tahap Quotation menjadi aktif dan RAB ditampilkan sebagai selesai

#### Scenario: Form Pitching unlocks after Quotation
- **WHEN** Quotation disetujui PM
- **THEN** tahap Form Pitching menjadi aktif dan Quotation ditampilkan sebagai selesai

#### Scenario: Decision unlocks after Form Pitching
- **WHEN** seluruh entri Form Pitching non-batal disetujui
- **THEN** tahap Decision menjadi aktif dan Form Pitching ditampilkan sebagai selesai

#### Scenario: Contract unlocks after winning
- **WHEN** Decision dicatat sebagai menang
- **THEN** tahap Kontrak menjadi aktif

#### Scenario: Losing keeps contract locked
- **WHEN** Decision dicatat sebagai kalah
- **THEN** tahap Kontrak tetap terkunci dan Pitching masuk arsip read-only

#### Scenario: Stage colors communicate progress
- **WHEN** pengguna membuka halaman Pitching
- **THEN** tahap selesai, tahap aktif, dan tahap terkunci menggunakan warna yang berbeda dan dapat dibaca tanpa membuka setiap section

#### Scenario: Cannot skip a stage
- **WHEN** pengguna mencoba membuka atau mengisi tahap setelah tahap sebelumnya belum selesai
- **THEN** sistem menolak akses dan menampilkan tahap yang harus diselesaikan lebih dahulu
