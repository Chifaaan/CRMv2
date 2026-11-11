# umbrella-projects Specification

## Purpose

Mengelompokkan beberapa proyek ke dalam satu Umbrella Project, termasuk pembuatan oleh PM, batas visibilitas pemilik, keanggotaan minimal, dan pemindahan proyek lewat drag-and-drop.

## Requirements

### Requirement: Umbrella is a project group

Sistem SHALL menampilkan `ProjectGroup` sebagai "Umbrella Project" pada CRM, dan SHALL mempertahankan route `/crm/groups` beserta data keanggotaan yang sudah ada.

#### Scenario: Existing group is shown as an umbrella

- **WHEN** pengguna membuka halaman CRM Groups
- **THEN** setiap `ProjectGroup` tampil dengan istilah "Umbrella" tanpa mengubah data atau id group

#### Scenario: Project card marks umbrella membership

- **WHEN** sebuah proyek menjadi anggota Umbrella
- **THEN** card proyek menampilkan atribusi Umbrella

#### Scenario: Direct project has no umbrella attribution

- **WHEN** sebuah proyek tidak memiliki `groupId`
- **THEN** card proyek tidak menampilkan atribusi Umbrella

### Requirement: PM creates and sees only owned umbrellas

PM SHALL dapat membuat Umbrella, dan daftar Umbrella untuk PM SHALL hanya berisi Umbrella yang ia buat. Admin dan Manager SHALL melihat seluruh Umbrella.

#### Scenario: PM creates an umbrella

- **WHEN** PM membuat Umbrella dari card view CRM Projects atau halaman Umbrella
- **THEN** sistem menyimpan Umbrella dengan pembuat PM tersebut dan menampilkannya pada daftar Umbrella PM itu

#### Scenario: PM does not see another user's umbrella

- **WHEN** PM membuka halaman Umbrella dan ada Umbrella yang dibuat Admin, Manager, atau PM lain
- **THEN** Umbrella tersebut tidak tampil

#### Scenario: Manager sees every umbrella

- **WHEN** Manager atau Admin membuka halaman Umbrella
- **THEN** seluruh Umbrella tampil beserta anggotanya

### Requirement: PM manages membership only for own projects and umbrellas

PM SHALL hanya dapat menambah atau mengeluarkan proyek yang ia buat ke atau dari Umbrella yang ia buat. Admin dan Manager SHALL dapat mengelola keanggotaan proyek apa pun pada Umbrella mana pun.

#### Scenario: PM adds own project

- **WHEN** PM menambahkan proyek miliknya ke Umbrella miliknya
- **THEN** proyek bergabung dan audit keanggotaan tercatat

#### Scenario: PM cannot add another owner's project

- **WHEN** PM mencoba menambahkan proyek milik PM lain ke Umbrella miliknya
- **THEN** proyek tersebut tidak tersedia dan aksi ditolak

#### Scenario: Manager moves any project

- **WHEN** Manager memindahkan proyek mana pun ke Umbrella mana pun
- **THEN** keanggotaan berubah dan audit mencatat aktor serta Umbrella tujuan

#### Scenario: PM cannot edit another user's umbrella

- **WHEN** PM mencoba mengganti nama, mengeluarkan anggota, atau membubarkan Umbrella yang bukan buatannya
- **THEN** aksi ditolak

### Requirement: Umbrella keeps at least two members

Pembuatan Umbrella SHALL memerlukan minimal dua proyek. Umbrella yang tersisa dengan satu anggota SHALL dibubarkan otomatis saat anggota terakhir yang dapat dikeluarkan dikeluarkan.

#### Scenario: Reject a one-project umbrella

- **WHEN** pengguna mencoba membuat Umbrella dari satu proyek
- **THEN** sistem menolak dan menjelaskan bahwa Umbrella memerlukan minimal dua proyek

#### Scenario: Auto-disband below two members

- **WHEN** anggota dikeluarkan sehingga Umbrella hanya menyisakan satu proyek
- **THEN** sistem membubarkan Umbrella dan mengembalikan proyek tersisa ke daftar tanpa Umbrella

#### Scenario: Disband clears membership

- **WHEN** pengguna membubarkan Umbrella
- **THEN** semua proyek anggotanya kehilangan `groupId` dan audit keanggotaan tercatat untuk setiap proyek

### Requirement: Umbrella membership supports drag and drop

Pada card view CRM Projects dan halaman Umbrella, sistem SHALL mendukung drag-and-drop proyek: menjatuhkan proyek pada proyek lain menawarkan pembuatan Umbrella, dan menjatuhkan proyek pada kartu Umbrella menambahkan proyek ke Umbrella tersebut. Table view SHALL menyediakan aksi "Tambah ke Umbrella" sebagai pengganti drag-and-drop.

#### Scenario: Drop a project onto another project

- **WHEN** pengguna menjatuhkan proyek A pada card proyek B
- **THEN** sistem membuka dialog pembuatan Umbrella dengan nama default sesuai proyek tujuan dan kedua proyek terpilih

#### Scenario: Drop a project onto an umbrella

- **WHEN** pengguna menjatuhkan proyek pada kartu Umbrella
- **THEN** proyek langsung menjadi anggota Umbrella tersebut tanpa dialog tambahan

#### Scenario: Add from table view

- **WHEN** pengguna memilih aksi "Tambah ke Umbrella" pada baris tabel proyek
- **THEN** sistem menampilkan pilihan Umbrella yang boleh dikelola pengguna dan menambahkan proyek setelah dipilih

#### Scenario: Drop is rejected without permission

- **WHEN** pengguna menjatuhkan proyek yang tidak boleh ia kelola ke Umbrella yang tidak boleh ia kelola
- **THEN** sistem membatalkan drop dan tidak mengubah keanggotaan

#### Scenario: Drag is unavailable in table view

- **WHEN** pengguna membuka table view CRM Projects
- **THEN** baris tabel tidak dapat di-drag dan perubahan keanggotaan hanya melalui aksi "Tambah ke Umbrella"

### Requirement: Conversion-created umbrella belongs to the prospek owner

Umbrella yang dibuat otomatis saat konversi Pitching menang SHALL dimiliki oleh pembuat Prospek, sehingga PM pemilik Prospek dapat melihat dan mengelolanya. Umbrella aktif dengan nama Prospek yang sama SHALL dipakai ulang.

#### Scenario: Conversion creates an owned umbrella

- **WHEN** Pitching menang dikonversi dan belum ada Umbrella bernama sama dengan Prospek
- **THEN** sistem membuat Umbrella dengan pembuat Prospek dan memasukkan anak proyek ke dalamnya

#### Scenario: Existing same-name umbrella is reused

- **WHEN** Pitching menang dikonversi dan sudah ada Umbrella aktif bernama sama dengan Prospek
- **THEN** sistem memakai Umbrella tersebut tanpa membuat duplikat

#### Scenario: Owning PM sees the conversion umbrella

- **WHEN** PM pemilik Prospek membuka halaman Umbrella setelah konversi
- **THEN** Umbrella hasil konversi tampil karena ia pembuatnya
