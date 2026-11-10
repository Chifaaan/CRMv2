# Design

## Context

Lihat `proposal.md`. Forms saat ini menampilkan Form Keuangan hanya untuk Admin, PM pemilik, dan Finance/Media yang di-assign; entri Form sudah punya kontrol assign untuk Manager/Admin, sedangkan Form Keuangan belum. Dashboard SIMPRO sudah ada komponennya tetapi route `/dashboard` masih redirect ke CRM dan navigasi SIMPRO belum menampilkannya.

## Decisions

1. **Visibilitas Form Keuangan untuk Manager**: `canSeeFinanceFormInSimpro` mengembalikan `true` untuk role Manager (semua proyek yang terlihat). Finance tetap hanya melihat form yang di-assign; Assignee tetap ditolak.
2. **Kandidat assignee per jenis form**: helper `financeAssigneeCandidates(state, form)` — RAB/Invoice/Pembayaran → Finance; BAST → Finance + Media. `canAssignFinanceForm` hanya Admin/Manager.
3. **Assign dari daftar Forms**: `FormRowAssignControl` diperluas: entri Form memakai `operationalAssigneeCandidates` + `assignFormEntry`; Form Keuangan yang belum di-assign memakai `financeAssigneeCandidates` + `assignForm`.
4. **Assign saat form dibuka**: `FinanceFormPage` menampilkan panel Penugasan ketika `assigneeId` kosong dan pengguna Admin/Manager; kandidat sesuai jenis form. Halaman entri Form sudah memiliki panel serupa dan tetap dipakai.
5. **Stepper Prospek**: `phasesForProject` untuk proyek siklus baru mengembalikan `["prospek", ...NEW_PROJECT_PHASES]` bila ada step Prospek, selain itu tetap tiga fase.
6. **Dashboard SIMPRO Assignee**: route `/dashboard` merender `SimproDashboard` (bukan redirect). Data task dibatasi untuk Assignee/Media; proyek memakai `visibleProjects`. Navigasi SIMPRO menampilkan Dashboard untuk semua role SIMPRO, dan Projects hanya untuk role yang dapat membuka detail proyek CRM (Admin/Manager/PM).
7. **Dashboard tidak duplikatif**: komponen `TaskProgressPanels` yang sudah ada dipakai untuk distribusi/progress agar konsisten dengan detail proyek.

## Risks / Trade-offs

- Manager kini melihat form keuangan yang belum di-assign; data sensitif tetap hanya bisa diisi Finance/Media yang di-assign.
- Dashboard Assignee memakai `visibleProjects`, sehingga jumlah proyek mengikuti pekerjaan yang di-assign (bukan seluruh proyek).
- `/dashboard` sebelumnya redirect ke CRM; route kini menampilkan dashboard SIMPRO untuk semua role SIMPRO sesuai referensi desain.
