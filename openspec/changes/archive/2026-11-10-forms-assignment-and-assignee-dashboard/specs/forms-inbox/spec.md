# Spec Delta

## Purpose

Menyediakan inbox Form Proyek dan Form Keuangan yang dapat dilihat dan di-assign oleh Manager/Admin, termasuk form yang belum memiliki assignee, dari daftar Forms maupun dari halaman form.

## ADDED Requirements

### Requirement: Manager can see and assign unassigned forms
Manager dan Admin MUST dapat meng-assign entri Form proyek maupun Form Keuangan yang belum memiliki assignee, baik dari daftar Forms maupun dari halaman form yang dibuka. Manager MUST dapat melihat Form Keuangan pada proyek yang dapat diakses, termasuk yang belum di-assign. Kandidat assignee Form Keuangan MUST mengikuti jenisnya: RAB/Invoice/Pembayaran hanya Finance, sedangkan BAST dapat Finance atau Media.

#### Scenario: Assign a project entry from Forms
- **WHEN** Manager meng-assign entri Form yang belum di-assign dari daftar Forms
- **THEN** entri menjadi assigned, assignee menerima notifikasi, dan baris diperbarui

#### Scenario: Assign a finance form from Forms
- **WHEN** Manager meng-assign Form Keuangan yang belum di-assign dari daftar Forms
- **THEN** form menjadi assigned ke Finance (atau Media untuk BAST) dan perubahan tercatat

#### Scenario: Assign from the opened finance form
- **WHEN** Manager membuka Form Keuangan tanpa assignee
- **THEN** halaman menampilkan panel Penugasan dengan kandidat sesuai jenis form dan tombol Assign

#### Scenario: Manager sees unassigned finance forms
- **WHEN** Manager membuka menu Forms
- **THEN** Form Keuangan yang belum di-assign pada proyek yang dapat diakses ikut tampil

#### Scenario: Media is a BAST candidate
- **WHEN** Manager meng-assign Form BAST
- **THEN** Finance dan Media tersedia sebagai kandidat

#### Scenario: Assignee cannot assign
- **WHEN** Assignee, Finance, atau Media membuka form tanpa assignee
- **THEN** tidak ada kontrol penugasan yang ditampilkan
