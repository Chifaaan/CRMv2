# Design

## Context

Lihat `proposal.md` untuk motivasi. Kondisi saat ini:

- `Project` hanya menyimpan `createdById` (PM) dan tidak punya Manager penanggung jawab.
- Assignee task dan entri Form dibatasi role `assignee`; kandidat assignee di UI juga hanya role tersebut.
- Hanya Manager/Admin yang boleh meng-assign; PM hanya membuat task dan mereview.
- Transisi task `To Do → In Progress → Awaiting Approval` mensyaratkan role `assignee`.
- Workload hanya menghitung user role `assignee`.
- Manager sudah dapat melihat seluruh proyek dan mengakses SIMPRO/CRM.

## Goals / Non-Goals

**Goals:**

- Menambah satu Manager penanggung jawab per proyek tanpa mengubah visibilitas proyek.
- Memungkinkan PM meng-assign pekerjaan operasional kepada Manager proyek.
- Memberi Manager assignee hak eksekusi setara Assignee tanpa hak review.
- Menjaga kompatibilitas data lama dan alur PM/Manager/Admin/Assignee yang ada.

**Non-Goals:**

- Mengubah Manager menjadi scoped hanya ke proyek yang di-assign.
- Menambah Manager sebagai assignee Form Keuangan (RAB/BAST/Invoice/Pembayaran); form tersebut tetap untuk Finance.
- Mengubah aturan review PM/Admin, gerbang, progress, template, atau struktur tahap.
- Menambah multi-Manager per proyek.

## Decisions

### 1. Satu `managerId` opsional pada `Project`

Tambahkan `managerId?: string` ke `Project`. Alternatif join table multi-manager ditolak karena kebutuhan menyebut satu Manager penanggung jawab dan UI saat ini tidak punya konsep tim proyek berlapis. Nilai kosong berarti belum ditugaskan.

### 2. Penunjukan Manager adalah tanggung jawab, bukan pembatas akses

`canViewProject` tidak diubah. Manager tetap melihat semua proyek. `managerId` dipakai untuk:

- tampilan Manager di header/tim proyek,
- notifikasi penunjukan,
- batas hak assign PM (PM hanya boleh assign ke Manager proyeknya),
- audit trail.

Alternatif “Manager hanya melihat proyek yang di-assign” ditolak karena akan mengubah permission yang sudah ada dan bertentangan dengan keputusan user.

### 3. Hak assign dipisahkan dari hak review

Tambahkan helper domain:

- `canAssignProjectManager(user, project)` → Admin atau PM pemilik proyek.
- `isOperationalAssignee(user)` → role `assignee` atau `manager`.
- `canAssignOperational(user, project, targetUser)`:
  - Admin/Manager: boleh assign ke Assignee atau Manager.
  - PM pemilik proyek: hanya boleh assign ke `project.managerId`.
  - Role lain: tidak boleh.
- `canWorkTask(user, task)` dan `canWorkFormEntry(user, entry)` → user adalah assignee task/entry dan `isOperationalAssignee(user)`.

PM tidak mendapat hak assign umum; PM hanya mendapat jalur sempit ke Manager proyek. Ini menjaga aturan lama “hanya Manager/Admin yang meng-assign” sebisa mungkin.

### 4. Manager assignee dieksekusi seperti Assignee, tanpa review

- `taskTransition` mengizinkan Manager assignee melakukan `todo → in_progress` dan `in_progress → awaiting_approval`.
- `canEditFormEntry` mengizinkan Manager assignee menyimpan draft dan submit entri Form miliknya.
- `canReviewTask`, `canReviewFormEntry`, dan aksi review lain tetap hanya PM pemilik/Admin.

### 5. Kandidat assignee difilter per proyek

UI task dan entri Form memakai helper kandidat:

- PM pemilik: hanya Manager proyek (jika ada).
- Manager/Admin: semua user role Assignee dan Manager.
- Jika PM belum menetapkan Manager proyek, PM melihat pesan bahwa belum ada Manager yang bisa di-assign.

Filter dilakukan di UI dan divalidasi ulang di domain/store agar tidak hanya bergantung pada tampilan.

### 6. Workload menampilkan Manager hanya jika punya beban aktif

`workloadRows` tetap menampilkan semua Assignee, lalu menambahkan Manager yang memiliki minimal satu task/form aktif. Ini menghindari daftar Manager kosong dan tetap memenuhi kebutuhan penghitungan beban Manager assignee.

### 7. Migrasi persist idempotent

- Bump versi persist.
- Proyek lama mendapat `managerId: undefined`.
- Seed demo menetapkan Manager pada beberapa proyek agar fitur terlihat.
- Tidak ada reset data; field opsional membuat data lama tetap valid.
- Event audit penunjukan Manager hanya ditulis saat nilai berubah.

### 8. Notifikasi dan audit

- Saat proyek dibuat/diubah dengan Manager baru, kirim notifikasi ke Manager tersebut.
- Tulis event audit `project.manager_assigned` / `project.manager_changed` dengan Manager sebelum dan sesudah.
- Assignment task/form ke Manager memakai event assignment yang sudah ada, ditambah metadata role/manager.

## Risks / Trade-offs

- [PM bingung antara “Manager proyek” dan “assign task ke Manager”] → Label UI eksplisit: “Manager penanggung jawab” dan “Assign ke Manager proyek”.
- [Manager assignee bisa kelebihan beban] → Workload menampilkan task dan form aktif Manager secara terpisah.
- [PM tidak bisa assign jika belum ada Manager proyek] → Tampilkan pesan dan arahkan PM untuk menetapkan Manager proyek lebih dulu.
- [Perluasan assignee ke Manager mengubah dropdown dan transisi task] → Validasi ganda di domain/store, plus test permission.
- [Data lama tidak punya Manager] → Field opsional + migrasi tanpa reset; proyek lama tetap berjalan.

## Migration Plan

1. Tambah `managerId` opsional pada tipe `Project` dan bump versi persist.
2. Migrasi persist mengisi `managerId: undefined` untuk proyek lama; seed demo mengisi beberapa proyek.
3. Tambah helper permission domain dan gunakan di store/UI.
4. Perbarui form buat/edit proyek, header/tim proyek, TaskDialog, assignment entri Form, My Tasks/Forms, dan workload.
5. Tambah event audit dan notifikasi.
6. Jalankan test permission, assignment, workload, migrasi, dan regresi.

Rollback: hapus penggunaan `managerId` dan kembalikan versi persist; field opsional pada data lama tidak merusak proyek yang sudah ada.

## Open Questions

Tidak ada; keputusan yang memengaruhi spec, pendekatan, dan task sudah diselesaikan.
