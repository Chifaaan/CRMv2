# prospek-management Specification

## Purpose

Menyediakan Prospek sebagai umbrella project di CRM yang menampung banyak Pitching, mengelola detail peluang, pagu, akses, audit trail, dan mengubah Pitching menang menjadi anak proyek.

## Requirements

### Requirement: Prospek entity with opportunity details

Sistem SHALL menyediakan entitas Prospek dengan kode unik, nama, deskripsi, PIC, client, periode (mulai dan selesai), pagu, status, dan pembuat.

#### Scenario: Create a prospek with complete details
- **WHEN** PM membuat Prospek dengan nama, PIC, client, periode, dan pagu yang valid
- **THEN** sistem menyimpan Prospek berstatus aktif dengan kode unik dan menampilkannya di daftar Prospek

#### Scenario: Reject incomplete or invalid prospek details
- **WHEN** pembuat mengirim Prospek tanpa nama, tanpa client, atau periode selesai lebih awal dari periode mulai
- **THEN** sistem menolak penyimpanan dan menampilkan alasan validasi

#### Scenario: Pagu may be zero
- **WHEN** pembuat mengisi pagu kosong atau nol
- **THEN** sistem tetap menyimpan Prospek dan menampilkan pagu sebagai belum ditetapkan

### Requirement: Prospek list and detail navigation

Sistem SHALL menampilkan menu Prospek di CRM, daftar Prospek berbentuk kartu seperti Group, dan halaman detail yang memuat informasi Prospek beserta daftar Pitching di dalamnya.

#### Scenario: Open prospek list from CRM menu
- **WHEN** pengguna yang berhak membuka menu Prospek
- **THEN** sistem menampilkan daftar Prospek dengan nama, client, PIC, periode, pagu, status, dan jumlah Pitching

#### Scenario: Open prospek detail
- **WHEN** pengguna membuka salah satu Prospek
- **THEN** sistem menampilkan detail Prospek, daftar Pitching beserta statusnya, dan ringkasan pagu terhadap total RAB/Quotation

#### Scenario: Empty prospek list
- **WHEN** belum ada Prospek yang dapat dilihat pengguna
- **THEN** sistem menampilkan empty state dengan ajakan membuat Prospek bagi pengguna yang berhak

### Requirement: Prospek access by role

Sistem SHALL membatasi pembuatan dan visibilitas Prospek: PM membuat dan hanya melihat Prospek miliknya, Manager dan Admin melihat semua Prospek, Assignee tidak memiliki akses ke menu atau halaman Prospek dan hanya membuka pekerjaan yang di-assign melalui My Tasks/Forms, serta Finance tidak memiliki akses Prospek tetapi dapat membuka pekerjaan yang di-assign melalui My Tasks/Forms.

#### Scenario: PM sees only own prospek
- **WHEN** PM membuka daftar Prospek
- **THEN** sistem hanya menampilkan Prospek yang dibuat PM tersebut

#### Scenario: Manager and Admin see all prospek
- **WHEN** Manager atau Admin membuka daftar Prospek
- **THEN** sistem menampilkan seluruh Prospek

#### Scenario: Assignee sees only assigned work
- **WHEN** Assignee membuka My Tasks atau Forms
- **THEN** sistem hanya menampilkan pekerjaan Prospek yang di-assign kepadanya tanpa data Prospek lain

#### Scenario: Assignee has no prospek access
- **WHEN** Assignee mencoba membuka menu atau URL Prospek
- **THEN** sistem menolak akses dan mengarahkan Assignee ke My Tasks atau Forms

#### Scenario: Finance has no prospek access
- **WHEN** user role Finance mencoba membuka menu atau URL Prospek
- **THEN** sistem menolak akses sampai Pitching menang dikonversi menjadi anak proyek

#### Scenario: Assigned work is accessible without prospek access
- **WHEN** Assignee atau Finance di-assign RAB, Quotation, Form Pitching, atau Kontrak
- **THEN** pekerjaan tersebut dapat dibuka dari My Tasks atau Forms tanpa membuka halaman Prospek

### Requirement: Prospek status lifecycle

Sistem SHALL menjaga status Prospek sebagai aktif, selesai, atau dibatalkan; Prospek selesai ketika seluruh Pitching sudah diputuskan dan semua Pitching menang sudah dikonversi, sedangkan pembatalan wajib beralasan dan membuat Prospek read-only.

#### Scenario: Prospek completes automatically
- **WHEN** Pitching terakhir pada Prospek sudah diputuskan dan seluruh Pitching menang sudah menjadi anak proyek
- **THEN** sistem menandai Prospek sebagai selesai

#### Scenario: Cancel a prospek with a reason
- **WHEN** PM pemilik atau Admin membatalkan Prospek disertai alasan
- **THEN** sistem menandai Prospek sebagai dibatalkan, menyimpan alasan, dan menjadikan seluruh isinya read-only

#### Scenario: Cancelled prospek rejects new work
- **WHEN** pengguna mencoba menambah Pitching atau mengubah data pada Prospek yang dibatalkan
- **THEN** sistem menolak perubahan tersebut

### Requirement: Pagu is a warning only

Sistem SHALL menampilkan peringatan ketika total RAB atau Quotation dari Pitching melampaui pagu Prospek, tanpa memblokir pembuatan atau penyimpanan data.

#### Scenario: Warn when total exceeds pagu
- **WHEN** total nilai RAB atau Quotation pada Prospek melebihi pagu
- **THEN** sistem menampilkan peringatan bahwa pagu terlampaui dan tetap menyimpan data

#### Scenario: No warning within pagu
- **WHEN** total nilai RAB dan Quotation masih di bawah atau sama dengan pagu
- **THEN** sistem tidak menampilkan peringatan pagu

### Requirement: Winning pitching becomes a child project

Sistem SHALL mengizinkan PM pemilik atau Admin mengonversi Pitching menang yang kontraknya lengkap menjadi anak proyek, menyimpan tautan `prospekId` dan `pitchingId`, mewarisi RAB, Quotation, dan kontrak, serta memulai proyek setelah fase Prospek selesai. Konversi SHALL memakai ulang Group bernama sama dengan Prospek bila sudah ada atau membuat Group baru, lalu menjadikan anak proyek sebagai anggota Group tersebut.

#### Scenario: Convert a winning pitching
- **WHEN** PM pemilik atau Admin mengonversi Pitching berstatus menang dengan kontrak lengkap
- **THEN** sistem membuat proyek anak dengan `prospekId`, `pitchingId`, data RAB/Quotation/kontrak, dan tahap fase Prospek sudah selesai

#### Scenario: Block conversion without a win or complete contract
- **WHEN** pengguna mencoba mengonversi Pitching yang belum menang atau kontraknya belum lengkap
- **THEN** sistem menolak konversi dan menampilkan syarat yang belum terpenuhi

#### Scenario: Conversion is idempotent
- **WHEN** Pitching yang sudah dikonversi dicoba dikonversi lagi
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

### Requirement: Prospek audit trail

Sistem SHALL mencatat event audit untuk pembuatan dan perubahan Prospek, penambahan Pitching, keputusan, kontrak, dan konversi, serta menyediakan riwayat yang dapat dibaca kembali.

#### Scenario: Audit prospek creation and updates
- **WHEN** Prospek dibuat atau detailnya diubah
- **THEN** sistem mencatat event berisi aktor, waktu, dan nilai sebelum/sesudah

#### Scenario: Audit conversion
- **WHEN** Pitching dikonversi menjadi anak proyek
- **THEN** sistem mencatat event konversi berisi `prospekId`, `pitchingId`, dan id proyek anak

#### Scenario: Read audit history
- **WHEN** pengguna yang berhak membuka riwayat Prospek
- **THEN** sistem menampilkan event terurut waktu beserta aktor dan ringkasannya

### Requirement: Legacy pitching projects remain unchanged

Sistem SHALL membiarkan proyek lama yang memakai step Pitching beserta riwayatnya tetap berjalan sebagai legacy, tanpa migrasi otomatis ke Prospek dan tanpa perubahan pada `ProjectGroup`.

#### Scenario: Legacy project keeps its pitching step
- **WHEN** proyek lama dengan step Pitching dibuka setelah fitur Prospek tersedia
- **THEN** sistem menampilkan step Pitching lama seperti sebelumnya tanpa mengubah datanya

#### Scenario: New prospek does not alter groups
- **WHEN** Prospek baru dibuat
- **THEN** sistem tidak membuat atau mengubah `ProjectGroup` yang sudah ada
