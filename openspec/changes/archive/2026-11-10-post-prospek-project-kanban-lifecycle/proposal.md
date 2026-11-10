# Proposal

## Why

Proyek hasil Prospek saat ini masih mengikuti journey template lama yang mencampur fase Prospek dengan eksekusi proyek, mengunci struktur step setelah dibuat, dan memakai perilaku penyelesaian task yang belum mewajibkan tautan hasil kerja. Alur baru memisahkan komitmen Prospek dari eksekusi anak proyek, memberi PM kendali ber-audit atas step, dan menyediakan handoff yang jelas dari Kanban SIMPRO ke Form Keuangan hingga proyek selesai.

## What Changes

- Ubah journey proyek baru menjadi Planning → Running → Finance; fase Prospek tidak menjadi step anak proyek. Ganti label/data `Closing` menjadi `Finance` dengan migrasi otomatis yang mempertahankan fungsi proyek lama.
- Sediakan pembuatan proyek dari template atau secara manual, status kartu `NEW Project`, pemilihan fase awal, aktivasi step bertahap, dan penutupan fase yang tercatat.
- Izinkan PM pemilik/Admin mengelola step yang belum dimulai setelah pembuatan; step berjalan/selesai hanya boleh mengubah nama, Manager PIC, dan deskripsi. Hitung progres manual sebagai jumlah step, bukan persen.
- Terapkan workflow card Kanban Planning/Running: assignment Manager mana pun, link pekerjaan wajib sebelum In Progress, review PM, pembatalan card terbatas, serta syarat step selesai yang tidak menerima Kanban kosong.
- Jadikan Finance fase CRM berbasis Form Keuangan (BAST, Invoice, Pembayaran) tanpa Kanban, dan tampilkan data Prospek/kontrak/termin sebagai header dan referensi Finance tanpa meminta input ulang.
- Tampilkan anak proyek Prospek sebagai kartu tersendiri di Projects selain tetap berada pada accordion Group; label Prospek dapat dicari, difilter, dan diklik. Perilaku Groups dan group manual tetap.
- **BREAKING (data internal, dimitigasi migrasi):** fase persisted `closing` menjadi `finance`; proyek lama dengan fase Prospek tetap dipertahankan sebagai journey legacy, bukan dipaksa masuk alur baru.

## Capabilities

### New Capabilities
- `project-lifecycle`: Siklus hidup proyek tiga fase, pembuatan template/manual, startup, pengelolaan step, progress, finance, dan kompatibilitas proyek legacy.
- `simpro-kanban-delivery`: Aturan Kanban SIMPRO per step, assignment, Link Pekerjaan, review, penghapusan terbatas, syarat penyelesaian, dan audit.

### Modified Capabilities
- `prospek-management`: Konversi Pitching membawa metadata Prospek ke header proyek dan anak proyek diberi tautan/label navigasi Prospek di Projects tanpa mengubah Groups.
- `prospek-pitching`: Termine kontrak menjadi acuan pada fase Finance, menggantikan label fase Closing.

## Impact

- Domain dan persist/migrasi: `src/lib/prototype/types.ts`, `domain.ts`, `stepper.ts`, `templates.ts`, `store.ts`, `events.ts`.
- UI CRM/SIMPRO: pembuatan/detail proyek, stepper dan history, daftar/kartu Projects, Kanban board/card/dialog, serta halaman Finance.
- Test: `tests/templates.test.ts`, `tests/stage-types.test.ts`, `tests/domain.test.ts`, `tests/events.test.ts`, `tests/prospek.test.ts`, dan test baru untuk lifecycle/kanban.
- Tidak menambah backend atau integrasi eksternal; data tetap berada di Zustand/localStorage. Groups dan data legacy harus tetap dapat dibaca tanpa migrasi manual.

## Keputusan sebelum implementasi

Brief mengusulkan empat keputusan berikut; proposal dan spesifikasi memakai pilihan ini sementara. Minta konfirmasi pemilik produk sebelum apply:

1. Finance menggunakan Form Keuangan (BAST, Invoice, Pembayaran), bukan Kanban.
2. Hanya PM pemilik dan Admin yang boleh mengubah struktur/step proyek.
3. Card hanya boleh dihapus/dibatalkan saat Backlog atau To Do.
4. Manager PIC template wajib ditetapkan sebelum step template diaktifkan.

Keputusan kompatibilitas yang sudah dikonfirmasi: pertahankan fase Prospek pada proyek legacy yang telah ada, gunakan tiga fase saja untuk proyek baru/hasil konversi, dan migrasikan Closing lama ke Finance. Anak proyek Prospek muncul sebagai kartu di daftar Projects dan tetap tampil di accordion Group. Template Umum enam step dipertahankan sebagai legacy; tambahkan template Umum Eksekusi, update seed KOL/Event, dan pertahankan template custom yang tidak kompatibel sampai diedit/duplikasi.
