# Tasks

## 1. Navigasi dan route CRM–SIMPRO

- [x] 1.1 Sederhanakan `NAV_SIMPRO` agar hanya berisi My Tasks dan Forms; verifikasi role Finance/Assignee tetap melihat menu yang relevan dan Dashboard/Projects SIMPRO tidak muncul.
- [x] 1.2 Tambahkan redirect route lama `/dashboard` → `/crm` dan `/projects` → `/crm/projects`; verifikasi kedua route membuka halaman CRM yang setara.
- [x] 1.3 Redirect route Detail Proyek SIMPRO lama `board`, `backlog`, dan `forms` ke tab CRM yang sesuai; verifikasi deep link proyek masih membuka data proyek yang benar.
- [x] 1.4 Perbarui `AGENTS.md` dan `Docs/Stage-Types.md` tentang navigasi tunggal dan area SIMPRO; verifikasi dokumentasi tidak lagi menyebut Dashboard/Projects SIMPRO sebagai alur utama.

## 2. Tab Board, Backlog, dan Forms di Detail Proyek CRM

- [x] 2.1 Ekstrak komponen Board, Backlog, dan Forms dari halaman SIMPRO menjadi komponen bersama yang dapat dirender di CRM; verifikasi build tidak menyisakan duplikasi markup.
- [x] 2.2 Tambahkan tab `board`, `backlog`, dan `forms` pada `CrmProjectDetail` dengan sinkronisasi query `?tab=`; verifikasi kelima tab dapat dibuka dan bertahan setelah reload.
- [x] 2.3 Terapkan permission role dan aturan stage pada tab baru: Assignee hanya melihat pekerjaan miliknya, Finance hanya Form Keuangan relevan, dan stage selesai read-only; verifikasi dengan smoke test lintas role.
- [x] 2.4 Pastikan tab Forms CRM memuat Form proyek dan Form Keuangan tanpa menduplikasi halaman Forms global; verifikasi tautan form membuka halaman yang benar.
- [x] 2.5 Perbarui dokumentasi workspace proyek; verifikasi `Docs/Stage-Types.md` dan `AGENTS.md` menyebut lima tab CRM.

## 3. Projects datar, label Prospek, dan pagination

- [x] 3.1 Hapus section Groups, accordion Group, drag-and-drop Group, dan filter tipe Group dari halaman Projects; verifikasi daftar proyek tampil datar dalam Card dan Table.
- [x] 3.2 Tambahkan label `Prospek · <nama>` pada header card/table proyek dengan `prospekId` dan label `Umbrella Project` bila relevan; verifikasi proyek langsung tetap tanpa label.
- [x] 3.3 Tambahkan pagination Projects memakai `ListPaginationBar` dan `list-pagination.ts`; verifikasi perubahan pencarian/filter mereset halaman dan rentang data benar.
- [x] 3.4 Perbarui test/komponen Projects dan dokumentasi Groups; verifikasi halaman CRM Groups masih berfungsi meski section Groups hilang dari Projects.

## 4. Prospek Card/Table dan pagination

- [x] 4.1 Tambahkan toggle Card/Table pada halaman Prospek dengan preferensi `crm-prospek`; verifikasi Card tetap default dan pilihan bertahan setelah navigasi.
- [x] 4.2 Buat tabel Prospek dengan kolom kode/nama, client, PIC, periode, pagu, jumlah Pitching, jumlah menang, dan status; verifikasi filter/pencarian berlaku sama pada Card dan Table.
- [x] 4.3 Tambahkan pagination Prospek dengan `ListPaginationBar`; verifikasi pagination bekerja bersama filter status dan pencarian.
- [x] 4.4 Tambahkan test untuk preferensi view dan pagination Prospek; verifikasi `npm test` untuk test baru.
- [x] 4.5 Perbarui `Docs/Prospek.md` dan `AGENTS.md` tentang Table view dan pagination Prospek; verifikasi dokumentasi sesuai perilaku baru.

## 5. Alur Pitching berurutan dan review Finance

- [x] 5.1 Buat helper status tahap Pitching (RAB, Quotation, Form, Decision, Kontrak) yang menentukan selesai/aktif/terkunci dari data; verifikasi unit test untuk setiap kombinasi status.
- [x] 5.2 Batasi kandidat assignee RAB dan Quotation Pitching ke role Finance dan sesuaikan validasi store; verifikasi test assignment menolak non-Finance.
- [x] 5.3 Tambahkan status review RAB `approved`/`need_revision` beserta aksi PM review; verifikasi RAB baru membuka Quotation setelah approved.
- [x] 5.4 Gunakan status Quotation yang ada untuk review PM dan pastikan Form Pitching baru terbuka setelah Quotation approved; verifikasi test gate urutan.
- [x] 5.5 Terapkan gate Decision setelah RAB, Quotation, dan seluruh Form Pitching selesai; verifikasi keputusan ditolak bila tahap sebelumnya belum lengkap.
- [x] 5.6 Tampilkan warna berbeda untuk tahap selesai, aktif, dan terkunci pada halaman Pitching; verifikasi tiga kondisi terlihat jelas di UI.
- [x] 5.7 Perbarui `Docs/Prospek.md` dan test Pitching; verifikasi dokumentasi menyebut urutan, Finance-only, dan review PM.

## 6. Auto-konversi dan template Pitching

- [x] 6.1 Ubah konversi agar memakai template dan versi yang tersimpan pada Pitching serta menyalin stage menjadi step pending; verifikasi test konversi memeriksa step dan `templateVersion`.
- [x] 6.2 Implementasikan konversi otomatis semua Pitching menang dengan kontrak lengkap setelah kontrak disimpan atau keputusan menang; verifikasi idempotensi dan tidak ada proyek duplikat.
- [x] 6.3 Hapus tombol/aksi konversi manual dari UI dan ganti dengan status konversi otomatis; verifikasi tidak ada jalur konversi manual yang tersisa.
- [x] 6.4 Tambahkan backfill idempotent untuk Pitching menang + kontrak lengkap yang belum dikonversi; verifikasi migrasi dijalankan dua kali tanpa duplikasi.
- [x] 6.5 Verifikasi Journey Management dapat mengubah dan menghapus step pending hasil template tanpa mengubah template Pitching; tambahkan test lifecycle.
- [x] 6.6 Perbarui `Docs/Prospek.md`, `Docs/Stage-Types.md`, dan `AGENTS.md` tentang auto-konversi dan template; verifikasi dokumentasi sesuai.

## 7. Verifikasi integrasi

- [x] 7.1 Jalankan `npm run build`, `npm run lint`, dan `npm test`; verifikasi semuanya lolos tanpa error baru.
- [x] 7.2 Smoke test navigasi: SIMPRO hanya My Tasks/Forms, route lama mengarah ke CRM, dan Detail Proyek CRM memiliki lima tab.
- [x] 7.3 Smoke test Projects/Prospek: daftar datar, label Prospek, Card/Table, filter, dan pagination bekerja.
- [x] 7.4 Smoke test Pitching: urutan RAB → Quotation → Form → Decision → Kontrak, review PM, warna tahap, auto-konversi, dan step template pada proyek hasil Prospek.
- [x] 7.5 Regresi: pastikan My Tasks, Forms, gate, progress, Groups page, dan Board SIMPRO yang dipindahkan tidak berubah perilakunya.

## Workflow follow-up

- Arsipkan change setelah review dan implementasi disetujui.
- Verifikasi hasil arsip dan sinkronisasi spec.
