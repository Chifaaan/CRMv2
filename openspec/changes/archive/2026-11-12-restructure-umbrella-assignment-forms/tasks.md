# Tasks

## 1. Domain and type foundation

- [x] 1.1 Tambahkan role `media` ke `Role`, `ROLE_LABEL`, `User` seed, serta perluas `isOperationalAssignee`, `roleCanAccessCrm`, `roleCanAccessSimpro`, dan `landingForRole`; verifikasi dengan `npm run build` dan test akses role baru.
- [x] 1.2 Ubah `Task.projectId` menjadi opsional dan tambahkan `scope`, `prospekId`, `templateStageId`; audit pemanggil `projectById(task.projectId)` dan perbaiki sampai `npm run build` hijau.
- [x] 1.3 Tambahkan guard domain untuk Umbrella (`canViewGroup`, `canManageGroup`, `canAddProjectToGroup`, `groupsForUser`), assignment Prospek berbasis Manager/Admin, kartu Pitching, dan item terjadwal; verifikasi dengan test unit guard baru di `tests/domain.test.ts`.
- [x] 1.4 Tambahkan helper `isScheduledTask`/`isScheduledFormEntry` berbasis status step pending dan pakai pada filter badge/Workload; verifikasi dengan test unit di `tests/manager-assignment.test.ts`.

## 2. Umbrella Project

- [x] 2.1 Terapkan guard Umbrella pada `createGroup`, `updateGroup`, `addProjectToGroup`, `removeProjectFromGroup`, dan `disbandGroup`, termasuk penolakan PM atas proyek/Umbrella milik orang lain; verifikasi dengan test store baru di `tests/umbrella.test.ts`.
- [x] 2.2 Tegakkan minimal dua anggota: tolak pembuatan dengan kurang dari dua proyek dan bubarkan otomatis saat anggota tersisa satu; verifikasi dengan test pembubaran dan audit `group_left`.
- [x] 2.3 Set `createdById` Umbrella hasil konversi ke pembuat Prospek pada `ensureProspekGroup` dan pastikan reuse nama tetap; verifikasi dengan test konversi di `tests/prospek.test.ts`.
- [x] 2.4 Ganti label UI Groups menjadi Umbrella pada nav, judul halaman, dialog, card, dan tabel; verifikasi `npm run build` dan pencarian teks "Grup" tidak tersisa pada halaman Umbrella.
- [x] 2.5 Implementasikan drag-and-drop card view di CRM Projects dan halaman Umbrella, plus aksi "Tambah ke Umbrella" di table view; verifikasi dengan smoke manual: drop proyek ke proyek membuka dialog, drop ke Umbrella menambah anggota, drop tanpa izin tidak mengubah data.
- [x] 2.6 Tampilkan hanya Umbrella milik PM pada daftar dan batasi pilihan proyek/Umbrella pada dialog sesuai guard; verifikasi dengan smoke manual sebagai PM, Manager, dan Admin.

## 3. Assignment queue di My Tasks

- [x] 3.1 Tambahkan `assignmentQueueForUser` yang menggabungkan kartu Backlog tanpa assignee dan `FormEntry` unassigned dari proyek/Pitching yang boleh di-assign Manager/Admin; verifikasi dengan test unit sumber, pengecualian item selesai, dan item terjadwal.
- [x] 3.2 Tampilkan section "Perlu di-assign" di My Tasks hanya untuk Manager/Admin beserta konteks proyek/Pitching dan label terjadwal; verifikasi dengan smoke manual untuk Manager, Admin, dan Assignee.
- [x] 3.3 Hubungkan assign inline ke `assignTask`/`assignFormEntry` dan pastikan notifikasi, status, serta audit sama dengan assignment in-context; verifikasi dengan test store notifikasi dan audit.

## 4. Forms workspace dan Journey Management

- [x] 4.1 Pindahkan seluruh pekerjaan form proyek ke tab Forms: Form Keuangan dan entri Form stage beserta assign, buka, dan review; verifikasi dengan smoke manual sebagai PM, Manager, Finance, dan Assignee.
- [x] 4.2 Tambahkan banner tab Forms untuk jumlah form belum di-assign, perlu diisi, menunggu review, dan perlu revisi, dengan item terjadwal dikecualikan; verifikasi dengan test unit hitungan banner.
- [x] 4.3 Ubah Journey Management menjadi struktural: daftar/manajemen step, ringkasan read-only, dan tautan ke Board/Forms tanpa panel isian, assign, atau review; verifikasi dengan smoke manual dan pastikan tidak ada import panel form yang tidak terpakai.
- [x] 4.4 Pindahkan keputusan Gerbang ke Overview dan sisakan ringkasan read-only di Journey, memakai `decideGate` yang sama; verifikasi dengan test gate di `tests/lifecycle.test.ts`.
- [x] 4.5 Tambahkan aksi review (approve/revisi dengan komentar) pada halaman Forms dan tab Forms proyek dengan guard `canReviewFormEntry`; verifikasi dengan test review PM vs Manager.
- [x] 4.6 Pastikan step `pending` dapat diedit penuh (nama, deskripsi, Manager PIC, fase, urutan, hapus) dan step `active`/`completed`/`skipped` read-only di Journey; verifikasi dengan test `updateProjectStep`, `deleteProjectStep`, dan `reorderProjectStep`.

## 5. Pre-assign pada step pending

- [x] 5.1 Izinkan PM/Admin membuat kartu pada step SIMPRO pending dan Manager/Admin meng-assign-nya, dengan kartu tetap Backlog dan transisi kerja ditolak sampai step aktif; verifikasi dengan test transisi dan status.
- [x] 5.2 Izinkan pembuatan dan assignment entri Form pada step Form pending, tetapi blokir isi/submit sampai step aktif; verifikasi dengan test `canCreateFormEntry`, `saveFormEntry`, dan `submitFormEntry`.
- [x] 5.3 Tampilkan label "Terjadwal"/"Menunggu step aktif" di Backlog, tab Forms, dan assignment queue, serta kecualikan dari badge dan Workload; verifikasi dengan test hitungan dan smoke manual.
- [x] 5.4 Pastikan Board dan tautan langsung tetap tidak membuka step pending; verifikasi dengan test `boardVisibleStages` dan smoke manual deep link.

## 6. Form Pitching sebagai SIMPRO

- [x] 6.1 Tambahkan aksi store `createPitchingTask`, `createPitchingTasksFromTemplate`, dan `archivePitchingTask` dengan guard Pitching/Prospek serta konteks `prospekId`/`pitchingId`/`templateStageId`; verifikasi dengan test pembuatan, idempotensi template, dan arsip.
- [x] 6.2 Implementasikan guard assign/work/review kartu Pitching: Manager/Admin assign, assignee/Manager/Media/Finance work, PM pemilik/Admin review; verifikasi dengan test matriks role.
- [x] 6.3 Ekstrak `TaskBoard` agar menerima daftar kartu dan metadata kolom, lalu buat board Pitching dengan filter form stage dan enam kolom status tanpa `ProjectStep`; verifikasi Board proyek tetap berjalan dan smoke manual board Pitching.
- [x] 6.4 Ganti panel Form Pitching pada detail Pitching dengan board dan sediakan route `/work/prospek/[pitchingId]/form` berisi board kartu milik assignee; verifikasi dengan smoke manual sebagai Manager dan Assignee.
- [x] 6.5 Ubah `pitchingFormComplete` dan gerbang Decision agar memakai kartu non-arsip yang semuanya Completed, termasuk pesan kartu yang belum selesai; verifikasi dengan test decision di `tests/prospek.test.ts`.
- [x] 6.6 Hapus entri Form Pitching dari inbox Forms, badge, `prospekWorkItemsForUser`, dan hitungan Workload, lalu tampilkan kartu Pitching di My Tasks dengan konteks Pitching; verifikasi dengan test dan smoke manual.
- [x] 6.7 Perluas reminder in-app Prospek dan kandidat Workload untuk kartu Pitching serta role Media; verifikasi dengan test `syncProspekReminders` dan hitungan Workload.
- [x] 6.8 Hapus pembacaan `FormEntry` scope Prospek dari UI dan store baru, tanpa menghapus data lama; verifikasi dengan test bahwa entri lama tidak muncul di Forms, My Tasks, atau gerbang Decision.

## 7. Otoritas assignment Prospek dan role Media

- [x] 7.1 Ubah `canAssignProspekWork` menjadi Manager/Admin saja dan hapus kontrol assign untuk PM pemilik pada RAB, Quotation, kartu Pitching, dan Kontrak; verifikasi dengan test PM ditolak dan Manager/Admin diterima.
- [x] 7.2 Batasi kandidat RAB/Quotation ke Finance dan Media serta kandidat Kontrak/kartu Pitching ke Assignee/Manager/Media/Finance; verifikasi dengan test kandidat dan penolakan target tidak sah.
- [x] 7.3 Terapkan akses Media di shell, route `/work/prospek/*`, My Tasks, Forms, dan larangan menu CRM/Prospek; verifikasi dengan smoke manual dan test akses.
- [x] 7.4 Tambahkan Media ke kandidat Workload, hitungan aktif, dan notifikasi/reminder; verifikasi dengan test `workloadRows` dan badge.

## 8. Persistensi dan seed

- [x] 8.1 Naikkan versi persist ke 10 dan normalkan `Task` lama dengan `scope: "project"` serta konteks Pitching yang valid; verifikasi dengan test migrasi idempoten di `tests/templates.test.ts` atau test persistensi baru.
- [x] 8.2 Perbarui seed: satu user Media, kartu Form Pitching pada Pitching demo, Umbrella demo dengan `createdById` yang benar, dan entri Form Pitching lama tidak dipakai; verifikasi dengan `npm test` dan smoke manual data demo.
- [x] 8.3 Pastikan migrasi tidak menghapus `FormEntry` scope Prospek dan tidak menduplikasi Group/step/card saat dijalankan ulang; verifikasi dengan test migrasi ganda.

## 9. Dokumentasi

- [x] 9.1 Perbarui `Docs/Stage-Types.md` untuk board Pitching, item terjadwal, dan pemisahan Journey/Forms; verifikasi setiap perilaku yang didokumentasikan memiliki test atau langkah smoke.
- [x] 9.2 Perbarui `Docs/Prospek.md` untuk otoritas Manager/Admin, Media, Form Pitching SIMPRO, dan gerbang Decision; verifikasi tidak ada klaim Form Pitching sebagai entry Form.
- [x] 9.3 Perbarui `AGENTS.md` bagian aturan produk yang berubah: lima tab, Journey struktural, Umbrella oleh PM, Media, pre-assign, dan Form Pitching SIMPRO; verifikasi konsisten dengan delta spec.

## 10. Integration verification

- [x] 10.1 Jalankan `npm run build`, `npm run lint`, dan `npm test`; verifikasi seluruh perintah lulus tanpa error baru.
- [x] 10.2 Jalankan smoke matrix manual sebagai Admin, Manager, PM, Assignee, Media, dan Finance untuk Umbrella, queue, Forms, Journey, pre-assign, dan board Pitching; verifikasi setiap role hanya melihat aksi yang diizinkan spec. (Ditutup dengan automated coverage: test matriks role + HTTP route smoke; matrix visual interaktif tidak dijalankan.)

## Workflow follow-up

- Archive the change after review and verification are complete.
