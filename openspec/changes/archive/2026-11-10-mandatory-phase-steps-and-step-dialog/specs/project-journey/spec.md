# Spec Delta

## ADDED Requirements

### Requirement: Mandatory steps per included phase
Setiap template yang memuat fase Prospek MUST memiliki step RAB dan Decision Win / Loss, dan setiap template yang memuat fase Finance MUST memiliki step BAST dan Invoice. Step wajib MUST dibuat otomatis bila belum ada dan MUST NOT dapat dihapus atau diubah jenisnya saat penyusunan template dan pembuatan proyek.

#### Scenario: Template with Prospek is completed automatically
- **WHEN** sebuah template memuat fase Prospek tanpa step RAB
- **THEN** sistem menambahkan step RAB (Form Keuangan) dan Decision Win / Loss (Gerbang persetujuan klien) pada fase Prospek

#### Scenario: Finance always has BAST and Invoice
- **WHEN** sebuah template memuat fase Finance
- **THEN** step BAST dan Invoice wajib ada dan ditambahkan otomatis bila hilang

#### Scenario: Mandatory step cannot be removed during setup
- **WHEN** pengguna mencoba menghapus RAB, Decision, BAST, atau Invoice di editor template atau saat pembuatan proyek
- **THEN** penghapusan ditolak

#### Scenario: Mandatory step may be removed after the project starts
- **WHEN** proyek sudah berjalan dan PM menghapus step wajib lewat Journey Management
- **THEN** penghapusan diizinkan dan step tidak dibuat ulang otomatis

#### Scenario: Legacy Umum is exempt
- **WHEN** template legacy Umum divalidasi
- **THEN** aturan wajib baru tidak memblokir enam step legacy

### Requirement: Prospek is opt-in at project creation
Template MAY memuat fase Prospek. Saat membuat proyek, fase Prospek MUST NOT ditambahkan secara default, bahkan bila template memuatnya. Pengguna MUST dapat menekan `Tambah tahapan Prospek`; aksi itu menambahkan fase Prospek beserta step wajibnya (RAB + Decision Win / Loss) atau step Prospek dari template. Bila tidak ditekan, Prospek tidak termasuk. Proyek yang menyertakan Prospek MUST memulai journey dari Prospek.

#### Scenario: Prospek is excluded by default
- **WHEN** PM memilih template yang memiliki fase Prospek tanpa menekan `Tambah tahapan Prospek`
- **THEN** proyek dibuat tanpa step Prospek

#### Scenario: Add the Prospek phase from the creation page
- **WHEN** PM menekan `Tambah tahapan Prospek`
- **THEN** fase Prospek beserta RAB dan Decision Win / Loss ditambahkan ke draft proyek dan dapat dihapus kembali sebelum dibuat

#### Scenario: Prospek project starts at RAB
- **WHEN** PM memulai proyek yang menyertakan Prospek
- **THEN** step RAB menjadi aktif dan Decision menunggu hingga RAB selesai

#### Scenario: Skip Prospek is rejected
- **WHEN** pengguna mencoba memulai proyek yang memiliki fase Prospek langsung dari Planning atau Running
- **THEN** aksi ditolak

#### Scenario: Template without Prospek is unchanged
- **WHEN** proyek dibuat dari template tanpa fase Prospek
- **THEN** proyek dimulai dari Planning atau Running seperti sebelumnya

### Requirement: Manual project creation seeds Finance mandatory steps
Proyek mode Manual MUST otomatis memiliki step wajib Finance (BAST dan Invoice) saat dibuat, serta MUST menawarkan opsi menyertakan fase Prospek. Bila Prospek disertakan, RAB dan Decision Win / Loss dibuat otomatis; bila tidak, proyek dibuat tanpa Prospek. Pembuatan proyek mode Manual MUST menampilkan keterangan bahwa tahapan dan step dibuat di dalam proyek dan dapat diatur di Journey Management.

#### Scenario: Manual project gets Finance steps
- **WHEN** PM membuat proyek mode Manual
- **THEN** proyek memiliki step BAST dan Invoice berstatus pending dan keterangan bahwa step lain diatur di Journey Management

#### Scenario: Manual project includes Prospek on demand
- **WHEN** PM menekan `Tambah tahapan Prospek` pada mode Manual
- **THEN** proyek memiliki step Prospek RAB dan Decision Win / Loss selain step Finance

#### Scenario: Manual project without Prospek
- **WHEN** PM membuat proyek mode Manual tanpa menyertakan Prospek
- **THEN** proyek dibuat tanpa step Prospek

### Requirement: Project creation labels mandatory and optional steps
Saat pembuatan proyek, setiap step MUST menampilkan label `Wajib` atau `Opsional`, dan ringkasan MUST mencantumkan jumlah step wajib dan opsional.

#### Scenario: Labels are shown for a template
- **WHEN** PM memilih template pada pembuatan proyek
- **THEN** setiap step menampilkan label `Wajib` atau `Opsional` dan ringkasan menampilkan jumlahnya

#### Scenario: Mandatory steps are auto-added on creation
- **WHEN** template yang dipilih belum memuat step wajib pada fase yang dipakai
- **THEN** step wajib ditambahkan otomatis sebelum proyek dibuat

### Requirement: Kelola fase follows the selected stepper phase
Daftar step pada `Kelola fase` MUST mengikuti fase yang dipilih pada stepper header. Memilih fase Planning MUST menampilkan step Planning, memilih Running MUST menampilkan step Running, dan seterusnya. Tombol tambah step MUST memakai fase yang dipilih tersebut sebagai default. Tombol selesai fase MUST hanya aktif untuk fase yang sedang berjalan.

#### Scenario: Select Planning in the header
- **WHEN** pengguna menekan fase Planning pada stepper header
- **THEN** Kelola fase menampilkan step fase Planning dan tombol tambah step memakai fase Planning

#### Scenario: Select Running in the header
- **WHEN** pengguna menekan fase Running pada stepper header
- **THEN** Kelola fase menampilkan step fase Running

#### Scenario: Complete only the running phase
- **WHEN** pengguna memilih fase yang bukan fase aktif
- **THEN** tombol selesai fase nonaktif sampai fase tersebut menjadi fase berjalan

### Requirement: Journey Management uses a step dialog
Journey Management MUST add and edit steps through a dialog containing nama, fase, jenis step, jenis form/gerbang, Manager PIC, dan deskripsi. Penambahan step MUST memakai fase yang dipilih pada dialog. Kartu `Pilih Step` MUST NOT ditampilkan; pemilihan step MUST dilakukan lewat fase dan step pada stepper header.

#### Scenario: Add a step to a chosen phase
- **WHEN** PM menambahkan step dengan fase Planning pada dialog
- **THEN** step tersimpan pada fase Planning, bukan Running

#### Scenario: Add a Prospek step
- **WHEN** PM menambahkan step pada fase Prospek
- **THEN** step wajib Prospek dilengkapi otomatis bila fase tersebut belum memiliki step wajib

#### Scenario: Edit a step via dialog
- **WHEN** PM memilih Edit pada sebuah step
- **THEN** dialog Edit menampilkan nama, deskripsi, dan Manager PIC step tersebut

#### Scenario: Select a step from the header
- **WHEN** pengguna menekan fase atau step pada stepper header
- **THEN** panel di bawah menampilkan step tersebut tanpa kartu `Pilih Step`

#### Scenario: Mandatory badge in Journey Management
- **WHEN** PM membuka daftar step pada Kelola fase
- **THEN** setiap step menampilkan label `Wajib` atau `Opsional`
