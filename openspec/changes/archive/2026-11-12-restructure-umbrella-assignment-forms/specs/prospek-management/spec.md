# Spec Delta

## MODIFIED Requirements

### Requirement: Prospek access by role

Sistem SHALL membatasi pembuatan dan visibilitas Prospek: PM membuat dan hanya melihat Prospek miliknya, Manager dan Admin melihat semua Prospek, Assignee dan Media tidak memiliki akses ke menu atau halaman Prospek dan hanya membuka pekerjaan yang di-assign melalui My Tasks/Forms, serta Finance tidak memiliki akses Prospek tetapi dapat membuka pekerjaan yang di-assign melalui My Tasks/Forms.

#### Scenario: PM sees only own prospek

- **WHEN** PM membuka daftar Prospek
- **THEN** sistem hanya menampilkan Prospek yang dibuat PM tersebut

#### Scenario: Manager and Admin see all prospek

- **WHEN** Manager atau Admin membuka daftar Prospek
- **THEN** sistem menampilkan seluruh Prospek

#### Scenario: Assignee sees only assigned work

- **WHEN** Assignee membuka My Tasks atau Forms
- **THEN** sistem hanya menampilkan pekerjaan Prospek yang di-assign kepadanya tanpa data Prospek lain

#### Scenario: Media sees only assigned work

- **WHEN** Media membuka My Tasks atau Forms
- **THEN** sistem hanya menampilkan pekerjaan Prospek yang di-assign kepadanya tanpa data Prospek lain

#### Scenario: Assignee has no prospek access

- **WHEN** Assignee mencoba membuka menu atau URL Prospek
- **THEN** sistem menolak akses dan mengarahkan Assignee ke My Tasks atau Forms

#### Scenario: Media has no prospek access

- **WHEN** Media mencoba membuka menu atau URL Prospek
- **THEN** sistem menolak akses dan mengarahkan Media ke My Tasks atau Forms

#### Scenario: Finance has no prospek access

- **WHEN** user role Finance mencoba membuka menu atau URL Prospek
- **THEN** sistem menolak akses sampai Pitching menang dikonversi menjadi anak proyek

#### Scenario: Assigned work is accessible without prospek access

- **WHEN** Assignee, Media, atau Finance di-assign RAB, Quotation, kartu Form Pitching, atau Kontrak
- **THEN** pekerjaan tersebut dapat dibuka dari My Tasks atau Forms/board Pitching tanpa membuka halaman Prospek
