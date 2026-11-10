# Tasks

## 1. Workspace CRM tanpa Board

- [x] 1.1 Hapus tab Board dari `workspaceTab`, tombol tab, state `boardTaskId`, import `TaskBoard`, dan render board di `src/components/prototype/crm/project-detail.tsx`; verifikasi `npm run build` dan `npm run lint` tidak menyisakan referensi Board CRM.
- [x] 1.2 Normalisasi query tab di `CrmProjectDetail` agar hanya `overview` dan `journey` yang diterima, `?tab=board` jatuh ke Overview, dan URL `?step=` tetap tersinkron; verifikasi dengan membuka detail proyek memakai `?tab=board` dan memastikan Overview tampil.
- [x] 1.3 Tambah pemilih step di Journey Management yang berisi seluruh step proyek yang sudah dibuat, dikelompokkan per fase, dan memanggil `selectStep`; verifikasi dengan memilih step dari fase berbeda dan memastikan `?step=` serta panel berubah.
- [x] 1.4 Pastikan `SimproStagePanel` menjadi card task di bawah pemilih step dan hanya menampilkan task step terpilih; untuk step pending tampilkan empty state “Belum dimulai” dan untuk step non-SIMPRO tampilkan panel jenisnya tanpa task dari step lain; verifikasi lewat smoke test tiga jenis step.
- [x] 1.5 Perbarui `Docs/Stage-Types.md` dan `AGENTS.md` agar menyebut dua tab CRM dan peran Journey Management; verifikasi dokumentasi tidak lagi menyebut tab Board CRM.

## 2. Distribusi dan progress task di Overview

- [x] 2.1 Ekstrak bagian `Distribusi task` dan `Progress overview` dari `src/components/prototype/simpro/dashboard.tsx` menjadi komponen bersama yang menerima daftar task; verifikasi Dashboard SIMPRO tetap menampilkan kedua panel setelah refactor.
- [x] 2.2 Pasang komponen bersama di Overview CRM dengan task yang sudah difilter hanya untuk proyek tersebut dan visibilitas role yang sama seperti Dashboard; letakkan di atas Riwayat Aktivitas; verifikasi dengan proyek berisi task dan proyek kosong.
- [x] 2.3 Tambah test domain/UI-helper untuk hitungan status, Completed/Open/Overdue, dan persentase task agar panel proyek tidak memakai data proyek lain; verifikasi `npm test` untuk test baru.
- [x] 2.4 Perbarui dokumentasi Overview di `Docs/Stage-Types.md` agar menyebut Distribusi task dan Progress overview di atas Riwayat Aktivitas; verifikasi dokumentasi sesuai urutan baru.

## 3. Tahap Board SIMPRO mengikuti CRM

- [x] 3.1 Tambah helper domain untuk daftar tahap Board yang hanya berisi step SIMPRO aktif dan selesai; verifikasi unit test bahwa step pending selalu keluar dan urutan tahap stabil.
- [x] 3.2 Ganti filter tahap di `src/components/prototype/simpro/project-page.tsx` agar memakai helper untuk semua role, mengabaikan `?stage=` yang menunjuk step pending, memilih step aktif secara default, lalu step selesai terbaru; verifikasi dengan test helper dan smoke test deep link pending.
- [x] 3.3 Pastikan tahap selesai tetap read-only dan proyek tanpa tahap aktif/selesai menampilkan empty state yang jelas, bukan data step pending; verifikasi lewat smoke test dua kondisi.
- [x] 3.4 Perbarui `Docs/Stage-Types.md` tentang Board SIMPRO yang hanya menampilkan tahap aktif dan selesai untuk semua role; verifikasi dokumentasi sesuai perilaku baru.

## 4. Forms sebagai inbox semua assignment

- [x] 4.1 Perluas `canViewProject` di `src/lib/prototype/domain.ts` agar entri Form yang di-assign membuat proyek terlihat oleh Assignee dan Finance; verifikasi unit test untuk user yang hanya punya form entry.
- [x] 4.2 Hapus skip global role Finance pada loop entri Form proyek di `src/components/prototype/simpro/forms-page.tsx`, sambil mempertahankan filter `visibleIds`, filter assignee, dan aturan review yang ada; verifikasi dengan akun Finance/Assignee penerima assignment.
- [x] 4.3 Pastikan baris Forms tetap memuat tiga sumber: entri Prospek, entri Form proyek, dan Form Keuangan; verifikasi test untuk `canViewProject`, `simproFinanceFormRows`, dan smoke test halaman Forms dengan ketiga jenis assignment.
- [x] 4.4 Pastikan Form yang sudah selesai/dibatalkan tetap tampil dengan status terbarunya dan penugasan milik user lain tidak bocor; verifikasi test negatif visibilitas dan smoke test status.
- [x] 4.5 Perbarui `Docs/Prospek.md` dan `AGENTS.md` tentang Forms sebagai inbox assignment dari Prospek, Project, dan Finance; verifikasi dokumentasi menyebut ketiga sumber dan batas visibilitas.

## 5. Verifikasi integrasi

- [x] 5.1 Jalankan `npm run build`, `npm run lint`, dan `npm test`; verifikasi semuanya lolos tanpa error baru.
- [x] 5.2 Smoke test CRM: buka detail proyek, pastikan hanya Overview dan Journey Management, pilih beberapa step di Journey Management, dan pastikan card task mengikuti step terpilih.
- [x] 5.3 Smoke test SIMPRO: buka Board proyek dengan step pending/aktif/selesai, pastikan hanya aktif dan selesai yang tampil, tahap selesai read-only, dan deep link pending tidak membuka tahap itu.
- [x] 5.4 Smoke test Forms lintas role: pastikan Form Prospek, Form proyek, dan Form Keuangan yang di-assign tampil untuk penerimanya, sedangkan penugasan user lain tidak tampil.

## 6. Fase lengkap, Finance otomatis, dan assignment dari Forms

- [x] 6.1 Tambah helper `phasesForProject` yang selalu mengembalikan Planning/Running/Finance untuk proyek siklus baru dan memakai fase data-driven untuk legacy; verifikasi test helper dan tampilan `0 Step` pada fase kosong.
- [x] 6.2 Pastikan memilih fase kosong menghapus step terpilih dan `?step=`, lalu panel menampilkan empty state “Belum ada step” tanpa task dari fase lain; verifikasi lewat smoke test fase kosong.
- [x] 6.3 Tambah helper `missingFinanceSteps` dan panggil saat Running selesai agar BAST/Invoice otomatis dibuat tanpa duplikasi; verifikasi test lifecycle untuk transisi Running → Finance dan penambahan step Finance manual.
- [x] 6.4 Backfill proyek aktif yang sudah di Finance tanpa BAST/Invoice lewat migrasi persist idempotent dan bump versi persist; verifikasi test migrasi dijalankan dua kali.
- [x] 6.5 Tambah kontrol assignment Manager/Admin pada halaman Forms untuk entri Proyek dan Prospek yang belum di-assign, memakai `assignFormEntry`; verifikasi smoke test assignment dari Forms dan test permission assignment.
- [x] 6.6 Perbarui `Docs/Stage-Types.md` dan `AGENTS.md` tentang fase selalu tampil, auto BAST/Invoice, dan assignment dari Forms; verifikasi dokumentasi sesuai perilaku baru.
- [x] 6.7 Jalankan `npm run build`, `npm run lint`, dan `npm test`; verifikasi alur baru tidak meregresi lifecycle, Forms, dan Board SIMPRO.

## Workflow follow-up

- Arsipkan change setelah review dan implementasi disetujui.
- Verifikasi hasil arsip dan sinkronisasi spec.
