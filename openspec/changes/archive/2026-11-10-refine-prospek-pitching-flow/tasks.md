# Tasks

## 1. Data model dan migrasi

- [x] 1.1 Tambah field opsional `statusBeforeLoss`, `lostAt`, `lostById`, `lossUndoneAt`, `contractAssigneeId`, `contractDueDate`, dan `contractStatus` pada `ProspekPitching`, serta `prospekId?` pada `ProjectGroup`; verifikasi `npm run build` tidak melaporkan error tipe.
- [x] 1.2 Bump persist version ke 6 dan tambahkan migrasi additive untuk field/collection baru; verifikasi test menjalankan migrasi dua kali dan hasilnya idempotent.
- [x] 1.3 Perbarui seed demo agar satu Pitching kalah menyimpan status sebelum kalah dan satu Pitching menang memiliki assignment kontrak; verifikasi `npm test` tetap lulus.

## 2. Domain akses dan assignment Prospek

- [x] 2.1 Tambah `isProspekAssignee` (Assignee, Manager, Finance), `prospekAssigneeCandidates`, dan helper permission assignment Prospek; verifikasi unit test untuk ketiga role.
- [x] 2.2 Ubah `canViewProspek`/`visibleProspeks` agar Assignee dan Finance tidak memiliki akses Prospek; verifikasi test akses per role.
- [x] 2.3 Tambah `prospekWorkItemsForUser` yang memproyeksikan RAB, Quotation, Kontrak, dan FormEntry Prospek yang di-assign beserta status aktifnya; verifikasi test setiap jenis work item dan status selesai.
- [x] 2.4 Tambah helper permission untuk assignment kontrak dan work item kontrak; verifikasi test PM/Manager/Admin dapat assign ke Assignee/Manager/Finance dan role lain ditolak.
- [x] 2.5 Perbarui test permission Prospek yang ada agar ekspektasi Assignee/Finance berubah menjadi tanpa akses; verifikasi seluruh test permission lulus.

## 3. Kalah kapan saja dan undo

- [x] 3.1 Implementasikan aksi kalah untuk Pitching apa pun yang belum dikonversi tanpa syarat RAB/Quotation, wajib alasan, dan langsung masuk arsip; verifikasi test Pitching draft dan menang dapat kalah.
- [x] 3.2 Implementasikan undo kalah yang mengembalikan `statusBeforeLoss`, membersihkan field kalah, dan membuka kembali pengeditan; verifikasi test undo untuk Pitching draft dan menang.
- [x] 3.3 Blokir kalah dan undo untuk Pitching yang sudah dikonversi serta batasi aksi ke PM pemilik/Admin; verifikasi test penolakan role dan proyek anak.
- [x] 3.4 Pisahkan aturan keputusan menang (tetap memerlukan RAB submitted dan Quotation submitted/approved) dari aturan kalah; verifikasi test menang tetap ditolak saat syarat belum siap.
- [x] 3.5 Catat event audit `pitching.lost` dan `pitching.loss_undone` beserta status sebelum/sesudah; verifikasi test isi event.

## 4. Kontrak setelah menang dan assignment

- [x] 4.1 Kunci section Kontrak saat Pitching masih draft dan tampilkan penjelasan; verifikasi test dan tampilan bahwa penyimpanan kontrak ditolak sebelum menang.
- [x] 4.2 Implementasikan `assignPitchingContract` beserta `contractAssigneeId`, `contractDueDate`, `contractStatus`, dan notifikasi in-app; verifikasi test assignment ke Assignee, Manager, dan Finance.
- [x] 4.3 Perbarui status kontrak menjadi draft/submitted saat disimpan dan tetap read-only setelah konversi; verifikasi test transisi status dan penguncian.
- [x] 4.4 Pastikan pekerjaan kontrak muncul di My Tasks penerima dan hilang setelah kontrak lengkap; verifikasi test work item.

## 5. Konversi otomatis ke Group Prospek

- [x] 5.1 Tambah helper `ensureProspekGroup` yang mencari Group aktif dengan nama Prospek (trim, case-insensitive) atau membuat Group baru; verifikasi test create dan reuse.
- [x] 5.2 Hubungkan `convertPitching` agar mengisi `groupId` anak proyek dan `prospekId` Group; verifikasi test anak proyek masuk Group yang benar.
- [x] 5.3 Pastikan beberapa Pitching menang dari Prospek yang sama memakai Group yang sama; verifikasi test dua anak proyek dalam satu Group.
- [x] 5.4 Catat event audit pembuatan/penautan Group dan konversi; verifikasi test isi event.
- [x] 5.5 Pastikan Group lama tanpa `prospekId` tetap valid dan tidak dibuat duplikat saat konversi; verifikasi test migrasi dan reuse.

## 6. Work inbox dan akses terbatas

- [x] 6.1 Tambah grup "Prospek" pada My Tasks yang menampilkan `prospekWorkItemsForUser` dengan tautan kerja; verifikasi lewat browser.
- [x] 6.2 Tambahkan FormEntry Prospek yang di-assign ke halaman Forms; verifikasi Form muncul untuk Assignee/Finance tanpa membuka Prospek.
- [x] 6.3 Buat route `/work/prospek/[pitchingId]/[section]` yang hanya menampilkan konteks Pitching dan work item terbatas; verifikasi Assignee/Finance dapat membuka pekerjaan tanpa data Prospek.
- [x] 6.4 Sesuaikan shell/role access: Assignee tidak dapat membuka `/crm/prospek`, Finance hanya boleh membuka `/my-tasks`, `/forms`, dan `/work/prospek/*`; verifikasi dengan role switcher.
- [x] 6.5 Pastikan assignment RAB, Quotation, Form, dan Kontrak mengirim notifikasi in-app dan menautkan ke route kerja yang benar; verifikasi test notifikasi.
- [x] 6.6 Perbarui `AGENTS.md` dan `Docs/Prospek.md` dengan aturan akses baru, work inbox, dan route kerja; verifikasi dokumentasi cocok dengan perilaku yang diuji.

## 7. Card Pitching dan halaman Pitching

- [x] 7.1 Ganti accordion Pitching pada detail Prospek menjadi card ringkas berisi status, RAB, Quotation, kelengkapan kontrak, assignee, due date, dan tautan proyek; verifikasi lewat browser.
- [x] 7.2 Buat halaman `/crm/prospek/[id]/pitching/[pitchingId]` dengan section RAB, Quotation, Form Pitching, Kontrak, dan Finishing; verifikasi navigasi card dan deep link.
- [x] 7.3 Pindahkan panel RAB, Quotation, Form, dan Kontrak dari accordion ke halaman Pitching; verifikasi alur isi/submit lewat browser.
- [x] 7.4 Isi section Finishing dengan keputusan menang/kalah, undo kalah, kelengkapan kontrak, konversi, dan riwayat; verifikasi aksi lewat browser.
- [x] 7.5 Tampilkan Pitching kalah di arsip card dan halaman read-only dengan tombol undo bagi PM/Admin; verifikasi lewat browser.

## 8. Tampilan Table/List

- [x] 8.1 Buat komponen `ViewToggle` bersama dan helper preferensi localStorage per halaman dengan default Card; verifikasi toggle bertahan setelah reload.
- [x] 8.2 Tambah tampilan Table pada CRM Projects dengan kolom proyek, client, status, fase, progress, dan anggota; verifikasi filter/pencarian dan empty state.
- [x] 8.3 Tambah tampilan Table pada CRM Groups dengan kolom nama, deskripsi, jumlah proyek, dan progress; verifikasi filter dan empty state.
- [x] 8.4 Tambah tampilan Table pada Forms untuk Form proyek dan Form Pitching dengan kolom nama, konteks, assignee, status, due date, dan submit; verifikasi kedua sumber data.
- [x] 8.5 Pastikan preferensi Card/Table terpisah per halaman dan tidak saling menimpa; verifikasi lewat browser.
- [x] 8.6 Perbarui `AGENTS.md` dengan kemampuan toggle Card/Table dan halaman yang memilikinya; verifikasi dokumentasi cocok.

## 9. Verifikasi integrasi

- [x] 9.1 Jalankan `npm run build`, `npm run lint`, dan `npm test`; verifikasi semuanya lulus tanpa error baru.
- [x] 9.2 Jalankan smoke test browser: buka card Pitching â†’ isi RAB/Quotation â†’ menang â†’ isi kontrak â†’ kalah + undo â†’ konversi â†’ cek Group otomatis â†’ cek My Tasks/Forms dan table view.
- [x] 9.3 Jalankan `openspec.cmd validate "refine-prospek-pitching-flow" --strict`; verifikasi change dinyatakan valid.

## Workflow follow-up

- Arsipkan change setelah review dan verifikasi disetujui.
- Verifikasi hasil arsip dan sinkronisasi spec utama.
