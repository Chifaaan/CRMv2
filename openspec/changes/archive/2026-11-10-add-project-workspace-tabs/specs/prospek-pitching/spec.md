# Spec Delta

## ADDED Requirements

### Requirement: Assigned prospek work appears in SIMPRO Forms with a category

Sistem SHALL menampilkan pekerjaan Prospek yang di-assign kepada Assignee, Manager, atau Finance pada halaman Forms SIMPRO dengan kategori **Prospek**, dan Form proyek dengan kategori **Project**.

#### Scenario: Assigned RAB appears in Forms
- **WHEN** RAB Pitching di-assign kepada pengguna
- **THEN** pekerjaan tersebut tampil di Forms SIMPRO dengan kategori Prospek dan tautan untuk membuka pekerjaan

#### Scenario: Assigned quotation appears in Forms
- **WHEN** Quotation Pitching di-assign kepada pengguna
- **THEN** pekerjaan tersebut tampil di Forms SIMPRO dengan kategori Prospek

#### Scenario: Assigned contract appears in Forms
- **WHEN** Kontrak Pitching di-assign kepada pengguna
- **THEN** pekerjaan tersebut tampil di Forms SIMPRO dengan kategori Prospek

#### Scenario: Assigned pitching form appears in Forms
- **WHEN** entri Form Pitching di-assign kepada pengguna
- **THEN** entri tersebut tampil di Forms SIMPRO dengan kategori Prospek

#### Scenario: Project forms use the Project category
- **WHEN** pengguna melihat Form proyek pada halaman Forms SIMPRO
- **THEN** Form tersebut tampil dengan kategori Project
