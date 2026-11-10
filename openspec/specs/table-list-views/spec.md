# table-list-views Specification

## Purpose

Menyediakan tampilan Card dan Table/List yang konsisten pada halaman Projects, Groups, dan Forms, dengan pilihan tampilan yang diingat per halaman.

## Requirements

### Requirement: Projects and Groups support Card and Table views

Sistem SHALL menyediakan toggle Card/Table pada halaman CRM Projects dan CRM Groups, menampilkan data yang sama pada kedua tampilan, dan menggunakan Card sebagai tampilan awal.

#### Scenario: Switch projects to table view
- **WHEN** pengguna memilih tampilan Table pada halaman CRM Projects
- **THEN** sistem menampilkan daftar proyek dalam tabel dengan kolom proyek, client, Prospek, status, fase, progress, dan anggota utama

#### Scenario: Switch groups to table view
- **WHEN** pengguna memilih tampilan Table pada halaman CRM Groups
- **THEN** sistem menampilkan daftar Group dalam tabel dengan kolom nama, deskripsi, jumlah proyek, dan progress

#### Scenario: Default view is card
- **WHEN** pengguna membuka CRM Projects atau CRM Groups untuk pertama kali
- **THEN** sistem menampilkan tampilan Card

#### Scenario: Show prospek column
- **WHEN** proyek berasal dari Prospek
- **THEN** kolom Prospek menampilkan nama Prospek asal dan dapat diklik menuju Prospek

#### Scenario: Direct project has empty prospek column
- **WHEN** proyek dibuat langsung tanpa Prospek
- **THEN** kolom Prospek menampilkan tanda kosong

### Requirement: Forms supports Card and Table views

Sistem SHALL menyediakan toggle Card/Table pada halaman Forms, menampilkan Form proyek dan Form Pitching yang di-assign kepada pengguna, dan menggunakan Card sebagai tampilan awal.

#### Scenario: Switch forms to table view
- **WHEN** pengguna memilih tampilan Table pada halaman Forms
- **THEN** sistem menampilkan tabel Form dengan kolom nama Form, proyek atau Pitching, assignee, status, due date, dan waktu submit

#### Scenario: Assigned pitching form appears in Forms
- **WHEN** pengguna di-assign entri Form Pitching
- **THEN** entri tersebut tampil pada halaman Forms dalam tampilan Card maupun Table

#### Scenario: Default forms view is card
- **WHEN** pengguna membuka halaman Forms untuk pertama kali
- **THEN** sistem menampilkan tampilan Card

### Requirement: Table view respects filters and empty state

Sistem SHALL menerapkan pencarian, filter status, dan filter proyek yang sama pada tampilan Card dan Table, serta menampilkan empty state yang sesuai ketika tidak ada data.

#### Scenario: Filter applies to both views
- **WHEN** pengguna mengubah pencarian atau filter pada tampilan Table
- **THEN** baris tabel yang tampil mengikuti filter yang sama seperti tampilan Card

#### Scenario: Empty table
- **WHEN** tidak ada data yang cocok dengan filter pada tampilan Table
- **THEN** sistem menampilkan empty state di dalam area tabel

### Requirement: View preference is remembered per page

Sistem SHALL mengingat pilihan Card/Table secara terpisah untuk Projects, Groups, dan Forms, dan mempertahankannya saat pengguna berpindah halaman atau memuat ulang aplikasi.

#### Scenario: Preference survives navigation
- **WHEN** pengguna memilih Table pada Projects lalu membuka halaman lain dan kembali
- **THEN** Projects tetap menampilkan Table

#### Scenario: Preference is independent per page
- **WHEN** pengguna memilih Table pada Projects tetapi Card pada Groups
- **THEN** masing-masing halaman mempertahankan pilihannya sendiri
