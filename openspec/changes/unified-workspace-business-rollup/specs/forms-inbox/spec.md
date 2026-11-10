# Spec Delta

## MODIFIED Requirements

### Requirement: Forms is the inbox for all assigned forms

The Forms page MUST list project form entries and project finance forms assigned to the current user, including Media Order. Each row MUST identify its project context and MUST link to where the work is filled.

#### Scenario: Assigned project entry appears

- **WHEN** a project form entry is assigned to a user
- **THEN** the entry appears in that user's Forms page with its project context

#### Scenario: Assigned finance form appears

- **WHEN** a RAB, BAST, Invoice, Pembayaran, or Media Order form is assigned to a user
- **THEN** the finance form appears in that user's Forms page and opens as a full page

#### Scenario: Unassigned entry is not in the inbox

- **WHEN** a project form entry has no assignee
- **THEN** it is not listed as the user's work, but remains assignable from the Forms page by a Manager or Admin

#### Scenario: Assigned Media Order is listed

- **WHEN** a Media Order form is assigned to a Finance user
- **THEN** the row identifies the project, the `Media Order` category, the document count, and opens the MO form page

### Requirement: Forms rows are scoped by role

Assignee, Manager, and Media users MUST see only work assigned to them. Finance MUST see only finance work assigned to them. PM, Manager, and Admin MUST also see the review queue of the projects they own or administer.

#### Scenario: Assignee sees only their entries

- **WHEN** an Assignee opens Forms
- **THEN** only entries assigned to that Assignee are listed

#### Scenario: Media sees only their finance work

- **WHEN** a Media user opens Forms
- **THEN** only the BAST work assigned to them is listed

#### Scenario: PM sees the review queue

- **WHEN** the owning PM opens Forms
- **THEN** submitted entries and submitted Media Orders of their projects are listed for review

#### Scenario: Finance sees assigned Media Orders

- **WHEN** a Media Order is assigned to a Finance user
- **THEN** it appears in that Finance user's Forms list and not in another Finance user's list

### Requirement: Manager can see and assign unassigned forms

Manager dan Admin MUST dapat meng-assign entri Form proyek maupun Form Keuangan yang belum memiliki assignee, baik dari daftar Forms maupun dari halaman form yang dibuka. Manager MUST dapat melihat Form Keuangan pada proyek yang dapat diakses, termasuk yang belum di-assign. Kandidat assignee Form Keuangan MUST mengikuti jenisnya: RAB/Invoice/Pembayaran/MO hanya Finance, sedangkan BAST dapat Finance atau Media.

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

#### Scenario: Media Order is assignable to Finance

- **WHEN** Manager membuka Media Order tanpa assignee
- **THEN** Finance tersedia sebagai kandidat dan Media tidak ditawarkan

## ADDED Requirements

### Requirement: Media Order opens as a full-page finance form

Opening a Media Order from Forms MUST open the project's Media Order finance form page. The page MUST list every MO document of the project with its items, totals, status, and business-unit mapping, and MUST let an authorized user create, edit, and delete documents while the project is active. Assignee, Media, and BOD MUST NOT edit an MO from this page.

#### Scenario: Finance opens Media Order from Forms

- **WHEN** the assigned Finance user opens an assigned Media Order row
- **THEN** the Media Order form page opens with the project's documents and editing enabled

#### Scenario: PM opens the MO form page

- **WHEN** the owning PM opens the current Prospek Media Order step
- **THEN** the Media Order form page opens with the project's documents and editing enabled

#### Scenario: Media Order page is read-only for other viewers

- **WHEN** a user without edit rights opens the Media Order form page
- **THEN** the documents and items are visible without create, edit, or delete actions

#### Scenario: BOD reads MO from Business

- **WHEN** BOD opens an MO detail from the Business table
- **THEN** the documents and items are shown read-only without the CRM editing surface
