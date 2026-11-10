# Design

## Context

Lihat `proposal.md` untuk motivasi. Kondisi saat ini:

- `CrmProjectDetail` menyimpan `workspaceTab` bertipe `overview | journey | board`; tab Board merender `TaskBoard` untuk step terpilih di `src/components/prototype/crm/project-detail.tsx`.
- Journey Management sudah merender `SimproStagePanel` untuk step SIMPRO terpilih, tetapi pemilihan step bergantung pada stepper di header dan step pending tidak dapat dipilih.
- Overview sudah punya `Distribusi Task SIMPRO` sederhana dan `Riwayat Aktivitas`; urutannya menempatkan riwayat lebih dulu.
- Dashboard SIMPRO punya pola `Distribusi task` per status dan `Progress overview` (Completed/Open/Overdue) di `src/components/prototype/simpro/dashboard.tsx`.
- Board SIMPRO memfilter step pending hanya untuk Assignee; role lain masih melihat semua step SIMPRO.
- `canViewProject` untuk Assignee hanya memeriksa task dan `StepForm`, bukan `formEntries`; Forms juga melewati seluruh entri proyek untuk role Finance. Akibatnya penugasan Form proyek dapat tersaring dari Forms.

## Goals / Non-Goals

**Goals:**

- Menjadikan Journey Management satu-satunya workspace CRM untuk memilih step dan melihat task SIMPRO-nya.
- Menampilkan distribusi dan progress task proyek dengan komponen yang sama dengan Dashboard SIMPRO.
- Membatasi tahap Board SIMPRO ke tahap aktif dan selesai untuk semua role.
- Memastikan setiap Form yang di-assign dari Prospek, Project, atau Finance muncul di Forms penerimanya tanpa mengubah hak review.
- Menampilkan seluruh fase siklus baru meskipun kosong dan memastikan Finance selalu memiliki step BAST/Invoice.
- Memberi Manager jalur assignment Form langsung dari halaman Forms.

**Non-Goals:**

- Mengubah model data, persistensi, atau migrasi Zustand.
- Mengubah aturan transisi task, gate, progress journey, atau permission review.
- Menambahkan halaman Board baru di CRM atau memindahkan Board SIMPRO ke CRM.
- Mengubah aturan siapa yang boleh di-assign pada Form Keuangan atau Form proyek.

## Decisions

### 1. Hapus tab Board dan jadikan Journey Management tempat pemilihan step

`workspaceTab` disederhanakan menjadi `overview | journey`. Inisialisasi dari query hanya menerima `overview` dan `journey`; nilai `board` diabaikan dan jatuh ke Overview. Tombol `Selesaikan Tahap` tetap berada di bawah header untuk kedua tab.

Di Journey Management, tambahkan pemilih step (`NativeSelect`) yang berisi seluruh step proyek yang sudah dibuat, dikelompokkan per fase. Memilih step memanggil `selectStep` dan menyinkronkan `?step=`. Step pending tetap boleh dipilih untuk melihat bahwa belum ada task; step non-SIMPRO menampilkan panel sesuai jenisnya dan tidak menampilkan task step lain.

`SimproStagePanel` tetap menjadi card task di bawah pemilih step. Isinya dipertahankan: ringkasan total/selesai/aktif, daftar task, assign, task dari template, gate, dan tautan ke Board SIMPRO. Tab Board CRM dihapus beserta `boardTaskId`, `TaskBoard`, dan dialog task khusus board; dialog task yang sudah dipakai panel step tetap dipertahankan.

Alternatif mempertahankan tab Board tersembunyi ditolak karena membuat dua jalur pemilihan step dan menyisakan state yang tidak terpakai. Alternatif menaruh `TaskBoard` penuh di Journey Management ditolak karena Journey Management sudah memiliki card task per step dan board penuh tetap tersedia di SIMPRO.

### 2. Ekstrak panel distribusi/progress task dari Dashboard SIMPRO

Buat komponen bersama di `src/components/prototype/simpro/task-progress.tsx` (nama dapat disesuaikan) yang menerima `tasks: Task[]` dan merender dua `SectionCard`:

- `Distribusi task`: bar per `TASK_STATUSES` dengan jumlah dan persentase.
- `Progress overview`: kartu Completed, Open, Overdue dan progress bar persentase selesai.

Dashboard SIMPRO memakai komponen ini dengan task lintas proyek yang sudah difilter visibilitasnya. Overview CRM memakai komponen yang sama dengan task proyek tersebut saja, ditempatkan sebelum `Riwayat Aktivitas`. Untuk Assignee yang somehow membuka detail CRM, task difilter seperti Dashboard (hanya task miliknya); role lain melihat seluruh task proyek. Komponen tidak menampilkan judul task, hanya agregat, sehingga tidak membuka data task baru.

Alternatif menyalin markup Dashboard ke `project-detail.tsx` ditolak karena dua sumber kebenaran untuk tampilan yang sama akan cepat menyimpang.

### 3. Filter tahap Board SIMPRO di satu helper domain

Tambahkan helper domain (misalnya `boardVisibleStages(state, projectId)`) yang mengembalikan step `kind === "simpro"` dengan status `active` atau `completed`, terurut. `SimproProjectPage` memakai helper ini untuk semua role, sehingga:

- opsi tahap tidak pernah berisi `pending`;
- `?stage=` yang menunjuk step pending diabaikan;
- default selection adalah step aktif, lalu step selesai terbaru;
- step selesai tetap `readOnly` pada `TaskBoard`.

Filter Assignee yang lama untuk task tetap berlaku: Assignee hanya melihat task miliknya di tahap yang tersedia. Jika proyek belum punya tahap aktif/selesai, tampilkan empty state yang menjelaskan belum ada tahap berjalan, bukan error akses.

Alternatif hanya membatasi Assignee ditolak karena user memilih “aktif + selesai untuk semua role” dan agar PM/Manager tidak membuka tahap yang belum berjalan dari Board.

### 4. Forms memakai assignment sebagai sumber visibilitas

Perbaiki `canViewProject` agar daftar proyek terlihat juga mempertimbangkan `state.formEntries` yang di-assign kepada user, untuk Assignee dan Finance pada proyek siklus baru. Ini membuat proyek tidak tersaring sebelum `SimproFormsPage` membangun baris.

Di `SimproFormsPage`, hapus skip global `currentUser.role === "finance"` pada loop entri Form proyek; visibilitas tetap ditentukan oleh `visibleIds` dan filter assignee yang sudah ada. Dengan begitu:

- entri Form proyek yang di-assign kepada Assignee/Manager/Finance muncul;
- Form Keuangan tetap muncul lewat `simproFinanceFormRows` untuk Finance penerima, PM pemilik, dan Admin;
- pekerjaan Prospek tetap muncul lewat loop Prospek dan `prospekWorkItemsForUser`;
- PM/Manager/Admin tidak kehilangan akses review yang sudah ada.

Alternatif menambahkan daftar terpisah “semua form proyek” ditolak karena akan mengubah cakupan Forms di luar permintaan dan berpotensi membocorkan penugasan antar-user.

### 5. Dokumentasi dan test mengikuti perilaku baru

Perbarui `Docs/Stage-Types.md` (tiga tab menjadi dua, Journey Management memilih step, Board SIMPRO hanya aktif/selesai), `Docs/Prospek.md` (Forms sebagai inbox semua assignment), dan `AGENTS.md` bila ringkasan aturan produk berubah. Test domain ditambah untuk helper tahap Board dan `canViewProject` berbasis form entry; test Forms memverifikasi baris dari ketiga sumber.

### 6. Fase siklus baru selalu lengkap

Helper `phasesForProject(project, steps)` mengembalikan `NEW_PROJECT_PHASES` untuk proyek `manual`/`template`, dan `phasesPresent(steps)` untuk proyek legacy. `ProjectStepper` memakai helper ini sehingga Planning, Running, dan Finance selalu tampil; `phaseStageCounts` tetap menghitung step nyata dan UI menampilkan `0 Step` untuk fase kosong.

Saat pengguna memilih fase kosong, `selectPhase` menghapus step terpilih dan parameter `?step=`, lalu panel menampilkan empty state “Belum ada step”. `selectedStep` dihitung dari step pada fase terpilih saja, sehingga task dari fase lain tidak bocor ke panel fase kosong.

Alternatif menampilkan fase hanya berdasarkan data ditolak karena user meminta semua fase siklus baru selalu terlihat. Alternatif menampilkan fase legacy Planning/Running/Finance ditolak karena merusak riwayat proyek legacy yang memang tidak memiliki fase tersebut.

### 7. Finance otomatis memiliki BAST dan Invoice

Tambahkan helper domain `missingFinanceSteps(project, steps, createdAt)` yang mengembalikan step BAST/Invoice yang belum ada, dengan `financeKind`, `kind: "finance_form"`, status `pending`, urutan setelah step terakhir, dan `managerPicId` dari Manager proyek. Helper ini dipakai:

- di `completeProjectPhase` saat Running selesai, sebelum step Finance pertama diaktifkan;
- di migrasi persist untuk proyek aktif yang sudah berada di Finance tanpa BAST/Invoice.

Step yang sudah memiliki `financeKind` yang sama tidak diduplikasi. BAST dan Invoice tetap berurutan; menyelesaikan BAST mengaktifkan Invoice melalui mekanisme `completeStep` yang sudah ada. Penambahan step Finance lain tetap memakai `addProjectStep`.

Alternatif membuat BAST/Invoice sebagai `parallelGroup` ditolak karena invariant satu step aktif lebih sederhana dan user tidak meminta kedua form aktif bersamaan. Alternatif hanya membuat saat project dibuat ditolak karena fase Finance belum tentu pernah dicapai.

### 8. Assignment dari Forms memakai aksi store yang sama

Halaman Forms menampilkan kontrol assignment ringkas pada baris/card entri yang belum di-assign. Kontrol hanya muncul untuk Manager/Admin, memakai `operationalAssigneeCandidates` untuk Form proyek dan `prospekAssigneeCandidates` untuk Form Prospek, lalu memanggil `assignFormEntry` yang sudah menangani status, notifikasi, audit proyek/Prospek, dan permission.

Alternatif membuat aksi assignment baru di halaman Forms ditolak karena akan menduplikasi aturan assignment dan audit. FormEntryPage tetap menjadi tempat reassignment lengkap; kontrol di daftar difokuskan untuk entri `unassigned`.

## Risks / Trade-offs

- [Deep link `?tab=board` lama tidak lagi membuka board] → Normalisasi ke Overview dan pertahankan tautan Board SIMPRO di panel step.
- [Step pending kini dapat dipilih di Journey Management] → Panel menampilkan empty state “Belum dimulai”; tidak ada aksi tulis yang diaktifkan untuk step pending.
- [Overview CRM dan Dashboard SIMPRO memakai komponen yang sama] → Perbedaan sumber task ditangani lewat prop `tasks`, bukan duplikasi markup.
- [Menghapus filter role pada loop Forms Finance dapat menampilkan entri yang tidak di-assign] → `visibleIds` dan filter assignee tetap menjadi gerbang utama; test negatif memastikan Assignee/Finance lain tidak melihat penugasan orang lain.
- [Proyek tanpa tahap aktif/selesai menampilkan Board kosong] → Empty state eksplisit; tidak mengubah permission proyek.
- [Fase kosong dapat dipilih dan panel menampilkan data step fase lain] → `selectedStep` dibatasi ke step pada fase terpilih dan `?step=` dihapus saat fase kosong dipilih.
- [Auto BAST/Invoice menduplikasi step buatan user] → Helper hanya membuat step yang `financeKind`-nya belum ada.
- [Assignment dari Forms melewati aturan audit yang sama] → Semua assignment memakai `assignFormEntry`, bukan aksi baru.

## Migration Plan

1. Hapus tab Board CRM dan state terkait; normalisasi query `tab`.
2. Tambahkan pemilih step di Journey Management dan hubungkan ke panel step yang ada.
3. Ekstrak komponen distribusi/progress task dan pakai di Dashboard SIMPRO serta Overview CRM; pindahkan urutannya ke atas Riwayat Aktivitas.
4. Tambahkan helper tahap Board SIMPRO dan pakai di `SimproProjectPage`.
5. Perbaiki `canViewProject` dan loop Forms; tambah kontrol assignment dari Forms.
6. Tambahkan helper fase lengkap dan step Finance otomatis, lalu migrasi proyek Finance aktif yang belum punya BAST/Invoice.
7. Perbarui dokumentasi dan jalankan `npm run build`, `npm run lint`, `npm test`.

Persist version dinaikkan untuk backfill step Finance otomatis. Migrasi idempotent: step yang sudah memiliki `financeKind` BAST/Invoice tidak dibuat ulang. Rollback cukup mengembalikan perubahan UI/domain; data proyek, form, dan assignment yang ada tetap valid.

## Open Questions

Tidak ada; keputusan yang memengaruhi spec, pendekatan, dan task sudah diselesaikan.
