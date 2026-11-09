# Tasks

## 1. Data model dan migrasi

- [x] 1.1 Tambah `managerId?: string` pada tipe `Project`, lalu verifikasi `npm run build` tidak mengeluh tentang tipe proyek lama.
- [x] 1.2 Bump versi persist dan tambahkan migrasi yang mengisi `managerId: undefined` untuk proyek lama; verifikasi migrasi idempotent lewat test yang menjalankan migrasi dua kali.
- [x] 1.3 Isi `managerId` pada beberapa proyek seed demo dan pastikan data seed tetap lolos `npm test`.
- [x] 1.4 Tambah event audit `project.manager_assigned` / `project.manager_changed` saat Manager proyek ditetapkan atau berubah, dan verifikasi event berisi Manager sebelum/sesudah lewat test events.

## 2. Domain permission dan aturan assignment

- [x] 2.1 Tambah helper `canAssignProjectManager`, `isOperationalAssignee`, `canAssignOperational`, `canWorkTask`, dan `canWorkFormEntry`; verifikasi dengan unit test permission.
- [x] 2.2 Ubah `taskTransition` agar Manager assignee bisa `To Do → In Progress → Awaiting Approval`, dan PM pemilik hanya boleh assign ke Manager proyek; verifikasi test transisi dan scope PM.
- [x] 2.3 Ubah `canEditFormEntry` agar Manager assignee bisa menyimpan draft dan submit entri Form miliknya; verifikasi test permission Form entry.
- [x] 2.4 Ubah `workloadRows` agar Manager dengan task/form aktif ikut dihitung tanpa menampilkan Manager kosong; verifikasi test workload.
- [x] 2.5 Pastikan Manager assignee tidak mendapat hak review task/form; verifikasi test negatif review.

## 3. Penunjukan Manager proyek

- [x] 3.1 Tambah pilihan Manager penanggung jawab pada halaman buat proyek dan Edit Proyek; hanya user role Manager yang muncul; verifikasi dengan test validasi role dan build UI.
- [x] 3.2 Simpan `managerId` lewat aksi store `createProject`/`updateProject` dan kirim notifikasi ke Manager baru; verifikasi test store dan notifikasi.
- [x] 3.3 Tampilkan Manager penanggung jawab di header dan tim proyek; verifikasi dengan memeriksa `projectTeam`/render proyek di test atau smoke check.
- [x] 3.4 Pastikan PM non-pemilik dan role lain tidak bisa mengubah Manager proyek; verifikasi test permission.
- [x] 3.5 Perbarui `AGENTS.md` dan `Docs/Stage-Types.md` (atau dokumen terkait) tentang Manager penanggung jawab; verifikasi dokumentasi menyebut field dan batas aksesnya.

## 4. Assignment operasional ke Manager

- [x] 4.1 Ubah kandidat assignee task agar mencakup Manager dan Assignee; PM pemilik hanya melihat Manager proyeknya; verifikasi test helper kandidat dan UI TaskDialog.
- [x] 4.2 Tambah validasi di store `assignTask` agar PM hanya bisa assign ke Manager proyek dan Manager/Admin tetap bisa assign ke Assignee/Manager; verifikasi test store.
- [x] 4.3 Ubah kandidat assignee entri Form dan validasi store `assignFormEntry` dengan aturan yang sama; verifikasi test assignment Form entry.
- [x] 4.4 Izinkan Manager assignee memulai task, submit review, dan mengisi/submit Form entry; verifikasi test eksekusi Manager.
- [x] 4.5 Pastikan task dan Form Manager muncul di My Tasks/Forms dan workload; verifikasi test tampilan data dan hitungan.
- [x] 4.6 Perbarui dokumentasi product rules tentang Manager sebagai assignee operasional; verifikasi dokumentasi menyebut batas PM dan hak eksekusi Manager.

## 5. Verifikasi integrasi

- [x] 5.1 Jalankan `npm run build`, `npm run lint`, dan `npm test`; verifikasi semuanya lolos tanpa error baru.
- [x] 5.2 Smoke test alur: PM membuat proyek dan memilih Manager, Manager tampil di tim, PM assign task/form ke Manager proyek, Manager mengerjakan, PM mereview, dan workload Manager bertambah.
- [x] 5.3 Regresi: pastikan alur Assignee lama, review PM, form Finance, gerbang, progress, dan permission lain tidak berubah.

## Workflow follow-up

- Arsipkan change setelah review dan implementasi disetujui.
- Verifikasi hasil arsip dan sinkronisasi spec.
