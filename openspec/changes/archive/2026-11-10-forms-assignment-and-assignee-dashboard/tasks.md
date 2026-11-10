# Tasks

## 1. Penugasan Form dari menu Forms

- [x] 1.1 Perluas visibilitas Form Keuangan di SIMPRO Forms agar Manager melihat form pada proyek yang dapat diakses; verifikasi dengan tes `simpro-forms`.
- [x] 1.2 Tambah helper kandidat assignee Form Keuangan (RAB/Invoice/Pembayaran → Finance; BAST → Finance/Media) dan izin assign hanya Admin/Manager; verifikasi dengan `tests/business-revenue.test.ts`.
- [x] 1.3 Tambah kontrol Assign pada baris Form Keuangan yang belum di-assign di menu Forms; verifikasi di browser.

## 2. Penugasan saat form dibuka

- [x] 2.1 Tampilkan panel Penugasan pada halaman Form Keuangan tanpa assignee untuk Admin/Manager, dengan kandidat sesuai jenis form; verifikasi assign tersimpan dan status menjadi assigned.
- [x] 2.2 Pastikan halaman entri Form tetap menampilkan panel Penugasan untuk entri yang belum di-assign; verifikasi dengan tes assignFormEntry.

## 3. Stepper Prospek

- [x] 3.1 Tampilkan fase Prospek pada stepper header ketika proyek memiliki step Prospek; verifikasi dengan tes `stepper` dan browser (tab Prospek + 2 step).

## 4. Dashboard SIMPRO Assignee

- [x] 4.1 Render `SimproDashboard` pada route `/dashboard` dan tampilkan menu Dashboard untuk role SIMPRO.
- [x] 4.2 Batasi data task dashboard untuk Assignee dan Media; tampilkan banner, empat kartu ringkasan, distribusi task, progress overview, Task saya, Recent projects, dan Upcoming deadlines.
- [x] 4.3 Sembunyikan menu Projects SIMPRO untuk Assignee/Media (detail proyek CRM tidak dapat diakses) dan arahkan tautan proyek dashboard ke My Tasks untuk mereka.
- [x] 4.4 Verifikasi tampilan dashboard Assignee di browser dan bandingkan dengan referensi desain.

## 5. Verifikasi dan dokumentasi

- [x] 5.1 Jalankan `npm run build`, `npm run lint`, dan `npm test`; verifikasi semuanya lulus (137 tes).
- [x] 5.2 Perbarui `AGENTS.md` dan `Docs/Stage-Types.md` untuk aturan penugasan Form, stepper Prospek, dan dashboard SIMPRO Assignee.
