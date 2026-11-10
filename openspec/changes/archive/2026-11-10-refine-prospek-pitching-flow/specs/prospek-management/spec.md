# Spec Delta

## MODIFIED Requirements

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
