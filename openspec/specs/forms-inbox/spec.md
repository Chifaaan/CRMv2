# forms-inbox Specification

## Purpose

Makes the Forms page the single inbox for every Form assignment a user owns across project form entries and project finance forms, with role-scoped rows, direct assignment for Managers, and a badge that counts only work still to be filled.

## Requirements

### Requirement: Forms is the inbox for all assigned forms

The Forms page MUST list project form entries and project finance forms assigned to the current user. Each row MUST identify its project context and MUST link to where the work is filled.

#### Scenario: Assigned project entry appears
- **WHEN** a project form entry is assigned to a user
- **THEN** the entry appears in that user's Forms page with its project context

#### Scenario: Assigned finance form appears
- **WHEN** a RAB, BAST, Invoice, or Pembayaran form is assigned to a user
- **THEN** the finance form appears in that user's Forms page and opens as a full page

#### Scenario: Unassigned entry is not in the inbox
- **WHEN** a project form entry has no assignee
- **THEN** it is not listed as the user's work, but remains assignable from the Forms page by a Manager or Admin

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
- **THEN** submitted entries of their projects are listed for review

### Requirement: The badge counts only work left to fill

The Forms navigation badge MUST count the forms the current user still has to fill, considering Assigned, Draft, and Need Revision statuses across entries and finance forms. Submitted items awaiting review MUST NOT be counted.

#### Scenario: Badge counts actionable forms
- **WHEN** a user has two assigned, one draft, and one need-revision form
- **THEN** the badge shows four

#### Scenario: Review queue is excluded
- **WHEN** the owning PM has submitted forms waiting for review and no form left to fill
- **THEN** the badge is not increased by the review queue

### Requirement: Managers can assign unassigned entries from Forms

Manager and Admin MUST be able to assign an unassigned project form entry directly from the Forms page using the operational candidates.

#### Scenario: Assign a project entry from Forms
- **WHEN** a Manager assigns an unassigned project entry from Forms
- **THEN** the entry becomes assigned, the assignee is notified, and the row updates in place

#### Scenario: PM assigns to the project Manager
- **WHEN** the owning PM assigns an unassigned entry and the project has a Manager
- **THEN** only that Manager is offered as a candidate

#### Scenario: No candidates for unauthorized roles
- **WHEN** an Assignee, Media, Finance, or PM without a project Manager opens an unassigned entry in Forms
- **THEN** no assignment control is offered

### Requirement: Finance work opens as a full page

Opening a finance form from Forms MUST open the finance form page for that project and type, with editing available to the assigned Finance user, the owning PM, and Admin, and read-only for other viewers. Media MUST be able to open an assigned BAST page from SIMPRO Forms.

#### Scenario: Finance opens a RAB from Forms
- **WHEN** the assigned Finance user opens an assigned RAB
- **THEN** the full finance form page opens with editing enabled

#### Scenario: Media opens a BAST from SIMPRO
- **WHEN** a Media user opens an assigned BAST from SIMPRO Forms
- **THEN** the finance form page opens on the SIMPRO route with editing enabled

#### Scenario: Read-only for other viewers
- **WHEN** a user without edit rights opens a finance form
- **THEN** the form opens read-only

### Requirement: Forms supports filtering without losing scope

The Forms page MUST support search and context filters (project, category, status) that always operate inside the user's permitted scope.

#### Scenario: Filter by context
- **WHEN** a user selects a project filter
- **THEN** only forms for that project remain listed

#### Scenario: Filter by category
- **WHEN** a user selects a form category
- **THEN** only rows of that category remain listed

#### Scenario: Empty filter result
- **WHEN** filters exclude every row
- **THEN** the page shows an empty state instead of an empty table

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
