# Tasks

## 1. Project workspace tabs and manual journey

- [x] 1.1 Tambah tab Overview, Journey Management, dan Board pada detail proyek dengan query `tab`, default Overview, dan berlaku untuk proyek legacy; verifikasi deep-link dan role walkthrough.
- [x] 1.2 Pindahkan Asal Prospek, Riwayat Aktivitas, dan Penyelesaian Tahap ke Overview; verifikasi data snapshot, event, dan status step tampil.
- [x] 1.3 Ubah pembuatan proyek baru menjadi manual-only tanpa pilihan template/step, dan ubah konversi Prospek agar membuat anak proyek manual tanpa step; verifikasi test dan UI.
- [x] 1.4 Pastikan memulai dari Planning tidak membuat step Running, sedangkan memulai dari Running menandai Planning Dilewati; verifikasi test lifecycle.
- [x] 1.5 Sesuaikan Journey Management agar PM/Admin dapat membuat step bernama bebas pada fase aktif atau fase berikutnya, mengubah, menghapus, dan mereorder step pending; verifikasi test permission dan audit.
- [x] 1.6 Embed board SIMPRO pada tab Board dengan filter step aktif dan referensi task ke SIMPRO; verifikasi board tampil dan task dapat dibuka.
- [x] 1.7 Perbarui `AGENTS.md`, `Docs/Stage-Types.md`, dan `Docs/Prospek.md` untuk tiga tab dan journey manual; verifikasi dokumentasi cocok.
- [x] 1.8 Izinkan PM/Admin mengelola seluruh step pending Planning dan Running kapan saja selama proyek aktif, termasuk menambah step Running saat Planning aktif; verifikasi test dan UI.
- [x] 1.9 Tampilkan tombol Selesaikan Tahap di bawah header pada Overview, Journey Management, dan Board; verifikasi lewat browser.
- [x] 1.10 Buat tab Board mengikuti step yang dipilih di Journey Management; verifikasi task berubah sesuai step.
- [x] 1.11 Tambahkan opsi Edit Step untuk nama, deskripsi, dan Manager PIC; verifikasi test permission dan UI.
- [x] 1.12 Tampilkan distribusi task SIMPRO dan progress task proyek pada Overview; verifikasi hitungan per status.

## 2. Prospek work in SIMPRO Forms

- [x] 2.1 Tambah kategori `Prospek`/`Project` pada baris Forms dan filter kategori; verifikasi Form proyek tetap berkategori Project.
- [x] 2.2 Tampilkan RAB, Quotation, Kontrak, dan Form Pitching yang di-assign kepada Assignee/Manager/Finance di Forms SIMPRO dengan kategori Prospek dan tautan kerja; verifikasi test work item dan UI.
- [x] 2.3 Pastikan pekerjaan Prospek selesai menghilang dari daftar aktif Forms dan tidak membocorkan data Prospek ke role tanpa akses; verifikasi test akses.

## 3. Link Pekerjaan save and validation

- [x] 3.1 Ubah validasi Link Pekerjaan menjadi wajib non-empty tanpa validasi protokol/URL; verifikasi test transisi In Progress.
- [x] 3.2 Tambah tombol Simpan pada input Link Pekerjaan yang memanggil update link dan mencatat audit before/after; verifikasi test dan UI.
- [x] 3.3 Tampilkan link non-URL sebagai teks dan URL sebagai tautan; verifikasi role visibility PM/Manager/Admin/assignee.
- [x] 3.4 Beri PM/Admin akses memindahkan card ke status mana pun selama sudah ada assignee, dengan Link Pekerjaan tetap wajib sebelum In Progress; verifikasi test dan UI.
- [x] 3.5 Filter tahap Board SIMPRO untuk Assignee hanya step aktif dan selesai, dengan step selesai read-only; verifikasi test dan UI.

## 4. Projects table Prospek column

- [x] 4.1 Tambah kolom Prospek pada tabel Projects dengan tautan ke Prospek asal dan “—” untuk proyek langsung; verifikasi tampilan dan filter.

## 5. Verifikasi integrasi

- [x] 5.1 Tambah/perbarui test domain untuk tab lifecycle, manual journey, Forms kategori, link non-URL, dan kolom Prospek.
- [x] 5.2 Jalankan `npm test`, `npm run lint`, dan `npm run build`; verifikasi seluruh regresi Prospek, Groups, legacy, dan Kanban lulus.
- [x] 5.3 Jalankan `openspec.cmd validate "add-project-workspace-tabs" --strict`; verifikasi change valid.

## Workflow follow-up

- Arsipkan change setelah review dan verifikasi disetujui.
- Verifikasi hasil arsip dan sinkronisasi spec utama.



