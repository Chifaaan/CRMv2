# Tasks

## 1. Data model dan migrasi persist

- [x] 1.1 Tambah tipe `Prospek`, `ProspekPitching`, `PitchingRab`, `PitchingQuotation`, `PitchingContract`, dan `Termine` di `src/lib/prototype/types.ts`, lalu verifikasi `npm run build` tidak melaporkan error tipe.
- [x] 1.2 Tambah koleksi `prospeks`, `prospekPitchings`, `pitchingRabs`, `pitchingQuotations`, dan `prospekEvents` ke `AppState`, lalu verifikasi type-check penuh lulus.
- [x] 1.3 Ubah `FormEntry` agar memiliki `scope: "project" | "prospek"`, `projectId` opsional, serta `prospekId?` dan `pitchingId?`; verifikasi `npm run build` dan pemakaian Form proyek lama tetap lolos type-check.
- [x] 1.4 Bump persist version ke 5 dan tambahkan migrasi additive yang mengisi koleksi baru serta `scope: "project"` pada entri Form lama; verifikasi test menjalankan migrasi dua kali dan hasilnya idempotent.
- [x] 1.5 Isi seed demo dengan minimal dua Prospek (satu berisi Pitching menang dan kalah, satu berisi Pitching draft) beserta RAB, Quotation, Form, dan kontrak; verifikasi `npm test` tetap lulus.

## 2. Domain permission dan aturan Prospek

- [x] 2.1 Tambah helper `canManageProspek`, `canViewProspek`, `canDecidePitching`, `canEditPitchingRab`, `canEditQuotation`, dan `canConvertPitching` di `src/lib/prototype/domain.ts`; verifikasi dengan unit test permission tiap role.
- [x] 2.2 Tambah helper daftar Prospek yang terlihat per role (PM hanya miliknya, Manager/Admin semua, Assignee hanya yang punya pekerjaan, Finance tidak sama sekali); verifikasi dengan test filter.
- [x] 2.3 Tambah helper ringkasan pagu yang menjumlahkan RAB submitted dan `amount` Quotation submitted/approved per Pitching; verifikasi test untuk kondisi di bawah, sama dengan, dan di atas pagu.
- [x] 2.4 Tambah aturan status Prospek (aktif, selesai otomatis saat semua Pitching diputuskan dan pemenang dikonversi, batal wajib alasan dan read-only); verifikasi dengan test transisi status.

## 3. Store Prospek dan Pitching

- [x] 3.1 Implementasikan `createProspek`, `updateProspek`, dan `cancelProspek` dengan kode unik, validasi field, dan event audit; verifikasi test pembuatan, validasi, pembatalan, dan isi event.
- [x] 3.2 Implementasikan `addPitching` dan `updatePitching` dengan template wajib serta status draft; verifikasi test Pitching tanpa template ditolak dan banyak Pitching dalam satu Prospek tampil terpisah.
- [x] 3.3 Implementasikan penyimpanan dan submit RAB per Pitching (manpower/biaya, catatan, assignee, due date, versi, submitter/tanggal); verifikasi test versi lama tetap ada dan submit tanpa item ditolak.
- [x] 3.4 Implementasikan penyimpanan dan submit Quotation mode link/PDF beserta assignee, `amount` opsional, versi, dan approval PM/Admin; verifikasi test link invalid, PDF kosong, dan approval ditolak untuk role yang salah.
- [x] 3.5 Implementasikan pembacaan riwayat event Prospek dengan urutan waktu dan pagination; verifikasi test memuat event terbaru lebih dulu dan halaman berikutnya stabil.

## 4. Mesin Form dalam scope Prospek

- [x] 4.1 Perluas `createFormEntry` agar mendukung `scope: "prospek"` dengan `prospekId`, `pitchingId`, dan `templateStageId` dari template Pitching; verifikasi test entri memakai field template yang dipilih.
- [x] 4.2 Sesuaikan assignment entri Form Prospek dengan `operationalAssigneeCandidates` dan aturan PM pemilik hanya ke Manager proyek; verifikasi test PM, Manager, dan Assignee.
- [x] 4.3 Sesuaikan submit, versi, dan review entri Form Prospek agar memakai perilaku Form yang ada; verifikasi test submit assignee, review PM, dan permintaan revisi.
- [x] 4.4 Pastikan entri Form Prospek muncul di Forms badge dan daftar tugas assignee tanpa muncul di My Tasks; verifikasi test badge dan filter daftar.
- [x] 4.5 Kunci seluruh entri Form Pitching yang kalah dari pengeditan dan tampilkan sebagai riwayat; verifikasi test edit/submit ditolak setelah kalah.

## 5. Decision, kontrak, dan konversi

- [x] 5.1 Implementasikan keputusan menang/kalah dengan syarat RAB submitted dan Quotation submitted/approved serta alasan wajib untuk kalah; verifikasi test tiap syarat dan penolakan role selain PM pemilik/Admin.
- [x] 5.2 Implementasikan penguncian Pitching kalah beserta RAB, Quotation, Form, dan kontraknya sebagai riwayat read-only; verifikasi test semua aksi edit ditolak.
- [x] 5.3 Implementasikan penyimpanan kontrak (nomor, tanggal, nilai, berkas, minimal satu Termine) dan validasi field wajib; verifikasi test kontrak tidak lengkap ditolak dan kontrak lengkap tersimpan.
- [x] 5.4 Implementasikan `convertPitching` yang membuat proyek anak dengan `prospekId`, `pitchingId`, snapshot RAB/Quotation/kontrak, dan seluruh tahap fase Prospek selesai saat pembuatan; verifikasi test proyek anak dan status tahapnya.
- [x] 5.5 Pastikan konversi hanya untuk Pitching menang berkontrak lengkap, hanya PM pemilik/Admin, dan idempotent; verifikasi test konversi ganda tidak membuat proyek duplikat.
- [x] 5.6 Catat event `pitching.converted` berisi `prospekId`, `pitchingId`, dan id proyek anak; verifikasi test isi event dan aktor.

## 6. Pagu dan reminder

- [x] 6.1 Tampilkan status peringatan pagu pada ringkasan Prospek tanpa memblokir penyimpanan; verifikasi test aksi tetap berhasil saat pagu terlampaui.
- [x] 6.2 Implementasikan reminder in-app `prospek_assigned`, `prospek_due_soon` (ambang 3 hari), dan `prospek_overdue` dengan deduplikasi tipe + entitas + tanggal; verifikasi test tidak ada notifikasi ganda dan tidak ada email.
- [x] 6.3 Jalankan sinkronisasi reminder saat hidrasi dan saat assignee/due date berubah; verifikasi test notifikasi muncul sekali setelah aksi dan setelah reload state.

## 7. UI daftar dan detail Prospek

- [x] 7.1 Tambah menu Prospek ke `NAV_CRM`, rute `/crm/prospek` dan `/crm/prospek/[id]`, serta pemetaan judul halaman di shell; verifikasi halaman dapat dibuka dari sidebar.
- [x] 7.2 Buat halaman daftar Prospek dengan kartu menyerupai Group, filter status, empty state, dan dialog buat Prospek berisi PIC/client/periode/pagu; verifikasi lewat browser.
- [x] 7.3 Buat halaman detail Prospek berisi header, ringkasan pagu, dan daftar Pitching berbentuk accordion/kartu dengan status; verifikasi lewat browser.
- [x] 7.4 Terapkan tampilan berbasis role (PM hanya Prospek sendiri, Manager/Admin semua, Assignee hanya pekerjaan terkait, Finance tanpa akses); verifikasi dengan role switcher.
- [x] 7.5 Perbarui `AGENTS.md` dengan menu, rute, dan aturan Prospek yang baru; verifikasi dokumentasi cocok dengan perilaku yang diuji.

## 8. UI panel Pitching

- [x] 8.1 Buat panel RAB dengan item manpower/biaya, assignee, due date, submit, dan daftar versi; verifikasi alur isi dan submit lewat browser.
- [x] 8.2 Buat panel Quotation dengan pilihan Submit Link atau Import PDF, assignee, submit, approval, dan daftar versi; verifikasi kedua mode lewat browser.
- [x] 8.3 Buat panel Form Pitching dan halaman `/crm/prospek/[id]/forms/[entryId]` yang memakai ulang komponen isi/submit/review Form; verifikasi alur assignee dan PM lewat browser.
- [x] 8.4 Buat panel Kontrak dengan field wajib, unggah berkas, dan editor daftar Termine; verifikasi validasi dan penyimpanan lewat browser.
- [x] 8.5 Buat panel Decision dengan tombol menang/kalah, alasan kalah wajib, dan tombol konversi yang menampilkan syarat yang belum terpenuhi; verifikasi lewat browser.
- [x] 8.6 Buat panel Riwayat Pitching yang menampilkan event dan dokumentasi Pitching kalah tanpa tombol edit; verifikasi lewat browser.

## 9. Integrasi anak proyek dan Closing

- [x] 9.1 Tampilkan asal Prospek/Pitching serta RAB, Quotation, dan kontrak warisan pada detail proyek anak; verifikasi test dan tampilan proyek hasil konversi.
- [x] 9.2 Tampilkan daftar Termine kontrak sebagai acuan pembayaran di fase Closing anak proyek tanpa membuat form Invoice/Pembayaran otomatis; verifikasi test jumlah form finance tidak berubah setelah konversi.
- [x] 9.3 Pastikan board SIMPRO anak proyek tetap memakai enam status dan hanya menampilkan tahap setelah fase Prospek; verifikasi test dan halaman board.
- [x] 9.4 Perbarui `Docs/Stage-Types.md` (atau tambah `Docs/Prospek.md`) dengan alur Prospek, konversi, dan referensi Termine; verifikasi dokumen menyebut aturan yang diuji.

## 10. Verifikasi integrasi

- [x] 10.1 Jalankan `npm run build`, `npm run lint`, dan `npm test`; verifikasi semuanya lulus tanpa error baru.
- [x] 10.2 Jalankan smoke test browser: buat Prospek → tambah dua Pitching → isi RAB dan Quotation → putuskan satu menang dan satu kalah → lengkapi kontrak → konversi → buka anak proyek dan Closing; verifikasi seluruh langkah berhasil.
- [x] 10.3 Jalankan `openspec.cmd validate "add-prospek-umbrella-flow"`; verifikasi change dinyatakan valid.

## Workflow follow-up

- Arsipkan change setelah review dan verifikasi disetujui.
- Verifikasi hasil arsip dan sinkronisasi spec utama.
