# Spec Delta

## REMOVED Requirements

### Requirement: Forms supports Card and Table views

**Reason**: Form Pitching tidak lagi tampil di Forms, sehingga kontrak yang menyebut Form Pitching pada toggle Card/Table tidak berlaku.

**Migration**: Forms tetap memiliki toggle Card/Table untuk Form proyek, Form Keuangan, serta RAB/Quotation/Kontrak Prospek; kartu Pitching dibuka dari board Pitching.

## MODIFIED Requirements

### Requirement: Projects and Groups support Card and Table views

Sistem SHALL menyediakan toggle Card/Table pada halaman CRM Projects dan CRM Umbrella, menampilkan data yang sama pada kedua tampilan, menggunakan Card sebagai tampilan awal, dan menyediakan aksi "Tambah ke Umbrella" pada table view.

#### Scenario: Switch projects to table view

- **WHEN** pengguna memilih tampilan Table pada halaman CRM Projects
- **THEN** sistem menampilkan daftar proyek dalam tabel dengan kolom proyek, client, Prospek, Umbrella, status, fase, progress, dan anggota utama

#### Scenario: Switch groups to table view

- **WHEN** pengguna memilih tampilan Table pada halaman CRM Umbrella
- **THEN** sistem menampilkan daftar Umbrella dalam tabel dengan kolom nama, deskripsi, jumlah proyek, dan progress

#### Scenario: Default view is card

- **WHEN** pengguna membuka CRM Projects atau CRM Umbrella untuk pertama kali
- **THEN** sistem menampilkan tampilan Card

#### Scenario: Show prospek column

- **WHEN** proyek berasal dari Prospek
- **THEN** kolom Prospek menampilkan nama Prospek asal dan dapat diklik menuju Prospek

#### Scenario: Direct project has empty prospek column

- **WHEN** proyek dibuat langsung tanpa Prospek
- **THEN** kolom Prospek menampilkan tanda kosong

#### Scenario: Add a project to an umbrella from the table

- **WHEN** pengguna memilih aksi "Tambah ke Umbrella" pada baris tabel proyek
- **THEN** sistem menampilkan pilihan Umbrella yang boleh ia kelola dan menambahkan proyek setelah dipilih

### Requirement: View preference is remembered per page

Sistem SHALL mengingat pilihan Card/Table secara terpisah untuk Projects, Umbrella, dan Forms, dan mempertahankannya saat pengguna berpindah halaman atau memuat ulang aplikasi.

#### Scenario: Preference survives navigation

- **WHEN** pengguna memilih Table pada Projects lalu membuka halaman lain dan kembali
- **THEN** Projects tetap menampilkan Table

#### Scenario: Preference is independent per page

- **WHEN** pengguna memilih Table pada Projects tetapi Card pada Umbrella
- **THEN** masing-masing halaman mempertahankan pilihannya sendiri

## ADDED Requirements

### Requirement: Forms supports Card and Table views for project and Prospek work

Sistem SHALL menyediakan toggle Card/Table pada halaman Forms, menampilkan Form proyek, Form Keuangan, dan pekerjaan Prospek berupa RAB, Quotation, atau Kontrak yang di-assign kepada pengguna, serta menggunakan Card sebagai tampilan awal. Kartu Form Pitching SHALL NOT tampil pada halaman Forms.

#### Scenario: Switch forms to table view

- **WHEN** pengguna memilih tampilan Table pada halaman Forms
- **THEN** sistem menampilkan tabel Form dengan kolom nama Form, proyek atau Pitching, assignee, status, due date, dan waktu submit

#### Scenario: Assigned Prospek work appears in Forms

- **WHEN** pengguna di-assign RAB, Quotation, atau Kontrak Pitching
- **THEN** pekerjaan tersebut tampil pada halaman Forms dalam tampilan Card maupun Table

#### Scenario: Pitching cards are not listed

- **WHEN** pengguna memiliki kartu Form Pitching yang di-assign
- **THEN** halaman Forms tidak menampilkan kartu tersebut pada Card maupun Table

#### Scenario: Default forms view is card

- **WHEN** pengguna membuka halaman Forms untuk pertama kali
- **THEN** sistem menampilkan tampilan Card
