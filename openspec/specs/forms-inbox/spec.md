# forms-inbox Specification

## Purpose

Menyediakan satu inbox Forms yang menampilkan seluruh penugasan Form dari tahap Prospek, Project, dan Finance kepada pengguna yang menerimanya.

## Requirements

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
