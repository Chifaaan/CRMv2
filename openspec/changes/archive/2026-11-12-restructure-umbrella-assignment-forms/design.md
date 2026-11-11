# Design

## Context

Lihat `proposal.md` untuk motivasi dan delta spec untuk kontrak perilaku. Kondisi teknis yang membentuk desain ini:

- Semua state ada di Zustand dengan `persist` versi 9 (`src/lib/prototype/store.ts:5167`) dan `migratePersistedState` idempoten (`store.ts:774`). Tidak ada backend.
- `Task` sudah memiliki `pitchingId?`, tetapi `projectId` masih wajib (`types.ts:315-337`); board SIMPRO saat ini selalu membaca `ProjectStep` lewat `boardVisibleStages` (`domain.ts:168-185`).
- `@dnd-kit/core` dan `@dnd-kit/sortable` sudah menjadi dependensi dan dipakai di editor template dan board SIMPRO, jadi drag-and-drop Umbrella tidak menambah library.
- Form Pitching sekarang adalah `FormEntry` scope Prospek yang dibuat dari `TemplateStage.kind === "form"` (`store.ts:4988-5046`); gerbang Decision membaca `pitchingFormEntries`/`pitchingFormComplete` (`domain.ts:862-877`).
- Review form dan review task masing-masing sudah punya guard sendiri (`canReviewFormEntry` `domain.ts:1630-1645`, `canReviewTask` `domain.ts:1374-1383`); keduanya hanya Admin atau PM pemilik.

## Goals / Non-Goals

**Goals:**

- Merepresentasikan Umbrella dan assignment queue tanpa entitas baru di luar `ProjectGroup` dan `Task`.
- Memakai kembali mesin transisi, review, audit, dan reminder SIMPRO untuk kartu Form Pitching.
- Menjadikan tab Forms proyek satu-satunya tempat pekerjaan form, sementara Journey tetap dekat dengan struktur step.
- Menjaga data dan aturan lama tetap terbaca: proyek legacy, Group lama, dan step Pitching legacy.

**Non-Goals:**

- Tidak memigrasikan `FormEntry` scope Prospek yang sudah tersimpan (keputusan ditahan; lihat Open Questions).
- Tidak mengubah model kontrak, RAB, Quotation, Decision, atau konversi Pitching selain sumber gerbang Form Pitching.
- Tidak menambah backend, auth, atau integrasi SIMPRO nyata.
- Tidak mengubah aturan step legacy atau template Umum.

## Decisions

### 1. Umbrella tetap `ProjectGroup`, dengan kepemilikan eksplisit

`createdById` yang sudah ada menjadi dasar visibilitas PM. Helper baru di `domain.ts`: `canViewGroup`, `canManageGroup`, `canAddProjectToGroup`, dan `groupsForUser`; halaman `crm/groups.tsx` memakai helper tersebut, bukan `role === admin || manager`. Store `createGroup`/`updateGroup`/`addProjectToGroup`/`removeProjectFromGroup`/`disbandGroup` mendapat guard yang sama agar tidak hanya bergantung pada UI.

`ensureProspekGroup` (`store.ts:502-532`) mengisi `createdById` dengan pembuat Prospek, bukan Admin yang menjalankan konversi, sehingga PM pemilik melihat Umbrella hasil konversi. Reuse berdasarkan nama tetap dipertahankan.

Alternatif: entitas `Umbrella` baru. Ditolak karena menduplikasi group, membership, progress, dan audit yang sudah ada.

### 2. Drag-and-drop Umbrella memakai `@dnd-kit` di card view

CRM Projects memakai `DndContext` + `useDraggable` pada `ProjectCard`, dengan dua jenis drop target: kartu proyek (membuka dialog pembuatan Umbrella) dan kartu Umbrella (langsung bergabung). Halaman Umbrella memakai droppable pada `SectionCard` group. Table view tetap tanpa DnD dan memakai aksi "Tambah ke Umbrella" yang membuka pemilih Umbrella.

Aturan minimal dua anggota ditegakkan di store: pembuatan dengan kurang dari dua proyek ditolak, dan pengeluaran anggota yang menyisakan satu proyek memicu `disbandGroup` otomatis. Ini menghindari state "Umbrella satu proyek" yang tidak dapat dikelola UI.

Alternatif: HTML5 drag events. Ditolak karena tidak konsisten dengan pola DnD yang sudah ada dan lebih sulit menangani keyboard/aksesibilitas.

### 3. Assignment queue adalah query domain, bukan state baru

Helper `assignmentQueueForUser(state, user)` mengembalikan dua kelompok: kartu `backlog` tanpa assignee dan `FormEntry` `unassigned`. Filter memakai guard yang sudah ada (`canAssignKanbanTask`, `canAssignFormEntry`/scope Prospek, `canAssignOperational`, `canManageProspek`) dan hanya aktif untuk Admin/Manager. UI My Tasks menambahkan section di atas daftar pekerjaan aktif; assign inline memanggil `assignTask`/`assignFormEntry` yang sama.

Tidak ada tabel antrean baru; antrean adalah proyeksi state. Ini menjaga notifikasi, audit, dan idempotensi tetap satu jalur.

### 4. Form Pitching menjadi `Task` ber-scope Pitching, bukan entitas baru

`Task.projectId` menjadi opsional dan ditambah `scope?: "project" | "pitching"`, `prospekId?`, `templateStageId?`. Kartu Pitching memakai `stepKey` konstan (`form-pitching`) dan `templateStageId` untuk filter form stage. Guard baru:

- `canCreatePitchingTask` (Admin/Manager), `canAssignPitchingTask` (Admin/Manager), `canWorkTask` diperluas untuk Media dan Finance pada kartu Pitching, `canReviewPitchingTask` (Admin atau PM pemilik Prospek).
- Transisi memakai `taskTransition` yang sudah ada; validasi Link Pekerjaan dan komentar revisi tetap di store.
- Pembatalan/arsip memakai `archivedAt`/`archiveReason` yang sudah ada; kartu Pitching tidak dihapus.

Board Pitching memakai ulang komponen `TaskBoard` setelah diekstrak agar menerima daftar kartu dan metadata kolom, bukan `ProjectStep`. Board ini tidak memakai `boardVisibleStages` karena tidak ada step proyek. Filter form stage berada di atas board. Route assignee `/work/prospek/[pitchingId]/form` menampilkan board yang sama dengan kartu miliknya.

`pitchingFormComplete` diubah menjadi: minimal satu kartu non-arsip dan semua kartu `completed`. `pitchingStageStates` dan UI Decision memakai helper ini. `prospekWorkItemsForUser` berhenti menghasilkan item `kind: "form"`; kartu Pitching masuk lewat `tasksForAssignee`, dan pengelompokan My Tasks diperluas untuk konteks Pitching.

Alternatif: entitas `PitchingTask` terpisah. Ditolak karena menduplikasi transisi, review, audit, reminder, dan komponen board.

### 5. Role Media adalah role operasional, bukan tim terpisah

`Role` menjadi `admin | manager | pm | finance | assignee | media`. `isOperationalAssignee` mencakup Media, `roleCanAccessCrm` false, `roleCanAccessSimpro` true, `landingForRole` ke `/my-tasks`. Workload memakai kandidat Assignee/Manager/Media. Shell menolak menu CRM dan Prospek untuk Media seperti Assignee. Seed menambah satu user Media.

RAB/Quotation hanya menerima Finance atau Media; Kontrak dan kartu Pitching menerima Assignee, Manager, Finance, atau Media. PM pemilik kehilangan jalur assign Prospek (`canAssignProspekWork` menjadi Admin/Manager saja), tetapi tetap dapat membuat, mereview, dan memutuskan.

Alternatif: field `team` pada user. Ditolak karena menambah dimensi akses baru tanpa kebutuhan lain di prototype.

### 6. Pre-assign memakai status step, bukan status kartu baru

Tidak ada status `scheduled` baru. Sebuah kartu atau form entry dianggap terjadwal bila step-nya `pending`. Pembuatan kartu diizinkan pada step pending untuk PM/Admin; assignment diizinkan untuk Manager/Admin; transisi kerja ditolak selama step pending. Badge dan Workload memfilter item yang step-nya pending. Saat step aktif, item otomatis kehilangan label terjadwal tanpa migrasi data.

Alternatif: status task `scheduled`. Ditolak karena menggandakan mesin status dan memaksa migrasi saat step aktif.

### 7. Journey Management, Forms tab, dan Overview dipisah per tanggung jawab

`project-detail.tsx` berhenti merender `FormStagePanel`, `FinanceStep`, `SurveyStep`, `RabStep`, dan aksi review di Journey. Journey hanya merender daftar step, ringkasan status/jumlah, dan tautan yang mengubah `?tab=board` atau `?tab=forms`. Tab Forms memakai `CrmProjectFormsTab` yang diperluas: daftar Form Keuangan + entry Form stage, banner hitungan, assign, buka, dan review.

Keputusan Gerbang dipindah ke kartu Overview. `GateStage` dipecah menjadi ringkasan read-only (Journey) dan panel keputusan (Overview) yang memakai `decideGate` yang sama. Deep link `?tab=journey` tetap bekerja; tautan gerbang mengarah ke `?tab=overview#gate`.

Step `pending` menjadi satu-satunya status yang boleh diedit penuh; `active`, `completed`, dan `skipped` tidak menampilkan aksi edit/urut/hapus. Ini menghapus kemampuan lama mengubah nama/PIC step aktif.

### 8. Persistensi: versi 10 dengan normalisasi non-destruktif

`migratePersistedState` menaikkan versi dan:

- Menormalkan `Task` lama dengan `scope: "project"` bila `pitchingId` tidak ada atau `projectId` ada.
- Tidak menghapus `FormEntry` scope Prospek; pembaca baru mengabaikannya. Ini menghindari kehilangan data sebelum keputusan migrasi diambil.
- Tidak mengubah Group lama; `createdById` sudah ada. Seed diperbarui agar grup demo, user Media, dan kartu Pitching konsisten.

## Risks / Trade-offs

- [`Task.projectId` menjadi opsional dan banyak helper mengasumsikannya] → Jalankan `tsc`/`npm run build` sebagai gerbang, audit `projectById(task.projectId)` dan filter board, lalu tambahkan test untuk kartu Pitching tanpa proyek.
- [Refactor `TaskBoard` berisiko merusak Board proyek] → Ekstrak props bertahap dan pertahankan test/perilaku board proyek; board Pitching memakai komponen yang sama dengan data berbeda.
- [PM kehilangan hak assign Prospek dapat memutus alur yang sudah terbiasa] → Test guard dan pesan UI eksplisit "Manager/Admin yang meng-assign"; PM tetap melihat pekerjaan dan review.
- [Item terjadwal membingungkan karena tidak bisa dikerjakan] → Label "Terjadwal"/"Menunggu step aktif", sembunyikan dari badge/Workload, dan tampilkan hanya di Backlog, tab Forms, serta assignment queue.
- [Board Pitching dan Decision bisa berbeda pendapat soal kelengkapan] → Satu helper `pitchingFormComplete` dipakai board, card summary, dan Decision; test regresi.
- [Drag-and-drop tidak dapat dipakai di table atau keyboard] → Aksi "Tambah ke Umbrella" di table dan menu aksi pada card menjadi fallback.
- [Data `localStorage` lama berisi FormEntry Prospek] → Tidak dibaca, tidak dihapus; seed demo baru. Risiko data yatim dicatat sebagai open question.

## Migration Plan

1. Ubah tipe dan guard domain lebih dulu, lalu perbaiki seluruh pemanggil sampai `npm run build` hijau.
2. Tambah store action dan helper baru (Umbrella, assignment queue, pitching task, pre-assign), lalu UI.
3. Naikkan versi persist ke 10 dan tambahkan normalisasi; verifikasi dengan test migrasi idempoten.
4. Perbarui seed (user Media, kartu Pitching, Umbrella demo) dan test yang menyentuh Prospek/Form Pitching.
5. Rollback: kembalikan versi persist dan seed; karena tidak ada migrasi destruktif, data lama tetap dapat dibuka.

## Open Questions

- Apakah `FormEntry` scope Prospek pada `localStorage` pengguna perlu dimigrasikan menjadi kartu Pitching, atau cukup diabaikan dan seed di-reset? Keputusan ditahan oleh pemilik produk; desain saat ini tidak menghapus data dan tidak membacanya.
