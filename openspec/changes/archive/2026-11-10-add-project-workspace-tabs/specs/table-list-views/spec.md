# Spec Delta

## MODIFIED Requirements

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
