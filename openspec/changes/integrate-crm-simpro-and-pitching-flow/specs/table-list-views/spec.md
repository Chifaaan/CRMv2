# Spec Delta

## MODIFIED Requirements

### Requirement: Projects and Groups support Card and Table views

Sistem SHALL menyediakan toggle Card/Table pada halaman CRM Projects dan CRM Groups, menampilkan data yang sama pada kedua tampilan, dan menggunakan Card sebagai tampilan awal. Halaman Projects menampilkan daftar proyek datar tanpa section Groups, sedangkan halaman CRM Groups tetap menyediakan tampilan Group.

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

### Requirement: View preference is remembered per page

Sistem SHALL mengingat pilihan Card/Table secara terpisah untuk Projects, Groups, Forms, dan Prospek, dan mempertahankannya saat pengguna berpindah halaman atau memuat ulang aplikasi.

#### Scenario: Preference survives navigation

- **WHEN** pengguna memilih Table pada Projects lalu membuka halaman lain dan kembali
- **THEN** Projects tetap menampilkan Table

#### Scenario: Preference is independent per page

- **WHEN** pengguna memilih Table pada Projects tetapi Card pada Groups
- **THEN** masing-masing halaman mempertahankan pilihannya sendiri

#### Scenario: Prospek preference is independent

- **WHEN** pengguna memilih Table pada Prospek lalu membuka Projects
- **THEN** Prospek tetap Table dan Projects memakai preferensinya sendiri

## ADDED Requirements

### Requirement: Prospek supports Card and Table views

Sistem SHALL menyediakan toggle Card/Table pada halaman Prospek, menampilkan data Prospek yang sama pada kedua tampilan, dan menggunakan Card sebagai tampilan awal.

#### Scenario: Switch Prospek to table view
- **WHEN** pengguna memilih tampilan Table pada halaman Prospek
- **THEN** sistem menampilkan tabel Prospek dengan kolom nama/kode, client, PIC, periode, pagu, jumlah Pitching, jumlah menang, dan status

#### Scenario: Prospek card remains default
- **WHEN** pengguna membuka halaman Prospek untuk pertama kali
- **THEN** sistem menampilkan tampilan Card

#### Scenario: Prospek filters apply to both views
- **WHEN** pengguna mengubah pencarian atau filter status pada Prospek
- **THEN** tampilan Card dan Table menampilkan hasil yang sama

### Requirement: Projects and Prospek lists paginate

Halaman CRM Projects dan Prospek SHALL menampilkan pagination dengan pilihan ukuran halaman, informasi rentang data, dan navigasi halaman sebelumnya/berikutnya.

#### Scenario: Paginate Projects
- **WHEN** jumlah proyek melebihi ukuran halaman yang dipilih
- **THEN** halaman Projects hanya menampilkan proyek pada halaman aktif dan menyediakan navigasi halaman

#### Scenario: Paginate Prospek
- **WHEN** jumlah Prospek melebihi ukuran halaman yang dipilih
- **THEN** halaman Prospek hanya menampilkan Prospek pada halaman aktif dan menyediakan navigasi halaman

#### Scenario: Filters reset pagination
- **WHEN** pengguna mengubah pencarian atau filter pada Projects atau Prospek
- **THEN** daftar kembali ke halaman pertama dari hasil yang baru

#### Scenario: Empty page range
- **WHEN** tidak ada data yang cocok
- **THEN** pagination menampilkan rentang kosong dan empty state tetap tampil
