# MVP — CRM × SIMPRO Prototype

| Field | Value |
|---|---|
| Status | Implemented (prototype) |
| Versi | 1.1 |
| Tanggal | 1 November 2026 |
| PRD | [`PRD.md`](./PRD.md) |
| Referensi visual | `Docs/References/` |

> Implementasi ada di `src`. Lihat `AGENTS.md` untuk perintah dan struktur file. Catatan: `npm run lint` di-scope ke kode prototype; `npm run lint:all` masih memuat layar legacy SIMPRO yang disembunyikan.

---

## 1. Tujuan MVP

MVP adalah versi terkecil yang bisa mendemonstrasikan **satu proyek berjalan dari Planning sampai Finance** di dalam satu aplikasi monolith, dengan dua modul yang saling melengkapi:

- **CRM** mengatur journey, gate, pitching, Survey, RAB, BAST, Invoice, group, dan workload.
- **SIMPRO** mengatur task card, assignment, status, review, checklist, komentar, dan lampiran.

MVP harus bisa didemokan tanpa backend, tanpa login, dan tanpa integrasi nyata ke SIMPROv2.

---

## 2. Definisi "MVP selesai"

MVP dianggap selesai jika:

1. Satu proyek baru bisa dibuat dan melewati 6 step sampai `completed`.
2. Pitching bisa menghasilkan task, ditugaskan, dikerjakan, direview, dan diputuskan menang/kalah.
3. Survey bisa diisi Assignee di SIMPRO, direview PM, dan terlihat di CRM.
4. RAB bisa diisi Finance di CRM, direview PM, dan terlihat read-only di SIMPRO.
5. Running bisa dijalankan di board 6 kolom dengan aturan transisi role.
6. BAST dan Invoice bisa diisi paralel oleh Finance, dan PM bisa menutup proyek setelah keduanya `submitted`.
7. Group dan workload menampilkan rollup yang benar.
8. Notification bell dan activity log berfungsi.
9. Semua role hanya melihat dan melakukan aksi yang diizinkan.
10. Tampilan konsisten dengan screenshot SIMPRO di `Docs/References/`.
11. `npm run build` dan `npm run lint` lulus.
12. Tombol reset mengembalikan seed data awal.

---

## 3. Scope

### 3.1 P0 — wajib untuk MVP

**Fondasi**

- Memakai root repo yang sudah ada sebagai basis: Next.js 16, React 18, TypeScript, Tailwind 4, shadcn base-nova.
- Reuse shell: `Sidebar`, `Topbar`, `MobileNav`, `NotificationBell`, komponen `src/components/ui`.
- App shell: module switcher CRM | SIMPRO, role switcher lokal, notification bell.
- Seed data + reset.
- Penyimpanan: `localStorage` + IndexedDB untuk file.
- Domain layer untuk permission, gate, progress, dan transisi status.
- Unit test untuk fungsi domain inti (Vitest ditambahkan di M1).

**CRM**

- Dashboard.
- Projects: list, search, filter, create, edit, cancel.
- Project detail: header, 6-step stepper, Journey %, Work %, data availability badges.
- Pitching: create/edit, roles, requested assignee, win/lose, history, gate.
- Survey: read-only mirror + link ke SIMPRO.
- RAB: form, line items, total, review.
- Running: read-only mirror + gate.
- Finance: BAST + Invoice paralel, manual + Excel import, PM close.
- Groups: list, create/edit, members, rollup, completion.
- Workload: active task count per assignee.
- Notifications + activity log.
- Riwayat proyek: audit trail append-only + stepper tab + timeline per step + backfill.

**SIMPRO**

- Dashboard.
- Projects list.
- Project detail: Overview, Board, Backlog, RAB read-only, Forms.
- Board 6 kolom untuk step aktif.
- Backlog table.
- My Tasks: Board, List, Swimlane.
- Forms menu untuk Survey.
- Card dialog: status, assignee, priority, due date, checklist, comments, attachments, activity.
- Drag-and-drop dengan validasi role.
- Task create (PM/Admin), assign (Manager/Admin), work (Assignee), review (PM/Admin).
- Task delete (PM/Admin, soft delete).

**Lintas modul**

- Satu sumber data untuk proyek, task, form, group, notifikasi.
- Role-based visibility.
- Activity log.
- Reset data.

### 3.2 P1 — setelah MVP

- Survey multi-kunjungan.
- Import Excel RAB.
- Bulk import BAST/Invoice lintas proyek.
- PM boleh assign task.
- Workload berbasis poin/kapasitas.
- Skip step dengan alasan.
- BAST/Invoice reject/revision loop.
- Nested group.
- Export CSV backlog.
- Gantt/timeline dashboard.
- Search global.
- Komentar di form finance.
- Attachment pada komentar.

### 3.3 P2 — di luar prototype

- Backend, database, auth, SSO.
- Integrasi API/DB SIMPROv2.
- Multi-tenant dan user management produksi.
- Portal klien.
- Email/WhatsApp/push.
- PDF BAST/Invoice, e-signature, payment tracking.
- Audit trail produksi berbasis DB/immutable storage.
- Mobile app.
- Multi-currency dan otomatisasi pajak.

---

## 4. User stories dan acceptance criteria

### US-01 — PM membuat proyek

**Sebagai** PM, **saya ingin** membuat proyek dengan data dasar dan melihat 6 step, **agar** proyek punya journey yang jelas.

Acceptance:

- Form berisi nama, klien, deskripsi, prioritas, tanggal mulai, target selesai, dan cover color.
- Kode proyek dibuat otomatis dan unik.
- Setelah dibuat, step Pitching langsung `active`; step lain `pending`.
- PM hanya melihat proyek yang ia buat.
- Manager/Admin melihat proyek tersebut di daftar.

### US-02 — Pitching dan handoff task

**Sebagai** PM, **saya ingin** membuat beberapa pitching dengan role, **agar** pekerjaan pitching masuk ke SIMPRO.

Acceptance:

- PM dapat menambah pitching tanpa batas.
- Setiap role dengan requested assignee menghasilkan task `Backlog`.
- Task menampilkan judul `[Pitching] Role` dan requested assignee.
- Manager dapat meng-assign task; status menjadi `To Do`.
- PM dapat menandai pitching `won` atau `lost`.
- Pitching `lost` dan task-nya masuk riwayat read-only; task tidak dihitung.
- Minimal satu `won` diperlukan untuk lanjut.
- Semua task pitching `won` harus `Completed` sebelum step selesai.
- Multiple winners diperbolehkan.
- Jika semua kalah, PM dapat membatalkan proyek.

### US-03 — Survey

**Sebagai** Assignee, **saya ingin** mengisi form Survey dengan foto, **agar** hasil lapangan tercatat.

Acceptance:

- Form Survey dibuat otomatis saat step Survey aktif.
- Manager dapat assign form ke Assignee.
- Assignee melihat form di menu Forms SIMPRO.
- Form berisi tanggal, lokasi, PIC, temuan, kesimpulan, dan minimal 1 foto.
- Assignee dapat menyimpan draft dan submit.
- PM dapat approve atau need revision dengan komentar.
- Setelah approved, form terkunci.
- CRM menampilkan status, ringkasan, jumlah foto, dan tautan ke SIMPRO.
- Form tidak muncul di board, My Tasks, workload, atau task progress.

### US-04 — RAB

**Sebagai** Finance, **saya ingin** mengisi RAB, **agar** nilai proyek tercatat sebelum Running.

Acceptance:

- Form RAB dibuat otomatis saat step RAB aktif.
- Manager dapat assign form ke Finance.
- Finance dapat menambah/edit/hapus item pekerjaan.
- Total RAB dihitung otomatis.
- Finance dapat menyimpan draft dan submit.
- PM dapat approve atau need revision dengan komentar.
- Setelah approved, form terkunci.
- SIMPRO menampilkan RAB read-only.
- Form tidak muncul di board, My Tasks, workload, atau task progress.

### US-05 — Running board

**Sebagai** PM, **saya ingin** membuat task Running dan memantaunya, **agar** eksekusi terkontrol.

Acceptance:

- Board hanya menampilkan task step aktif.
- PM/Admin dapat membuat task; task masuk `Backlog`.
- Task tanpa assignee tidak bisa keluar dari `Backlog`.
- Manager/Admin dapat assign; status menjadi `To Do`.
- Assignee dapat `To Do → In Progress → Awaiting Approval`.
- PM/Admin dapat `Awaiting Approval → Completed` atau `Need Revision` dengan komentar.
- Assignee dapat `Need Revision → In Progress`.
- Drag/drop yang tidak valid ditolak dengan alasan.
- CRM menampilkan mirror read-only.
- Step Running hanya bisa selesai jika tidak ada task aktif.

### US-06 — BAST dan Invoice

**Sebagai** Finance, **saya ingin** mengisi BAST dan Invoice secara paralel, **agar** proyek bisa ditutup.

Acceptance:

- Form BAST dan Invoice dibuat otomatis saat fase Finance aktif.
- Manager dapat assign masing-masing ke Finance.
- Finance dapat mengisi manual atau import satu baris Excel.
- BAST dan Invoice dapat disubmit dalam urutan apa pun.
- PM melihat status keduanya.
- PM tidak dapat reject; Finance dapat edit sampai proyek completed.
- Tombol Selesaikan Proyek hanya aktif jika keduanya `submitted` dan step sebelumnya selesai.
- Setelah proyek completed, form terkunci dan group rollup diperbarui.

### US-07 — Group

**Sebagai** Manager, **saya ingin** mengelompokkan proyek, **agar** program yang terdiri dari beberapa proyek bisa dipantau.

Acceptance:

- Group minimal 2 proyek.
- Satu proyek hanya di satu group.
- Manager/Admin dapat membuat, mengedit, menambah/menghapus anggota, dan membubarkan.
- PM hanya melihat group yang berisi proyeknya.
- Group progress = proporsi proyek completed terhadap total proyek non-cancelled.
- Group selesai jika semua proyek non-cancelled completed.
- Proyek cancelled tidak menghalangi.
- Proyek individual tetap bisa selesai sendiri.

### US-08 — Workload

**Sebagai** Manager, **saya ingin** melihat beban assignee, **agar** assignment lebih merata.

Acceptance:

- Workload hanya menghitung task card dengan status `To Do`, `In Progress`, `Awaiting Approval`, `Need Revision`.
- Backlog, Completed, archived, dan StepForm tidak dihitung.
- Menampilkan jumlah, breakdown status/prioritas, proyek, dan overdue.
- Hanya Manager/Admin yang dapat melihat.
- Tidak ada kapasitas/poin.

### US-09 — Notifikasi dan activity log

**Sebagai** user, **saya ingin** mendapat notifikasi dan melihat riwayat, **agar** tidak melewatkan pekerjaan.

Acceptance:

- Bell menampilkan notifikasi user aktif.
- Unread badge dan mark as read.
- Event assign, submit, revision, complete, step selesai, form submit, proyek selesai/cancelled.
- Activity log tercatat di card dan project detail.
- Tidak ada email/push.

### US-10 — Role visibility

**Sebagai** admin, **saya ingin** setiap role hanya melihat data yang berhak, **agar** batas tanggung jawab jelas.

Acceptance:

- PM hanya melihat proyek miliknya.
- Manager melihat semua proyek, tetapi tidak review task.
- Finance melihat semua proyek read-only, dan hanya mengedit form finance yang di-assign.
- Assignee hanya melihat SIMPRO dan task/form yang di-assign.
- Admin melihat semua.
- Role switcher mengubah visibilitas secara langsung.

### US-11 — Reset demo

**Sebagai** demo presenter, **saya ingin** mereset data, **agar** demo berikutnya konsisten.

Acceptance:

- Tombol reset memberi konfirmasi.
- Reset mengembalikan seed dan menghapus file di IndexedDB.
- Seed version tercatat; seed lama tidak dipakai setelah versi berubah.

---

## 5. Screen inventory dan route

Gunakan route SIMPRO yang sudah ada di `src/app/(main)`. Jangan membuat prefix `/simpro`.

| Modul | Screen | Route | Role utama |
|---|---|---|---|
| Shell | App shell | semua | semua |
| CRM | Dashboard | `/crm` | Admin, Manager, PM, Finance |
| CRM | Projects | `/crm/projects` | Admin, Manager, PM, Finance |
| CRM | Project detail | `/crm/projects/[id]` | Admin, Manager, PM, Finance |
| CRM | Groups | `/crm/groups` | Admin, Manager, PM (read), Finance (read) |
| CRM | Workload | `/crm/workload` | Admin, Manager |
| SIMPRO | Dashboard | `/dashboard` | Admin, Manager, PM, Assignee |
| SIMPRO | Projects | `/projects` | Admin, Manager, PM, Assignee |
| SIMPRO | Project overview | `/projects/[id]` | Admin, Manager, PM, Assignee |
| SIMPRO | Board | `/projects/[id]/board` | Admin, Manager, PM, Assignee |
| SIMPRO | Backlog | `/projects/[id]/backlog` | Admin, Manager, PM |
| SIMPRO | RAB read-only | `/projects/[id]/rab` | Admin, Manager, PM |
| SIMPRO | Forms tab | `/projects/[id]/forms` | Admin, Manager, PM, Assignee |
| SIMPRO | My Tasks Board | `/my-tasks` (toggle Board) | Admin, PM, Assignee |
| SIMPRO | My Tasks List | `/my-tasks` (toggle List) | Admin, PM, Assignee |
| SIMPRO | My Tasks Swimlane | `/my-tasks` (toggle Swimlane) | Admin, PM, Assignee |
| SIMPRO | Forms | `/forms` | Admin, Manager, PM, Assignee |
| Global | Notification drawer | — | semua |
| Modal | Create/Edit Project | — | Admin, PM |
| Modal | Pitching | — | Admin, PM |
| Modal | Assign Form/Task | — | Admin, Manager |
| Modal | Card Dialog | — | sesuai akses |
| Modal | Excel Import | — | Admin, Finance |
| Modal | Group | — | Admin, Manager |
| Modal | Reset Confirm | — | semua |

### 5.1 Landing per role

| Role | Landing |
|---|---|
| Admin | `/crm` |
| Manager | `/crm` |
| PM | `/crm` |
| Finance | `/crm` |
| Assignee | `/my-tasks` |

### 5.2 Module switcher

- Admin, Manager, PM: CRM dan SIMPRO.
- Finance: CRM saja.
- Assignee: SIMPRO saja.

---

## 6. Seed data

### 6.1 Users

| Nama | Role | Catatan |
|---|---|---|
| Admin Utama | `admin` | Semua akses. |
| Rina Prameswari | `manager` | Assign, group, workload. |
| Nur Irfan | `pm` | Pemilik LEMMIC, RESEAR, CDNv2. |
| Yohan Kinata | `pm` | Pemilik ALERT, POSRV, SIMPLE. |
| Eugene | `assignee` | Task dan Survey. |
| Sigit Wijayanto | `assignee` | Task dan Survey. |
| Andi Jamero | `assignee` | Task dan Survey. |
| Maya Sari | `finance` | RAB, BAST, Invoice. |

### 6.2 Projects

| Kode | Nama | Fase | Kondisi seed |
|---|---|---|---|
| `LEMMIC` | Connector Member System | Planning / Pitching | 5 pitching: 2 won, 3 lost; task bervariasi. |
| `RESEAR` | Research SYS | Planning / Survey | Form Survey submitted, 3 foto, menunggu review. |
| `CDNv2` | CDNv2 Automation | Planning / RAB | RAB submitted, total Rp 125.000.000. |
| `ALERT` | Alert Prototype | Running | 8 task tersebar di 6 status. |
| `POSRV` | POS Revamp | Finance | BAST submitted, Invoice draft. |
| `SIMPLE` | SIMPRO Mobile | Completed | Semua step dan form selesai. |
| `OLDPRO` | Legacy Portal | Cancelled | Contoh proyek cancelled. |

### 6.3 Group

| Nama | Anggota | Status seed |
|---|---|---|
| `Q4 Enterprise` | RESEAR, CDNv2, ALERT | Active; rollup dari 3 proyek. |

### 6.4 Task seed

Minimal mencakup:

- Pitching task `Backlog` dengan requested assignee.
- Pitching task `To Do`, `In Progress`, `Awaiting Approval`, `Completed`.
- Running task di semua 6 status.
- Task overdue untuk menguji workload.
- Task dengan checklist, komentar, dan attachment contoh.

### 6.5 Form seed

- Survey `submitted` dengan foto.
- RAB `submitted` dengan beberapa item.
- BAST `submitted`.
- Invoice `draft`.
- Form `approved` untuk proyek completed.

### 6.6 Notification seed

- Beberapa notifikasi unread untuk PM, Manager, Finance, dan Assignee.
- Activity log pada task dan proyek contoh.

### 6.7 Reset

- Tombol reset di sidebar.
- Konfirmasi dialog.
- Menghapus `localStorage` key aplikasi dan seluruh object di IndexedDB.
- Memuat ulang seed.
- Seed version disimpan; jika versi berubah, data lama dianggap tidak kompatibel dan diganti.

---

## 7. Technical plan

### 7.1 Stack

Gunakan stack yang sudah terpasang di root repo:

| Kebutuhan | Pilihan |
|---|---|
| Framework | Next.js 16 (App Router) + React 18 + TypeScript |
| Styling | Tailwind CSS 4 + shadcn `base-nova` |
| State | Zustand |
| Data fetching | TanStack Query (dipertahankan untuk adapter lokal; API nyata dilepas) |
| File storage | IndexedDB (tambahkan `idb-keyval`) |
| Drag/drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Excel | `xlsx` (SheetJS) |
| Icons | `lucide-react` |
| Date | `date-fns` |
| Toast | `sonner` |
| Test | Vitest (ditambahkan di M1) |
| Package manager | npm |

**Aturan adaptasi:** jangan scaffold aplikasi baru. Mulai dari root repo, pertahankan visual dan komponennya, lalu:
- ganti auth/session server dengan role switcher lokal;
- ganti panggilan API/react-query dengan adapter ke store prototype;
- konfigurasi board menjadi 6 status, bukan 8 + parking lot;
- sembunyikan menu/tab yang tidak dipakai;
- tambahkan route CRM di `/crm`.

### 7.2 Struktur folder

Basis: `src`.

```
src/app/
  layout.tsx                  # font Inter + provider (dipertahankan)
  (main)/
    layout.tsx                # shell; auth diganti role switcher
    dashboard/                # SIMPRO, dipakai ulang
    projects/                 # SIMPRO, dipakai ulang
      [id]/
        page.tsx              # overview
        board/
        backlog/
        rab/                  # read-only
        forms/                # baru: Survey
    my-tasks/                 # SIMPRO, dipakai ulang
    forms/                    # baru: daftar StepForm
    crm/                      # baru
      page.tsx
      projects/
        page.tsx
        [id]/page.tsx
      groups/page.tsx
      workload/page.tsx
src/components/
  layout/                     # Sidebar, Topbar, MobileNav, NotificationBell
  ui/                         # shadcn base-nova
  features/
    board/                    # dipakai ulang; konfigurasi 6 status
    tasks/                    # task sheets/dialog
    projects/                 # project form/modal
    crm/                      # baru: pitching, forms, groups, workload
src/lib/
  domain/                     # baru: permissions, gates, progress, transitions
  store/                      # baru: prototype store + seed + persistence
  files.ts                    # baru: IndexedDB
  excel.ts                    # baru: BAST/Invoice import
  types.ts                    # baru/shared
tests/               # Vitest, ditambahkan di M1
```

### 7.3 State

`AppState` berisi:

- `users`
- `currentUserId`
- `projects`
- `projectSteps`
- `pitchings`
- `pitchingRoles`
- `tasks`
- `checklistItems`
- `comments`
- `attachments` (metadata)
- `stepForms`
- `surveyPhotos` (metadata)
- `groups`
- `notifications`
- `activityLogs`
- `seedVersion`

Aturan:

- Semua ID memakai `crypto.randomUUID()`.
- Semua tanggal disimpan ISO string.
- File binary tidak masuk state; hanya metadata + `storageKey`.
- `localStorage` key: `crm-simpro:v1`.
- IndexedDB menyimpan file dengan key `storageKey`.
- Reset menghapus keduanya.

### 7.4 Domain layer

Fungsi murni yang wajib diuji:

- `canViewProject(user, project)`
- `canAssignTask(user, task)`
- `canTransitionTask(user, task, to)`
- `canReviewTask(user, project)`
- `canAssignForm(user, form)`
- `canEditForm(user, form)`
- `canReviewForm(user, form)`
- `evaluateStepGate(project, step)`
- `calculateJourneyProgress(project)`
- `calculateWorkProgress(project, step)`
- `calculateGroupProgress(group, projects)`
- `isTaskActive(status)`
- `isTaskOverdue(task, now)`
- `validateBastImport(row)`
- `validateInvoiceImport(row)`

### 7.5 Routing dan guard

- `/` redirect berdasarkan role.
- Guard per modul:
  - Finance tidak boleh membuka route SIMPRO (`/dashboard`, `/projects`, `/my-tasks`, `/forms`).
  - Assignee tidak boleh membuka `/crm/*`.
- Guard per entity:
  - PM hanya membuka proyek miliknya.
  - Assignee hanya membuka proyek/task/form yang di-assign.
- Jika ditolak, tampilkan halaman 403 yang ramah, bukan crash.

### 7.6 File dan foto

- Survey: JPG/PNG/WebP, maks 5 MB per file, maks 10 foto.
- Attachment task: maks 5 file, 5 MB per file.
- Simpan binary di IndexedDB; metadata di state.
- Tampilkan nama, ukuran, dan tombol hapus.
- Saat reset, hapus semua key file.

### 7.7 Excel import

- Gunakan `xlsx` untuk membaca `.xlsx`/`.csv`.
- Template diunduh dari dialog.
- Preview baris yang terbaca.
- Validasi:
  - project_code cocok dengan proyek aktif,
  - field wajib tidak kosong,
  - tanggal valid,
  - nominal numerik.
- Jika valid, isi form; user tetap harus submit.
- Jika ada error, tampilkan pesan per baris dan jangan simpan.

### 7.8 UI

- Ikuti design token dan layout di PRD §12.
- Gunakan komponen `src/components/ui` (shadcn base-nova) dan shell `src/components/layout`; jangan membuat design system kedua.
- Reuse dashboard, projects, project detail, board, backlog, RAB, dan my-tasks dari root repo.
- Chart dashboard memakai komponen/recharts yang sudah ada atau SVG/CSS sederhana; jangan menambah library chart baru.
- Modal lebar untuk card dialog dan form.
- Semua aksi destruktif memakai konfirmasi.
- Drop kanban yang ditolak menampilkan toast alasan.

### 7.9 Testing

- Unit test domain: gate, progress, permission, transisi.
- Smoke test manual per role.
- Tidak perlu E2E otomatis di MVP, tetapi alur demo harus diuji manual.
- Build dan lint wajib lulus.

---

## 8. Implementation milestones

Setiap milestone harus meninggalkan aplikasi dalam keadaan bisa dijalankan.

### M0 — Adaptasi root repo dan shell

- Jalankan root repo sebagai basis; jangan scaffold aplikasi baru.
- Ganti auth/session server dengan role switcher lokal. Pertahankan bentuk `useSession`/`authClient` lewat shim demo agar komponen frontend yang sudah ada tidak perlu ditulis ulang.
- Ganti panggilan `@/lib/api/client`/react-query pada layar SIMPRO yang dipakai dengan adapter store lokal (boleh bertahap per layar).
- Pertahankan `Sidebar`, `Topbar`, `MobileNav`, `NotificationBell`, dan komponen `src/components/ui`.
- Sembunyikan menu/tab frontend yang tidak dipakai.
- Tambahkan module switcher CRM | SIMPRO.
- Seed data + reset.
- Tambahkan route CRM kosong dan route `/forms`.
- Pastikan build/lint tetap lulus setelah adaptasi.

### M1 — Domain dan store

- Types.
- Zustand store + persist.
- Permission, gate, progress, task machine, form machine.
- Unit test domain.
- Guard route.

### M2 — CRM projects

- CRM dashboard.
- Projects list, search, filter.
- Create/edit project.
- Project detail header + stepper.
- Cancel project.

### M3 — Pitching + task handoff

- Pitching CRUD.
- Pitching roles + requested assignee.
- Generate task Backlog.
- SIMPRO board + backlog.
- Card dialog dasar.
- Assign task.
- Task transitions.
- Pitching win/lose + history.
- Gate Pitching.

### M4 — Survey

- Form Survey di SIMPRO.
- Assign ke Assignee.
- Form fields + photo upload.
- Draft/submit.
- Review PM.
- Mirror CRM.
- Gate Survey.

### M5 — RAB

- Form RAB di CRM.
- Assign ke Finance.
- Line items + total.
- Draft/submit.
- Review PM.
- Mirror SIMPRO.
- Gate RAB.

### M6 — Running

- Board 6 kolom untuk step aktif.
- Drag/drop + permission.
- Card dialog lengkap: checklist, komentar, attachment, activity.
- CRM mirror.
- Gate Running.

### M7 — Finance

- Form BAST + Invoice.
- Assign ke Finance.
- Manual entry.
- Excel import + template.
- Status draft/submitted.
- PM completeness check.
- Selesaikan Proyek.
- Group rollup trigger.

### M8 — Groups + workload

- Group CRUD.
- Member management.
- Group progress + completion.
- Workload page.
- Filter proyek.

### M9 — Notifications + activity

- Notification store + bell.
- Event hooks dari aksi.
- Mark read/all.
- Activity log di card dan project.
- Seed notifikasi.

### M10 — Polish + QA

- Visual check terhadap `Docs/References/`.
- Empty states, loading, error states.
- Responsive 1024px.
- Manual test matrix.
- Build + lint + test.
- Demo script rehearsal.

---

## 9. Verification plan

### 9.1 Automated

Jalankan dari root repo:

```bash
npm install
npm run build
npm run lint
```

`package.json` saat ini belum punya script `test`. Setelah Vitest ditambahkan di M1, tambahkan `npm test` ke script dan ke `AGENTS.md`.

Test domain minimum (setelah Vitest tersedia):

- Task transition valid/invalid per role.
- Gate Pitching: no winner, all lost, winning task active, all winning tasks completed.
- Gate Running: active statuses block; completed doesn't.
- Journey %: 0%, 50%, 90%, 100%.
- Work %: task and form variants.
- Group %: completed / non-cancelled; cancelled excluded.
- Visibility: PM vs Manager vs Finance vs Assignee.
- Excel validation: valid row, missing field, wrong project code, invalid date, invalid amount.
- Workload: exclude Backlog/Completed/form; include active statuses.

### 9.2 Manual test matrix

| Skenario | Role | Hasil |
|---|---|---|
| Buat proyek | PM | Proyek muncul; step Pitching aktif. |
| Lihat proyek PM lain | PM | Tidak terlihat / 403. |
| Assign task | Manager | Backlog → To Do. |
| Assign task sebagai PM | PM | Ditolak. |
| Kerjakan task | Assignee | To Do → In Progress → Awaiting Approval. |
| Review task | PM | Completed / Need Revision. |
| Review task sebagai Manager | Manager | Ditolak. |
| Isi Survey | Assignee | Submit + foto. |
| Review Survey | PM | Approve / Need Revision. |
| Isi RAB | Finance | Submit + total. |
| Review RAB | PM | Approve / Need Revision. |
| Isi BAST/Invoice | Finance | Paralel, submit. |
| Tutup proyek | PM | Hanya jika BAST + Invoice submitted. |
| Kelola group | Manager | Tambah/hapus anggota, rollup. |
| Lihat workload | Manager | Count benar; form tidak dihitung. |
| Reset | Semua | Seed kembali. |
| Reload browser | Semua | Data dan file persist. |

### 9.3 Visual check

- Bandingkan dengan screenshot:
  - layout sidebar/topbar,
  - project card,
  - project header,
  - board columns,
  - card dialog,
  - My Tasks board/swimlane,
  - dashboard widgets.
- Konsistensi status color, priority pill, phase pill, spacing, radius, typography.

---

## 10. Demo script (10 menit)

1. **PM** — buka `LEMMIC` di CRM. Tunjukkan 5 pitching, 2 menang, 3 kalah, dan riwayat pitching kalah.
2. **Manager** — assign task pitching dari Backlog ke To Do.
3. **Assignee** — buka SIMPRO, kerjakan task, ajukan Awaiting Approval.
4. **PM** — review task menjadi Completed.
5. **PM** — selesaikan step Pitching; lanjut Survey.
6. **Manager** — assign Survey ke Assignee; **Assignee** isi form + foto; **PM** review approve; selesaikan step.
7. **Manager** — assign RAB ke Finance; **Finance** isi RAB; **PM** review approve; selesaikan step.
8. **PM** — buat task Running; **Manager** assign; **Assignee** kerjakan; **PM** review; selesaikan step.
9. **Manager** — assign BAST + Invoice ke Finance; **Finance** isi BAST manual dan Invoice via Excel; **PM** lihat keduanya submitted lalu Selesaikan Proyek.
10. Tunjukkan:
    - header proyek dengan badge data,
    - group `Q4 Enterprise` dan rollup,
    - workload Manager,
    - notification bell,
    - activity log.
11. **Reset data demo**.

---

## 11. Risiko dan batasan MVP

| Batasan | Konsekuensi |
|---|---|
| Tanpa backend | Data hanya di satu browser; tidak multi-user nyata. |
| Tanpa auth | Role switcher hanya untuk demo. |
| localStorage/IndexedDB | Kuota terbatas; data hilang jika storage dibersihkan. |
| StepForm bukan Task | Form tidak masuk workload/task progress; memakai Form %. |
| Semua step wajib | Proyek tanpa Pitching/Survey harus dibatalkan. |
| Workload count | Tidak membedakan task sulit/mudah. |
| Tanpa reject BAST/Invoice | PM hanya bisa menahan penutupan proyek. |
| Multiple winners | Tidak ada branching proyek; tetap satu Survey. |
| SIMPRO simulasi | Bukan integrasi ke SIMPROv2. |
| Gantt/timeline | Tidak termasuk MVP. |
| Mobile | Tidak dioptimalkan. |

---

## 12. Next steps

1. Validasi PRD + MVP dengan calon user (PM, Manager, Finance, Assignee).
2. Konfirmasi apakah P1 perlu masuk sebelum demo.
3. Implementasi M0–M10.
4. Setelah prototype disetujui, putuskan arsitektur produksi:
   - integrasi ke SIMPROv2 (DB/API),
   - auth/SSO,
   - Postgres + audit trail,
   - file storage,
   - notifikasi,
   - deployment.
5. Perbarui `AGENTS.md` dengan perintah build/test yang final setelah scaffold.
