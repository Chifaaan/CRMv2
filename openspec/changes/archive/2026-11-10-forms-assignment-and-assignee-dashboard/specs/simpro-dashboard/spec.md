# Spec Delta

## Purpose

Menyediakan dashboard SIMPRO untuk Assignee dan Media yang merangkum proyek, task, progress, dan deadline yang relevan dengan pekerjaan mereka.

## ADDED Requirements

### Requirement: SIMPRO dashboard for assignees

SIMPRO MUST menyediakan dashboard yang menampilkan sapaan dan tanggal hari ini, kartu Total proyek, Klien, Anggota tim, dan Total task, Distribusi task per status, Progress overview (Completed, Open, Overdue, persentase), Task saya, Recent projects, dan Upcoming deadlines. Untuk Assignee dan Media, seluruh data task MUST dibatasi pada task yang di-assign kepada mereka dan proyek yang dapat mereka akses.

#### Scenario: Assignee opens the dashboard
- **WHEN** Assignee membuka menu Dashboard SIMPRO
- **THEN** dashboard menampilkan kartu ringkasan, distribusi status task, progress, task miliknya, proyek terbaru, dan deadline terdekat

#### Scenario: Task data is scoped
- **WHEN** Assignee memiliki task yang di-assign
- **THEN** distribusi dan progress hanya menghitung task tersebut

#### Scenario: Empty assigned work
- **WHEN** Assignee tidak memiliki task aktif
- **THEN** panel Task saya menampilkan empty state "Tidak ada task aktif"

#### Scenario: Media uses the same dashboard
- **WHEN** Media membuka Dashboard SIMPRO
- **THEN** data task dibatasi pada task miliknya

#### Scenario: Dashboard is the SIMPRO dashboard route
- **WHEN** pengguna SIMPRO membuka menu Dashboard
- **THEN** route `/dashboard` menampilkan dashboard SIMPRO, bukan pengalihan ke CRM
