# Design

## Context

Lihat `proposal.md` untuk motivasi dan `specs/` untuk perilaku yang diminta. Kondisi teknis saat ini:

- Detail Prospek menampilkan Pitching sebagai accordion di `prospek-detail.tsx`; belum ada halaman Pitching sendiri.
- Assignee masih dapat membuka `/crm/prospek` lewat pengecualian shell; Finance ditolak.
- `isOperationalAssignee` hanya Assignee dan Manager; Finance belum bisa menjadi assignee pekerjaan Prospek.
- Kontrak disimpan di dalam `PitchingContract` dan baru bisa disimpan setelah Pitching menang, tetapi section-nya sudah tampil sejak draft.
- Keputusan kalah hanya untuk Pitching draft dan mensyaratkan RAB/Quotation siap; belum ada undo.
- Konversi membuat proyek anak tetapi tidak membuat atau menghubungkan `ProjectGroup`.
- CRM Projects dan Groups hanya punya tampilan card; Forms hanya grid card.
- FormEntry Prospek sudah ber-scope `prospek`, tetapi halaman Forms SIMPRO belum menampilkannya.

## Goals / Non-Goals

**Goals:**

- Memisahkan daftar Pitching (card) dari halaman kerja Pitching (section).
- Memberi jalur kerja terbatas bagi Assignee/Finance tanpa membuka Prospek.
- Menambah Finance sebagai assignee pekerjaan Prospek tanpa memperluas akses proyek/SIMPRO.
- Membuat kalah/undo konsisten dan dapat diaudit.
- Menghubungkan anak proyek ke Group Prospek secara otomatis dan idempoten.
- Menambah toggle Card/Table yang ringan dan konsisten di tiga halaman.

**Non-Goals:**

- Tidak mengubah board SIMPRO, enam status, atau alur finance proyek.
- Tidak menambah backend, email, atau integrasi eksternal.
- Tidak memigrasikan Pitching legacy atau `ProjectGroup` lama.
- Tidak menambah tampilan tabel pada SIMPRO Projects/board; scope tabel adalah CRM Projects, CRM Groups, dan Forms.
- Tidak mengubah aturan stage/fase proyek.

## Decisions

### 1. Card Pitching + halaman Pitching bersection

Daftar Pitching di detail Prospek menjadi card ringkas; card membuka route `/crm/prospek/[id]/pitching/[pitchingId]`. Halaman ini memakai section/tab: RAB, Quotation, Form Pitching, Kontrak, Finishing. Ringkasan card dihitung dari selector store yang ada (RAB, Quotation, kontrak, projectId), bukan field ringkasan baru, agar tidak ada data duplikat.

Alternatif mempertahankan accordion ditolak karena halaman kerja dengan banyak section akan terlalu panjang dan sulit di-deep-link.

### 2. Jalur kerja terbatas untuk Assignee/Finance

Ditambah route `/work/prospek/[pitchingId]/[section]` yang hanya menampilkan konteks Pitching (judul, client, section) dan pekerjaan yang di-assign. Route ini tidak menampilkan daftar Prospek, pagu, Pitching lain, atau tautan detail Prospek. My Tasks dan Forms menautkan ke route ini.

`canViewProspek` tidak lagi mengizinkan Assignee/Finance. Shell menolak `/crm/prospek` untuk Assignee dan Finance, tetapi mengizinkan `/work/prospek/*` bagi penerima assignment.

Alternatif memakai halaman Pitching normal dengan mode terbatas ditolak karena URL dan data Prospek tetap terbuka.

### 3. Finance sebagai assignee Prospek, bukan anggota proyek

Ditambah `isProspekAssignee` (`assignee`, `manager`, `finance`) dan `prospekAssigneeCandidates`. `isOperationalAssignee` untuk task/Form proyek tetap Assignee dan Manager. Finance hanya dapat mengerjakan RAB, Quotation, Form Pitching, dan Kontrak yang di-assign, serta membuka `/my-tasks` dan `/forms`; Finance tetap tidak dapat membuka board/proyek.

Alternatif memperluas `isOperationalAssignee` ke Finance ditolak karena akan membuka task SIMPRO dan assignment proyek.

### 4. Work item Prospek diturunkan dari assignment

`prospekWorkItemsForUser(state, userId)` mengembalikan item aktif dari RAB, Quotation, Kontrak, dan FormEntry Prospek yang di-assign. My Tasks menampilkan grup "Prospek"; Forms menampilkan FormEntry Prospek. Status aktif mengikuti status masing-masing: RAB/Quotation belum submitted, kontrak belum lengkap/disimpan, Form belum approved.

Tidak ada koleksi task baru; work item adalah proyeksi dari data yang sudah ada. Ini menghindari sinkronisasi ganda.

### 5. Kalah kapan saja + undo

`ProspekPitching` mendapat field opsional `statusBeforeLoss?: "draft" | "won"`, `lostAt?`, `lostById?`, dan `lossUndoneAt?`. Aksi kalah:

- diizinkan untuk Pitching apa pun yang belum punya `projectId`,
- tidak mensyaratkan RAB/Quotation siap,
- wajib alasan,
- menyimpan status sebelumnya, menandai `lost`, dan langsung masuk arsip.

Undo hanya untuk PM pemilik/Admin, hanya bila Prospek aktif dan Pitching belum dikonversi; status dikembalikan ke `statusBeforeLoss`, field kalah dibersihkan, dan event `pitching.loss_undone` dicatat. "Arsip" adalah tampilan Pitching berstatus `lost`, bukan koleksi terpisah.

### 6. Kontrak terkunci sampai menang dan dapat di-assign

Section Kontrak menampilkan state terkunci saat Pitching draft. Setelah menang, PM/Manager/Admin dapat meng-assign kontrak kepada Assignee/Manager/Finance dan mengisi field kontrak. Ditambah field pada `ProspekPitching`: `contractAssigneeId?`, `contractDueDate?`, `contractStatus?: "unassigned" | "assigned" | "draft" | "submitted"`. Data kontrak yang sudah ada tetap di `contract`.

Assignment kontrak mengirim notifikasi dan membuat work item My Tasks. Penyimpanan kontrak tetap mensyaratkan Pitching menang dan field lengkap.

### 7. Konversi membuat/mereuse Group Prospek

`convertPitching` memanggil helper `ensureProspekGroup(state, prospek)`:

- normalisasi nama Prospek (trim, case-insensitive),
- cari Group aktif dengan nama sama; jika ada, pakai,
- jika tidak ada, buat Group baru dengan nama Prospek dan `createdById` PM Prospek,
- set `groupId` anak proyek dan `prospekId` pada Group bila masih kosong.

`ProjectGroup` mendapat `prospekId?` opsional agar tautan stabil; Group lama tanpa field ini tetap valid. Konversi tetap idempotent: Pitching yang sudah punya `projectId` mengembalikan proyek yang sama tanpa membuat Group baru.

### 8. Toggle Card/Table dengan preferensi per halaman

Komponen `ViewToggle` dipakai di CRM Projects, CRM Groups, dan Forms. Preferensi disimpan di `localStorage` dengan kunci terpisah (`crm-projects-view`, `crm-groups-view`, `forms-view`), default `card`. Tabel memakai filter/pencarian yang sama dengan card. Forms memakai tabel yang sama untuk Form proyek dan Form Pitching; kolom konteks menampilkan nama proyek atau Pitching tanpa membuka detail Prospek bagi Assignee/Finance.

Alternatif menyimpan preferensi di Zustand ditolak karena preferensi tampilan bersifat UI lokal dan tidak perlu ikut persist data domain.

### 9. Migrasi additive

Persist version dinaikkan ke 6. Field baru semuanya opsional (`statusBeforeLoss`, `lostAt`, `lostById`, `lossUndoneAt`, `contractAssigneeId`, `contractDueDate`, `contractStatus`, `ProjectGroup.prospekId`). Migrasi hanya menambahkan array/field default dan tidak mengubah Pitching/proyek lama.

## Risks / Trade-offs

- [Route kerja terbatas bisa membocorkan data Prospek] → route hanya memuat Pitching title, client, section, dan work item; tanpa pagu, daftar Pitching, atau tautan Prospek.
- [Finance bisa melebar ke SIMPRO] → izin Finance dibatasi ke `/my-tasks`, `/forms`, dan `/work/prospek/*`; board/proyek tetap ditolak.
- [Work item ganda bila satu Pitching punya beberapa assignment] → kelompokkan per section dan tampilkan satu baris per work item; status mengikuti masing-masing.
- [Undo kalah pada Pitching menang mengembalikan kontrak lama] → simpan status sebelum kalah dan jangan menghapus data kontrak; tampilkan kontrak kembali setelah undo.
- [Nama Group sama dengan Group manual lain] → reuse Group aktif dengan nama sama; jika Group dibatalkan, buat Group baru.
- [Preferensi tabel tidak konsisten antar tab] → kunci localStorage per halaman dan baca saat mount.
- [Tabel Forms menampilkan konteks Prospek ke Assignee] → tampilkan judul Pitching/client saja, bukan nama/pagu Prospek.
- [Data lama tanpa field baru] → semua field opsional dan migrasi idempotent.

## Migration Plan

1. Bump persist version ke 6.
2. Tambah field opsional pada Pitching, kontrak, dan `ProjectGroup`.
3. Tidak ada backfill status kalah atau Group; Pitching lama tetap berjalan.
4. Tambah preferensi tampilan di localStorage saat halaman pertama kali dibuka.
5. Rollback: kembalikan versi persist; field baru diabaikan dan data lama tidak tersentuh.

## Open Questions

Tidak ada.
