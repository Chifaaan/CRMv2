# Spec Delta

## MODIFIED Requirements

### Requirement: Project workspace tabs

Detail proyek CRM SHALL menyediakan dua tab: Overview dan Journey Management, untuk semua proyek termasuk legacy, dengan Overview sebagai tab awal.

#### Scenario: Open project detail

- **WHEN** pengguna membuka detail proyek
- **THEN** sistem menampilkan tab Overview dan Journey Management

#### Scenario: Legacy project uses the same tabs

- **WHEN** pengguna membuka proyek legacy
- **THEN** kedua tab tetap tersedia dan isi legacy tetap dapat dibaca

#### Scenario: Default tab

- **WHEN** pengguna pertama kali membuka detail proyek
- **THEN** sistem menampilkan tab Overview

#### Scenario: Board tab is no longer available

- **WHEN** pengguna membuka detail proyek, termasuk melalui tautan lama yang meminta tab Board
- **THEN** sistem tidak menampilkan tab Board dan menampilkan Overview

### Requirement: Overview summarizes project origin and history

Tab Overview SHALL menampilkan Asal Prospek, Riwayat Aktivitas, Penyelesaian Tahap, serta Distribusi task dan Progress overview proyek.

#### Scenario: Show prospek origin

- **WHEN** proyek berasal dari Prospek
- **THEN** Overview menampilkan Prospek, Pitching, PIC, client, periode, pagu, RAB, Quotation, dan kontrak/Termine yang diwarisi

#### Scenario: Show activity history

- **WHEN** pengguna membuka Overview
- **THEN** sistem menampilkan riwayat aktivitas proyek terurut waktu beserta aktor dan ringkasan

#### Scenario: Show step completion

- **WHEN** pengguna membuka Overview
- **THEN** sistem menampilkan ringkasan step yang selesai, dilewati, dan belum selesai

#### Scenario: Task distribution appears above activity history

- **WHEN** pengguna membuka Overview pada proyek yang memiliki task SIMPRO
- **THEN** Distribusi task dan Progress overview tampil di atas Riwayat Aktivitas

### Requirement: Workspace header actions and overview task distribution

Setiap tab workspace SHALL menampilkan tombol Selesaikan Tahap di bawah header. Overview SHALL menampilkan Distribusi task dan Progress overview proyek, sedangkan Journey Management SHALL menyediakan pemilih step dari Kelola fase yang menentukan card task SIMPRO di bawahnya.

#### Scenario: Complete stage from any tab

- **WHEN** PM/Admin membuka Overview atau Journey Management dan ada step aktif
- **THEN** tombol Selesaikan Tahap tersedia di bawah header

#### Scenario: Select a step for the board

- **WHEN** PM memilih step yang sudah dibuat di Kelola fase pada Journey Management
- **THEN** card task di bawahnya menampilkan task tahap SIMPRO untuk step yang dipilih

#### Scenario: Select a non-SIMPRO step

- **WHEN** PM memilih step Form, Gerbang, atau Form Keuangan di Journey Management
- **THEN** card task SIMPRO tidak menampilkan task dari step lain dan isi tahap yang dipilih tetap ditampilkan sesuai jenisnya

#### Scenario: Edit a step

- **WHEN** PM/Admin memilih opsi Edit pada sebuah step
- **THEN** nama, deskripsi, dan Manager PIC step dapat diperbarui sesuai aturan lifecycle

#### Scenario: Show project task distribution

- **WHEN** pengguna membuka Overview
- **THEN** sistem menampilkan jumlah task per status SIMPRO, hitungan Completed, Open, Overdue, dan persentase task selesai hanya untuk proyek tersebut
