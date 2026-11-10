# Design

## Context

Lihat `proposal.md` untuk motivasi. Kondisi saat ini:

- `NAV_SIMPRO` di `shell.tsx` berisi Dashboard, Projects, My Tasks, dan Forms; route `/dashboard` dan `/projects` masih menjadi area SIMPRO terpisah dari `/crm` dan `/crm/projects`.
- Detail Proyek CRM hanya memiliki Overview dan Journey Management; Board, Backlog, dan Forms masih berada di `src/app/(main)/projects/[id]/board|backlog|forms`.
- Halaman CRM Projects menampilkan section Groups, accordion Group, drag-and-drop Group, dan filter tipe Group/Project.
- Prospek hanya memiliki tampilan Card tanpa pagination dan tanpa toggle Table.
- Pitching menyimpan template, tetapi konversi memakai `mode: "manual"` sehingga step template tidak disalin; konversi masih manual melalui tombol.
- RAB Pitching belum memiliki status review PM; Quotation sudah memiliki `approved`/`need_revision`.
- `ListPaginationBar` dan util `list-pagination.ts` sudah tersedia dan dipakai halaman lain.

## Goals / Non-Goals

**Goals:**

- Satu alur navigasi CRM–SIMPRO dengan CRM sebagai pusat dashboard/proyek.
- Memindahkan pekerjaan proyek (Board/Backlog/Forms) ke Detail Proyek CRM.
- Menyederhanakan Projects dengan daftar datar, label Prospek, pagination, dan Table view untuk Prospek.
- Menegakkan urutan Pitching dan membuat RAB/Quotation direview PM sebelum lanjut.
- Mengotomatiskan konversi Pitching menang dan pembuatan step dari template Pitching.

**Non-Goals:**

- Menghapus entitas Group, data `groupId`, atau halaman CRM Groups.
- Mengubah aturan gate, progress journey, atau transisi Kanban di luar lokasi tab Board.
- Mengubah role akses proyek di luar navigasi dan halaman Pitching.
- Membuat backend baru; semua perubahan tetap pada prototype Zustand/localStorage.

## Decisions

### 1. CRM menjadi workspace utama; SIMPRO hanya pekerjaan personal

`NAV_SIMPRO` disederhanakan menjadi My Tasks dan Forms. Dashboard/Projects SIMPRO dihapus dari navigasi. Route lama dipertahankan sebagai redirect:

- `/dashboard` → `/crm`
- `/projects` → `/crm/projects`
- `/projects/[id]/board|backlog|forms` → `/crm/projects/[id]` dengan tab yang sesuai

Redirect mencegah tautan lama dan deep link rusak tanpa mempertahankan dua UI yang sama. Halaman `/my-tasks` dan `/forms` tetap berada di area SIMPRO.

Alternatif menghapus route lama sepenuhnya ditolak karena akan memutus tautan dari My Tasks, Forms, dan data demo lama.

### 2. Board, Backlog, dan Forms menjadi tab Detail Proyek CRM

`workspaceTab` di `CrmProjectDetail` diperluas menjadi `overview | journey | board | backlog | forms`. Tab Board memakai `TaskBoard` dan aturan tahap SIMPRO yang sudah ada; Backlog memakai daftar task proyek; Forms memakai ringkasan Form proyek/Form Keuangan dan tautan ke halaman form. Tab tetap menghormati role: Assignee hanya melihat task/Form miliknya; Finance hanya melihat Form Keuangan yang relevan.

Komponen yang dipindahkan tidak diduplikasi: komponen Board/Backlog/Forms lama dijadikan komponen bersama yang dipakai tab CRM, lalu route SIMPRO lama hanya melakukan redirect. Detail Proyek SIMPRO tidak lagi memiliki tab work sendiri.

### 3. Projects menjadi daftar datar dengan label Prospek

Section Groups, accordion Group, drag-and-drop Group, dan filter tipe Group dihapus dari halaman Projects. `Group` tetap disimpan dan halaman CRM Groups tetap ada; yang berubah hanya presentasi Projects. Card/table proyek menampilkan badge `Prospek · <nama>` untuk proyek dengan `prospekId` dan badge `Umbrella Project` untuk proyek yang menjadi induk Prospek. Relasi Group tidak lagi menjadi pengelompokan utama di Projects.

Pencarian tetap mencocokkan nama Prospek induk. Filter “Berasal dari Prospek” dipertahankan.

### 4. Pagination dan Table Prospek memakai komponen yang sudah ada

Projects dan Prospek memakai `ListPaginationBar` serta `list-pagination.ts` dengan ukuran halaman 10/25/50/100 dan default 10. Perubahan pencarian/filter mereset halaman ke 1. Data yang dipaginasi adalah hasil filter, bukan seluruh data.

Prospek memakai `useViewPreference("crm-prospek")` dan tabel dengan kolom kode/nama, client, PIC, periode, pagu, jumlah Pitching, jumlah menang, dan status. Card tetap default.

### 5. Urutan Pitching dihitung dari status data, bukan state UI

Status tahap Pitching diturunkan dari data:

- RAB selesai jika status `approved`; aktif jika `assigned`/`draft`/`submitted`; terkunci jika belum ada atau belum di-assign.
- Quotation selesai jika `approved`; aktif jika `assigned`/`draft`/`submitted`/`need_revision`.
- Form Pitching selesai jika minimal satu entri non-batal ada dan semuanya `approved`.
- Decision selesai jika status `won`/`lost`.
- Kontrak hanya aktif setelah `won`, dan selesai jika `contractComplete`.

Section yang belum boleh diisi dirender terkunci dan tidak menampilkan aksi tulis. Navigasi tahap memakai tiga tone warna: selesai (hijau/emerald), aktif (biru/amber), terkunci (slate). Ini menghindari state duplikat dan tetap konsisten setelah reload.

### 6. RAB dan Quotation hanya untuk Finance, dengan review PM

Kandidat assignee untuk RAB/Quotation Pitching dibatasi ke role Finance. PM/Manager/Admin tetap boleh meng-assign, tetapi target hanya Finance. Finance mengisi dan submit; PM pemilik/Admin mereview.

RAB memakai status tambahan `approved` dan `need_revision` (atau field review setara) agar setara dengan Quotation. Review PM mencatat aktor, waktu, komentar, dan status. Hanya status `approved` yang membuka tahap berikutnya. Form Pitching tetap memakai aturan assignment yang ada (Assignee/Manager/Finance).

### 7. Konversi otomatis dan idempotent

Tambahkan alur internal `autoConvertWinningPitchings(prospekId)` yang:

- mencari semua Pitching `won` dengan `contractComplete` dan belum punya `projectId`;
- memanggil logika konversi yang sudah ada secara idempotent;
- mencatat audit konversi dan memperbarui status Prospek.

Trigger dijalankan setelah kontrak lengkap disimpan dan setelah keputusan menang jika kontrak sudah lengkap. Konversi tidak memerlukan aktor PM/Admin pada saat trigger karena syaratnya sudah terpenuhi; audit mencatat aktor yang memicu atau sistem. Tombol konversi manual dihapus dari UI. Pitching yang sudah punya `projectId` dilewati.

Alternatif tetap manual ditolak karena user meminta “otomatis konversi”.

### 8. Proyek hasil Prospek memakai template Pitching

Konversi memakai template dan versi yang tersimpan di Pitching, bukan `mode: "manual"`. Stage template disalin ke `ProjectStep` dengan status pending; Manager PIC diambil dari PIC Prospek/Manager proyek. Proyek langsung tanpa Prospek tetap manual-only.

Journey Management memakai aturan step yang ada: step pending boleh diedit, dihapus, dan direorder; step aktif/selesai hanya nama, Manager PIC, dan deskripsi. Perubahan pada proyek tidak mengubah template Pitching.

### 9. Kompatibilitas data dan route

Perubahan status RAB bersifat aditif; data RAB lama yang `submitted` tetap dapat direview. Migrasi persist menambahkan backfill konversi untuk Pitching menang dengan kontrak lengkap yang belum punya proyek, dijalankan idempotent. Redirect route lama tidak mengubah data. Tidak ada perubahan format localStorage yang merusak data lama.

## Risks / Trade-offs

- [Auto-conversi membuat proyek saat kontrak disimpan] → Idempotensi, audit, dan status Prospek dicek ulang; proyek yang sudah ada dilewati.
- [Assign RAB/Quotation hanya Finance mengurangi fleksibilitas] → Sesuai keputusan user; role lain tetap dapat melihat hasil dan PM tetap mereview.
- [Urutan Pitching yang ketat menahan Pitching kalah sampai semua tahap selesai] → Keputusan user; UI harus menjelaskan tahap yang belum selesai.
- [Redirect route lama dapat memutus bookmark] → Redirect menjaga konteks proyek dan tab.
- [Menghapus section Groups dari Projects membingungkan pengguna Groups] → Halaman CRM Groups tetap ada dan label Prospek menjadi penanda utama.
- [Template Pitching bisa berubah setelah Pitching dibuat] → Proyek menyalin versi template yang tersimpan pada Pitching.

## Migration Plan

1. Tambahkan redirect route lama dan sederhanakan navigasi.
2. Pindahkan komponen Board/Backlog/Forms ke tab CRM.
3. Ubah Projects menjadi daftar datar + label; tambahkan pagination dan Table Prospek.
4. Tambahkan status review RAB dan gate urutan Pitching.
5. Ubah konversi menjadi otomatis dan berbasis template.
6. Backfill Pitching menang + kontrak lengkap yang belum dikonversi; jalankan migrasi dua kali untuk memastikan idempotensi.
7. Perbarui dokumentasi dan jalankan build/lint/test serta smoke test lintas role.

Rollback: kembalikan navigasi dan route, matikan auto-conversion, dan pertahankan data Pitching/proyek yang sudah dibuat. Status RAB tambahan bersifat opsional sehingga data lama tetap valid.

## Open Questions

Tidak ada; keputusan yang memengaruhi spec, pendekatan, dan task sudah diselesaikan.
