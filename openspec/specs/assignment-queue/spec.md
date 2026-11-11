# assignment-queue Specification

## Purpose

Menyediakan antrean pekerjaan yang belum di-assign kepada Manager dan Admin di My Tasks, sehingga penugasan dapat dilakukan tanpa membuka setiap step atau proyek.

## Requirements

### Requirement: My Tasks shows an assignment queue for Managers and Admins

My Tasks SHALL menampilkan section "Perlu di-assign" untuk Manager dan Admin, berisi kartu task dan entri Form yang belum memiliki assignee pada proyek dan Pitching yang boleh mereka assign.

#### Scenario: Manager opens My Tasks

- **WHEN** Manager membuka My Tasks dan ada kartu Backlog atau entri Form tanpa assignee pada pekerjaan yang boleh ia assign
- **THEN** section "Perlu di-assign" tampil beserta item-item tersebut

#### Scenario: Assignee has no assignment queue

- **WHEN** Assignee, Media, PM, atau Finance membuka My Tasks
- **THEN** section "Perlu di-assign" tidak tampil

#### Scenario: Empty queue

- **WHEN** Manager membuka My Tasks dan tidak ada pekerjaan yang menunggu assignment
- **THEN** sistem menampilkan keterangan bahwa tidak ada pekerjaan untuk di-assign

### Requirement: Queue aggregates every assignable source

Antrean SHALL menggabungkan kartu task Backlog dari step SIMPRO proyek, kartu Form Pitching, dan entri Form proyek yang belum di-assign, serta SHALL menampilkan konteks proyek atau Pitching asalnya.

#### Scenario: Backlog card appears

- **WHEN** sebuah kartu proyek berada di Backlog tanpa assignee
- **THEN** kartu tersebut tampil di antrean dengan nama proyek dan step asalnya

#### Scenario: Pitching card appears

- **WHEN** sebuah kartu Form Pitching belum memiliki assignee
- **THEN** kartu tersebut tampil di antrean dengan nama Prospek dan Pitching asalnya

#### Scenario: Unassigned project form appears

- **WHEN** sebuah entri Form proyek berstatus belum di-assign
- **THEN** entri tersebut tampil di antrean dengan nama proyek dan step Form asalnya

#### Scenario: Already assigned work is excluded

- **WHEN** kartu atau entri Form sudah memiliki assignee
- **THEN** item tersebut tidak lagi tampil di antrean

#### Scenario: Finished work is excluded

- **WHEN** kartu sudah Completed atau diarsipkan, atau entri Form sudah approved atau cancelled
- **THEN** item tersebut tidak tampil di antrean

#### Scenario: Scheduled work is included

- **WHEN** kartu atau entri Form berada pada step pending dan belum memiliki assignee
- **THEN** item tersebut tampil di antrean dengan label terjadwal dan tetap dapat di-assign

### Requirement: Queue respects assignment authority

Antrean SHALL hanya berisi item yang boleh di-assign oleh pengguna yang membukanya, dan SHALL NOT menampilkan item dari proyek atau Pitching yang tidak dapat ia akses.

#### Scenario: Manager sees work from every project

- **WHEN** Manager membuka antrean
- **THEN** item dari seluruh proyek dan Prospek yang dapat ia akses tampil

#### Scenario: Admin sees the same queue as Manager

- **WHEN** Admin membuka antrean
- **THEN** item dari seluruh proyek dan Prospek tampil

#### Scenario: Unassignable item is hidden

- **WHEN** sebuah item tidak boleh di-assign oleh pengguna tersebut menurut aturan proyek atau Prospek
- **THEN** item tersebut tidak tampil di antreannya

### Requirement: Assigning from the queue has the same effects as assigning in context

Assignment dari antrean SHALL memakai aturan, status, notifikasi, dan audit yang sama dengan assignment dari Detail Proyek, Detail Pitching, atau Forms.

#### Scenario: Assign a card from My Tasks

- **WHEN** Manager meng-assign kartu dari antrean kepada Assignee, Media, atau Manager
- **THEN** kartu berpindah ke To Do, penerima mendapat notifikasi, dan riwayat proyek mencatat assignment

#### Scenario: Assign a form entry from My Tasks

- **WHEN** Manager meng-assign entri Form dari antrean
- **THEN** entri menjadi assigned, penerima mendapat notifikasi, dan audit proyek mencatat assignment

#### Scenario: Invalid target is rejected

- **WHEN** pengguna mencoba meng-assign item kepada role yang tidak memenuhi aturan assignment
- **THEN** sistem menolak dan tidak mengubah item

#### Scenario: Scheduled assignment stays scheduled

- **WHEN** Manager meng-assign item yang berada pada step pending
- **THEN** item tetap berstatus terjadwal dan belum dapat dikerjakan sampai step aktif
