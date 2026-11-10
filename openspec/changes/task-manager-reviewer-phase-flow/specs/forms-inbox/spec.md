# Spec Delta

## MODIFIED Requirements

### Requirement: Forms rows are scoped by role

Assignee, Manager, and Media users MUST see only work assigned to them. Finance MUST see only finance work assigned to them. PM, Manager, and Admin MUST also see the review queue of the projects they own or administer. A selected reviewer MUST additionally see submitted entries and finance forms they are assigned to review.

#### Scenario: Assignee sees only their entries

- **WHEN** an Assignee opens Forms
- **THEN** only entries assigned to that Assignee are listed

#### Scenario: Media sees only their finance work

- **WHEN** a Media user opens Forms
- **THEN** every RAB, Media Order, BAST, Invoice, and Pembayaran form assigned to them is listed and no unassigned work is shown

#### Scenario: PM sees the review queue

- **WHEN** the owning PM opens Forms
- **THEN** submitted entries of their projects are listed for review

#### Scenario: Reviewer sees their queue

- **WHEN** a Finance or Manager user is selected as reviewer of a submitted form
- **THEN** that form appears in the reviewer's Forms review queue

### Requirement: Finance work opens as a full page

Opening a finance form from Forms MUST open the finance form page for that project and type. Editing MUST be available to the assigned Finance or Media user, the owning PM, and Admin. A selected reviewer MUST be able to open the page and use the review actions.

#### Scenario: Finance opens a RAB from Forms

- **WHEN** the assigned Finance user opens an assigned RAB
- **THEN** the full finance form page opens with editing enabled

#### Scenario: Media opens a RAB from SIMPRO

- **WHEN** a Media user opens a RAB assigned to them from SIMPRO Forms
- **THEN** the finance form page opens with editing enabled

#### Scenario: Media opens a BAST from SIMPRO

- **WHEN** a Media user opens an assigned BAST from SIMPRO Forms
- **THEN** the finance form page opens on the SIMPRO route with editing enabled

#### Scenario: Reviewer opens a submitted form

- **WHEN** the selected reviewer opens the submitted form from Forms
- **THEN** the page opens with the review actions available

#### Scenario: Read-only for other viewers

- **WHEN** a user without edit or review rights opens a finance form
- **THEN** the form opens read-only

### Requirement: Manager can see and assign unassigned forms
Manager dan Admin MUST dapat meng-assign entri Form proyek maupun Form Keuangan yang belum memiliki assignee, baik dari daftar Forms maupun dari halaman form yang dibuka. Manager MUST dapat melihat Form Keuangan pada proyek yang dapat diakses, termasuk yang belum di-assign. Kandidat assignee Form Keuangan MUST mencakup Finance dan Media untuk setiap jenis form.

#### Scenario: Assign a project entry from Forms

- **WHEN** Manager meng-assign entri Form yang belum di-assign dari daftar Forms
- **THEN** entri menjadi assigned, assignee menerima notifikasi, dan baris diperbarui

#### Scenario: Assign a finance form from Forms

- **WHEN** Manager meng-assign Form Keuangan yang belum di-assign dari daftar Forms
- **THEN** form menjadi assigned ke Finance atau Media dan perubahan tercatat

#### Scenario: Assign from the opened finance form

- **WHEN** Manager membuka Form Keuangan tanpa assignee
- **THEN** halaman menampilkan panel Penugasan dengan kandidat Finance dan Media serta tombol Assign

#### Scenario: Manager sees unassigned finance forms

- **WHEN** Manager membuka menu Forms
- **THEN** Form Keuangan yang belum di-assign pada proyek yang dapat diakses ikut tampil

#### Scenario: Media is a BAST candidate

- **WHEN** Manager meng-assign Form RAB, Media Order, BAST, Invoice, atau Pembayaran
- **THEN** Finance dan Media tersedia sebagai kandidat

#### Scenario: Assignee cannot assign

- **WHEN** Assignee, Finance, atau Media membuka form tanpa assignee
- **THEN** tidak ada kontrol penugasan yang ditampilkan

## ADDED Requirements

### Requirement: Form work records an optional reviewer

A project form entry and a finance form MUST accept an optional Reviewer selected by PM, Manager, or Admin. The candidate list MUST contain only users with role PM, Manager, or Finance. Assignee and Media users MUST NOT be reviewer candidates. The selection MUST be audited.

#### Scenario: Set a reviewer on a form entry

- **WHEN** the owning PM creates a form entry and selects a Manager as Reviewer
- **THEN** the entry stores the reviewer and the selection is recorded in project history

#### Scenario: Set a reviewer on a finance form

- **WHEN** a Manager sets a Finance user as Reviewer on a finance form
- **THEN** the finance form stores the reviewer and shows the name on the form page

#### Scenario: Assignee and Media are not reviewer candidates

- **WHEN** the Reviewer dropdown opens
- **THEN** only PM, Manager, and Finance users are listed

### Requirement: Reviewer can decide form reviews

The selected reviewer MUST be able to approve or request revision on the submitted form they review. Admin and the owning PM MUST keep their review rights. Requesting revision MUST still require a comment, and the reviewer MUST NOT be able to edit the submitted content.

#### Scenario: Reviewer approves a form

- **WHEN** the selected reviewer approves a submitted form
- **THEN** the form becomes approved and the decision records the reviewer as the actor

#### Scenario: Reviewer requests revision

- **WHEN** the selected reviewer requests revision with a comment
- **THEN** the form becomes need_revision and the comment is visible to the assignee

#### Scenario: Reviewer cannot edit content

- **WHEN** the selected reviewer opens a submitted form
- **THEN** the form body is read-only and only review actions are offered

#### Scenario: Owning PM keeps review rights

- **WHEN** a reviewer is set and the owning PM opens the submitted form
- **THEN** the PM can still approve or request revision
