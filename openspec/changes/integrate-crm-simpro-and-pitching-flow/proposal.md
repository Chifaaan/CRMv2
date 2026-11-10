# Proposal

## Why

Navigasi CRM dan SIMPRO saat ini punya dua Dashboard dan dua Projects yang membingungkan, sementara pekerjaan proyek tersebar antara Detail Proyek CRM dan Detail Proyek SIMPRO. Alur Pitching juga belum berurutan tegas, RAB/Quotation belum memiliki review PM yang seragam, dan konversi Pitching menang masih manual. Akibatnya user harus berpindah area, status tahap sulit dibaca, dan proyek hasil Prospek tidak otomatis mengikuti template Pitching.

## What Changes

- Hapus menu **Dashboard** dan **Projects** dari area SIMPRO; SIMPRO hanya menyisakan **My Tasks** dan **Forms**. CRM menjadi pintu masuk tunggal untuk dashboard dan proyek, dan route lama diarahkan ke padanan CRM.
- Pindahkan fungsi **Board, Backlog, dan Forms** dari Detail Proyek SIMPRO ke Detail Proyek CRM sebagai tab workspace. Detail Proyek SIMPRO tidak lagi menjadi tujuan utama.
- Hapus section **Groups** pada halaman CRM Projects. Proyek yang berasal dari Prospek atau merupakan bagian dari Umbrella Project diberi label jelas pada header card.
- Tambahkan **pagination** pada menu Projects dan Prospek, serta tampilan **Card/Table** untuk menu Prospek.
- Ubah alur Pitching menjadi berurutan: **RAB → Quotation → Form Pitching → Decision → Kontrak**. Tahap yang selesai/belum selesai dibedakan dengan warna.
- PM meng-assign RAB dan Quotation Pitching kepada **Finance**; Finance mengisi, lalu PM mereview dan menandai selesai sebelum Pitching dapat lanjut.
- Pitching menang yang kontraknya lengkap **otomatis dikonversi** menjadi proyek; tombol konversi manual dihapus dan semua Pitching menang yang memenuhi syarat diproses.
- Proyek hasil Prospek memakai **template yang tersimpan pada Pitching** untuk membuat tahapan dan step. Di Journey Management, PM/Admin dapat mengubah dan menghapus step yang masih pending; step aktif/selesai tetap dibatasi.
- **BREAKING (UI)**: menu SIMPRO Dashboard/Projects dan route Detail Proyek SIMPRO tidak lagi menjadi alur utama; konversi Pitching manual tidak tersedia.

## Capabilities

### New Capabilities

- `crm-simpro-integration`: satu navigasi CRM–SIMPRO, penghapusan Dashboard/Projects SIMPRO, redirect route lama, dan tab Board/Backlog/Forms di Detail Proyek CRM.

### Modified Capabilities

- `project-lifecycle`: Detail Proyek CRM memiliki lima tab workspace; proyek hasil Prospek memakai template Pitching; step pending dapat diubah/dihapus.
- `prospek-pitching`: alur Pitching berurutan, RAB/Quotation untuk Finance dengan review PM, status visual tahap, dan auto-konversi setelah kontrak lengkap.
- `prospek-management`: proyek anak Prospek diberi label pada card, section Groups dihapus dari Projects, dan konversi otomatis memperbarui status Prospek.
- `table-list-views`: pagination Projects/Prospek dan toggle Card/Table pada Prospek.
- `simpro-kanban-delivery`: Board SIMPRO dipindahkan ke tab CRM Project Detail dan Detail Proyek SIMPRO tidak lagi menjadi lokasi utama board.

## Impact

- Navigasi dan route: `src/components/prototype/shell.tsx`, route `/dashboard`, `/projects`, dan `/projects/[id]/*`.
- CRM Project Detail: `src/components/prototype/crm/project-detail.tsx`, komponen Board/Backlog/Forms yang dipindahkan dari `src/components/prototype/simpro/`.
- Projects dan Prospek: `src/components/prototype/crm/projects.tsx`, `src/components/prototype/crm/prospek.tsx`, `project-card.tsx`, serta komponen pagination yang sudah ada di `src/components/ui/list-pagination-bar.tsx`.
- Pitching: `src/components/prototype/crm/pitching-detail.tsx`, panel RAB/Quotation/Form/Decision, `src/lib/prototype/domain.ts`, `src/lib/prototype/store.ts`, dan tipe Pitching.
- Template dan konversi: `src/lib/prototype/store.ts`, `src/lib/prototype/templates.ts`, Journey Management step management.
- Dokumentasi dan test: `Docs/Prospek.md`, `Docs/Stage-Types.md`, `AGENTS.md`, test lifecycle, prospek, pitching, table/list, dan navigasi.
