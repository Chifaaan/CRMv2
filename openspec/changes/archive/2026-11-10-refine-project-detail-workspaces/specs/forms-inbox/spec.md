# Spec Delta

## Purpose

Menyediakan satu inbox Forms yang menampilkan seluruh penugasan Form dari tahap Prospek, Project, dan Finance kepada pengguna yang menerimanya.

## ADDED Requirements

### Requirement: Forms aggregates assignments from every source

Halaman Forms SHALL menampilkan setiap Form yang di-assign kepada pengguna dari tahap Prospek, tahap Project, dan tahap Finance, beserta konteks dan status terbarunya.

#### Scenario: Assigned Prospek form appears

- **WHEN** pengguna di-assign entri Form Pitching pada sebuah Prospek
- **THEN** entri tersebut tampil di Forms dengan kategori Prospek

#### Scenario: Assigned Project form appears

- **WHEN** pengguna di-assign entri Form pada tahap Project
- **THEN** entri tersebut tampil di Forms dengan kategori Project

#### Scenario: Assigned Finance form appears

- **WHEN** Finance di-assign Form Keuangan pada tahap Finance
- **THEN** Form tersebut tampil di Forms dengan jenis Form Keuangan yang sesuai

#### Scenario: Completed assignment remains in Forms

- **WHEN** Form yang pernah di-assign kepada pengguna sudah disubmit atau disetujui
- **THEN** Form tersebut tetap tampil di Forms dengan status terbarunya

### Requirement: Assigned project form entry makes its project visible

Proyek SHALL dianggap terlihat oleh pengguna yang hanya menerima penugasan entri Form pada proyek tersebut, sehingga penugasan itu tidak tersaring keluar dari Forms.

#### Scenario: Assignee with only a form entry

- **WHEN** Assignee hanya di-assign satu entri Form pada sebuah proyek dan tidak memiliki task atau Form Keuangan di proyek itu
- **THEN** proyek tersebut masuk daftar proyek terlihat oleh Assignee dan entri Form-nya tampil di Forms

#### Scenario: Finance with an assigned finance form

- **WHEN** Finance hanya di-assign satu Form Keuangan pada proyek siklus baru
- **THEN** proyek tersebut masuk daftar proyek terlihat oleh Finance dan Form Keuangan tersebut tampil di Forms

### Requirement: Forms visibility follows assignment and existing review rights

Halaman Forms SHALL menampilkan Form yang di-assign kepada pengguna dan SHALL NOT memperlihatkan penugasan milik pengguna lain, kecuali pengguna tersebut berhak mereview Form itu menurut aturan PM/Manager/Admin yang berlaku.

#### Scenario: Unrelated Assignee does not see an assignment

- **WHEN** Assignee membuka Forms
- **THEN** Form milik Assignee lain tidak tampil

#### Scenario: PM reviewer still sees reviewable forms

- **WHEN** PM pemilik proyek membuka Forms
- **THEN** Form proyek yang boleh ia review tetap tampil sesuai aturan review yang berlaku

### Requirement: Managers can assign forms from the Forms menu

Manager dan Admin SHALL dapat meng-assign entri Form yang belum memiliki assignee langsung dari halaman Forms, tanpa membuka Detail Proyek CRM. Penugasan dari Forms SHALL menghasilkan status, notifikasi, dan audit yang sama dengan penugasan dari CRM.

#### Scenario: Assign a project form from Forms
- **WHEN** Manager meng-assign entri Form proyek yang belum memiliki assignee dari halaman Forms
- **THEN** entri tersebut menjadi assigned, penerima mendapat notifikasi, dan audit trail proyek mencatat assignment

#### Scenario: Assign a Prospek form from Forms
- **WHEN** Manager meng-assign entri Form Prospek yang belum memiliki assignee dari halaman Forms
- **THEN** entri tersebut menjadi assigned dan audit Prospek mencatat assignment

#### Scenario: Non-manager cannot assign from Forms
- **WHEN** Assignee atau Finance mencoba meng-assign entri Form dari halaman Forms
- **THEN** kontrol assignment tidak tersedia atau aksi tersebut ditolak
