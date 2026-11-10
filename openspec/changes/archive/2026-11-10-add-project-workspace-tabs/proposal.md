# Proposal

## Why

Detail proyek CRM saat ini mencampur overview, pengelolaan step, dan board dalam satu halaman panjang. Journey Management juga masih terikat pada template, sehingga PM tidak bisa menyusun step secara bebas untuk proyek yang sedang berjalan. Di sisi lain, pekerjaan Prospek yang di-assign belum muncul di Forms SIMPRO, Link Pekerjaan belum punya aksi simpan eksplisit, dan tabel Projects belum menunjukkan asal Prospek.

## What Changes

- Detail proyek CRM memiliki **tiga tab**: **Overview**, **Journey Management**, dan **Board** untuk semua proyek, termasuk legacy.
- **Overview** menampilkan Asal Prospek, Riwayat Aktivitas, dan Penyelesaian Tahap.
- **Journey Management** membuat step sepenuhnya manual: PM dapat membuat, mengubah, menghapus, dan mereorder step dengan nama bebas, termasuk step pada fase berikutnya. Template tidak lagi mengikat step proyek baru.
- Memilih fase awal **Planning** membuat fase **Running kosong**; PM membuat step Running nanti di Journey Management.
- **Board** menampilkan board Kanban SIMPRO yang sama di dalam halaman proyek CRM, beserta referensi task ke SIMPRO.
- Pekerjaan Prospek yang di-assign (RAB, Quotation, Form Pitching, Kontrak) muncul di **Forms SIMPRO** untuk Assignee, Manager, dan Finance yang ditunjuk, dengan kategori **Prospek**; Form proyek berkategori **Project**.
- Link Pekerjaan memiliki tombol **Simpan**; validasi protokol HTTPS dihapus, tetapi link tetap wajib diisi.
- Tabel Projects menambahkan kolom **Prospek**.
- Proyek legacy dan Groups lama tetap dapat dibaca dan dioperasikan.

## Capabilities

### New Capabilities

<!-- Tidak ada capability baru. -->

### Modified Capabilities

- `project-lifecycle`: tiga tab proyek, Journey Management manual tanpa template, Running kosong saat mulai Planning, dan Overview.
- `simpro-kanban-delivery`: tombol Simpan Link Pekerjaan dan aturan validasi link yang baru.
- `prospek-pitching`: pekerjaan Pitching yang di-assign tampil di Forms SIMPRO dengan kategori Prospek/Project.
- `table-list-views`: kolom Prospek pada tabel Projects.

## Impact

- **UI CRM**: tab proyek, Overview, Journey Management, embed Board, dan tabel Projects.
- **UI SIMPRO/Forms**: kategori Form Prospek vs Project, tombol Simpan Link Pekerjaan, dan tampilan link.
- **Domain/store**: pembuatan proyek manual-only, step management lintas fase, validasi link tanpa URL, dan pengelompokan work item Prospek di Forms.
- **Template**: template tidak lagi dipakai untuk proyek baru; template lama tetap tersimpan untuk histori/legacy.
- **Test & dokumentasi**: lifecycle, Kanban link, Forms category, Projects table, dan migrasi/perilaku legacy; pembaruan `AGENTS.md`, `Docs/Stage-Types.md`, `Docs/Prospek.md`.
- **Tidak berdampak**: Groups manual, riwayat proyek legacy, dan data Prospek yang sudah ada.
