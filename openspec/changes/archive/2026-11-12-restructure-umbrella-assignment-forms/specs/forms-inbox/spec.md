# Spec Delta

## REMOVED Requirements

### Requirement: Forms aggregates assignments from every source

**Reason**: Sumber Form Pitching berubah dari entri Form menjadi kartu SIMPRO, sehingga daftar gabungan lama tidak lagi menggambarkan seluruh sumber yang ada.

**Migration**: Form proyek, Form Keuangan, dan pekerjaan Prospek RAB/Quotation/Kontrak tetap tampil di Forms; kartu Form Pitching dibuka dari My Tasks dan board Pitching.

## ADDED Requirements

### Requirement: Forms lists project forms and Prospek work

Halaman Forms SHALL menampilkan setiap Form proyek, Form Keuangan, dan pekerjaan Prospek berupa RAB, Quotation, atau Kontrak yang di-assign kepada pengguna, beserta konteks dan status terbarunya. Kartu Form Pitching SHALL NOT tampil di halaman Forms karena dikerjakan pada board Pitching.

#### Scenario: Assigned project form appears

- **WHEN** pengguna di-assign entri Form pada tahap Project
- **THEN** entri tersebut tampil di Forms dengan kategori Project

#### Scenario: Assigned Finance form appears

- **WHEN** Finance di-assign Form Keuangan pada tahap Finance
- **THEN** Form tersebut tampil di Forms dengan jenis Form Keuangan yang sesuai

#### Scenario: Assigned Prospek work appears

- **WHEN** pengguna di-assign RAB, Quotation, atau Kontrak Pitching
- **THEN** pekerjaan tersebut tampil di Forms dengan kategori Prospek

#### Scenario: Pitching form cards are excluded

- **WHEN** pengguna memiliki kartu Form Pitching yang di-assign
- **THEN** kartu tersebut tidak tampil di Forms dan tetap dapat dibuka dari My Tasks atau board Pitching

#### Scenario: Completed assignment remains in Forms

- **WHEN** Form atau pekerjaan Prospek yang pernah di-assign kepada pengguna sudah disubmit atau disetujui
- **THEN** item tersebut tetap tampil di Forms dengan status terbarunya

### Requirement: Reviewers review submitted forms from the Forms menu

PM pemilik dan Admin SHALL dapat menyetujui atau meminta revisi entri Form yang sudah disubmit langsung dari halaman Forms dan tab Forms proyek, dengan komentar revisi wajib, tanpa harus membuka step pada Journey Management.

#### Scenario: Approve from the Forms menu

- **WHEN** PM pemilik atau Admin menyetujui entri Form submitted dari halaman Forms
- **THEN** entri menjadi approved, assignee mendapat notifikasi, dan audit mencatat keputusan review

#### Scenario: Request revision from the Forms menu

- **WHEN** PM pemilik atau Admin meminta revisi entri Form submitted disertai komentar
- **THEN** entri menjadi need revision, komentar tersimpan, dan assignee mendapat notifikasi

#### Scenario: Revision requires a comment

- **WHEN** PM pemilik atau Admin meminta revisi tanpa komentar
- **THEN** sistem menolak aksi dan entri tetap submitted

#### Scenario: Manager cannot review

- **WHEN** Manager membuka entri Form submitted di halaman Forms
- **THEN** aksi review tidak tersedia meskipun ia berhak meng-assign

#### Scenario: Review does not require step navigation

- **WHEN** PM pemilik atau Admin membuka halaman Forms
- **THEN** antrean form submitted yang boleh ia review tampil beserta aksinya tanpa membuka Journey Management

### Requirement: Scheduled forms are excluded from the Forms badge

Form yang berada pada step pending SHALL tampil sebagai terjadwal dan SHALL NOT dihitung pada badge Forms sampai step tersebut aktif.

#### Scenario: Pending-step form is not counted

- **WHEN** pengguna memiliki entri Form terjadwal pada step pending
- **THEN** badge Forms tidak menghitung entri tersebut

#### Scenario: Form becomes actionable when the step activates

- **WHEN** step pending menjadi aktif
- **THEN** entri Form terkait mulai dihitung pada badge Forms sesuai statusnya

#### Scenario: Reviewer queue is not part of the badge

- **WHEN** PM membuka aplikasi dan hanya memiliki form submitted untuk direview
- **THEN** badge Forms tidak menghitung antrean review tersebut
