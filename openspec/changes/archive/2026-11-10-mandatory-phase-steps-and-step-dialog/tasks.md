# Tasks

## 1. Aturan step wajib

- [x] 1.1 Tambah modul `src/lib/prototype/mandatory-steps.ts` berisi RAB + Decision (Prospek) dan BAST + Invoice (Finance), helper pencocokan, `ensureMandatoryStages`, dan `missingMandatoryProjectSteps`; verifikasi dengan `tests/mandatory-steps.test.ts`.
- [x] 1.2 Terapkan validasi wajib pada `validateTemplateStages` (kecuali template legacy) dan pastikan RAB berada sebelum Decision; verifikasi tes validasi menolak template tanpa RAB.
- [x] 1.3 Pastikan `saveTemplate` dan `createProject` mode template menambahkan step wajib otomatis; verifikasi proyek template memuat RAB, Decision, BAST, dan Invoice.

## 2. Fase Prospek opsional

- [x] 2.1 Izinkan `isNewProjectTemplate` menerima fase Prospek yang lengkap (RAB + Decision) dan tetap mensyaratkan Planning/Running SIMPRO serta Finance finance_form; verifikasi template Prospek muncul sebagai pilihan pembuatan proyek.
- [x] 2.2 Perluas `startProject` agar menerima fase Prospek dan menolak start Planning/Running bila proyek memiliki step Prospek; verifikasi `initialPhase` menjadi Prospek dan step RAB aktif.
- [x] 2.3 Tampilkan tombol `Mulai dari Prospek` pada kartu start dan sembunyikan opsi Planning/Running untuk proyek Prospek; verifikasi di browser.
- [x] 2.4 Tambah RAB pada template KOL (versi 3) agar lolos aturan wajib; verifikasi `validateTemplateStages` KOL valid.

## 3. Label wajib/opsional

- [x] 3.1 Tampilkan badge `Wajib`/`Opsional` per step serta ringkasan jumlah pada pembuatan proyek; verifikasi label tampil di browser.
- [x] 3.2 Kunci hapus/ubah jenis step wajib dan tampilkan badge pada editor template; verifikasi template Prospek tidak dapat menghapus RAB/Decision/BAST/Invoice.
- [x] 3.3 Tampilkan badge `Wajib`/`Opsional` pada daftar step di Journey Management.

## 4. Dialog dan pemilihan step

- [x] 4.1 Ganti prompt Tambah Step dengan dialog (nama, fase, jenis, form/gerbang, Manager PIC, deskripsi); verifikasi step masuk ke fase yang dipilih, bukan Running.
- [x] 4.2 Ganti prompt Edit Step dengan dialog yang memuat nama, deskripsi, dan Manager PIC; verifikasi perubahan tersimpan.
- [x] 4.3 Hapus kartu `Pilih Step` dan pastikan pemilihan fase/step lewat stepper header menampilkan panel yang sesuai; verifikasi di browser.

## 6. Prospek opt-in dan Kelola fase

- [x] 6.1 Tambah fase Prospek (RAB + Decision Win / Loss) pada template Event Eksekusi dan rapikan template Event; naikkan versi template.
- [x] 6.2 Ubah pembuatan proyek agar Prospek tidak default dan menyediakan tombol `Tambah tahapan Prospek`/`Hapus tahapan Prospek` pada mode template maupun Manual.
- [x] 6.3 Mode Manual otomatis membuat step Finance BAST + Invoice saat proyek dibuat, dengan opsi Prospek dan keterangan bahwa step lain diatur di Journey Management.
- [x] 6.4 Buat `Kelola fase` mengikuti fase yang dipilih pada stepper header, termasuk default fase dialog dan tombol selesai fase.
- [x] 6.5 Perbarui tes pembuatan proyek (default tanpa Prospek, Prospek opt-in, Manual Finance/Prospek) dan verifikasi `npm test`.
- [x] 6.6 Verifikasi browser: toggle Prospek, mode Manual, dan perpindahan fase Planning/Running pada Kelola fase; jalankan build/lint.

## 5. Verifikasi

- [x] 5.1 Jalankan `npm run build`, `npm run lint`, dan `npm test`; verifikasi semuanya lulus (130 tes, 14 file).
- [x] 5.2 Smoke-test browser: buat proyek dari template Prospek, cek label Wajib/Opsional, mulai dari Prospek, dan tambahkan step ke fase Planning lewat dialog.
- [x] 5.3 Perbarui `AGENTS.md` dan `Docs/Stage-Types.md` agar menjelaskan fase Prospek opsional, step wajib per fase, dan UX dialog step.
