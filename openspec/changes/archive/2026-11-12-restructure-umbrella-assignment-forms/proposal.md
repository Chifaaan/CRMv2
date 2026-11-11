# Proposal

## Why

Alur kerja prototype sekarang memisahkan pekerjaan dari orang yang mengatur pekerjaan itu: Manager tidak punya antrean penugasan, PM tidak bisa membentuk Umbrella, form tersebar di Journey Management, dan Form Pitching masih memakai mesin Form sehingga tidak terlihat seperti pekerjaan SIMPRO. Akibatnya Manager harus berkeliling ke tiap step untuk meng-assign, form proyek punya tiga tempat assign tanpa satu tempat review, dan alur Prospek tidak benar-benar dimulai oleh Manager.

## What Changes

- **Umbrella Project = `ProjectGroup`** yang diganti istilahnya di UI. PM boleh membuat Umbrella; PM hanya melihat dan mengelola Umbrella yang ia buat, dan hanya memindahkan proyek miliknya. Admin/Manager tetap melihat semua.
- **Drag-and-drop Umbrella** di card view CRM Projects dan halaman Umbrella: tarik proyek ke proyek untuk membuat Umbrella (dialog nama), tarik proyek ke kartu Umbrella untuk bergabung. Table view memakai aksi "Tambah ke Umbrella". Aturan minimal 2 anggota dipertahankan.
- **Antrean penugasan di My Tasks** untuk Manager/Admin: kartu Backlog dan entri Form yang belum di-assign dari proyek/Prospek yang boleh mereka assign, dengan aksi assign inline.
- **Menu Forms menjadi tempat assign dan review**: Manager/Admin meng-assign dari Forms, PM pemilik/Admin mereview dari Forms dan tab Forms proyek. Otoritas review tidak berubah.
- **Tab Forms Detail Proyek menampung seluruh pekerjaan form** (Form stage entries dan Form Keuangan), plus banner jumlah form yang perlu di-assign/diisi/direview/direvisi. Journey Management tidak lagi menampilkan panel form.
- **Journey Management murni untuk struktur**: kelola step/fase, ringkasan read-only per step, dan tautan ke Board/Forms. **Keputusan Gerbang pindah ke tab Overview.**
- **Step `pending` dapat dikelola penuh** (tambah, edit nama/deskripsi/Manager PIC/fase, urutkan, hapus); step `active` dan `completed` menjadi **read-only**. **BREAKING** terhadap aturan lama yang mengizinkan edit nama/PIC pada step aktif.
- **Pre-assign pada step pending**: Manager/Admin dapat meng-assign kartu dan entri Form pada step yang belum berjalan; item berlabel "Terjadwal"/"Menunggu step aktif", tidak dapat dikerjakan, dan tidak dihitung pada badge maupun Workload sampai step aktif.
- **Role baru `media`** setara Assignee (tanpa menu CRM/Prospek, akses My Tasks/Forms/`/work/prospek/*`), dapat menjadi assignee kartu proyek maupun pekerjaan Prospek, muncul di Workload, dan menerima notifikasi/reminder.
- **Assignment Prospek hanya oleh Manager/Admin**: PM pemilik tetap membuat, mereview, dan memutuskan, tetapi tidak lagi meng-assign RAB/Quotation/Kartu Pitching/Kontrak. **BREAKING** terhadap `canAssignProspekWork` yang sekarang mengizinkan PM pemilik.
- **RAB dan Quotation dapat di-assign ke Finance dan Media** (sebelumnya Finance saja).
- **Form Pitching menjadi SIMPRO**: pekerjaan Form Pitching sekarang berupa kartu Task pada board 6 kolom di dalam detail Pitching, satu kartu per form stage template (dibuat on demand) plus kartu custom. RAB, Quotation, Decision, dan Kontrak tetap seperti sekarang. **BREAKING** terhadap model `FormEntry` scope Prospek dan terhadap keberadaan Form Pitching di inbox Forms.
- **Migrasi data Pitching lama ditahan**: `FormEntry` scope Prospek dari `localStorage` tidak dibaca lagi dan tidak ada migration pada change ini; keputusan migrasi vs reset seed ditunda sampai apply. Seed Prospek/Pitching ikut diperbarui agar konsisten.

## Capabilities

### New Capabilities

- `umbrella-projects`: identitas Umbrella (ProjectGroup), hak buat/lihat PM, aturan keanggotaan, drag-and-drop, dan Umbrella otomatis dari konversi Prospek.
- `assignment-queue`: antrean penugasan Manager/Admin di My Tasks untuk kartu dan entri Form yang belum di-assign, termasuk item terjadwal pada step pending.

### Modified Capabilities

- `project-lifecycle`: lima tab workspace, Journey Management murni struktur, keputusan Gerbang di Overview, pengelolaan step pending vs read-only, dan pre-assign pada step pending.
- `forms-inbox`: assign dan review dari menu Forms, pemindahan seluruh pekerjaan form proyek ke tab Forms, penghapusan Form Pitching dari inbox/badge, dan pengecualian item terjadwal.
- `prospek-pitching`: otoritas assign Manager/Admin, kandidat Finance+Media untuk RAB/Quotation, Form Pitching sebagai board SIMPRO, gerbang Decision berbasis kartu, serta My Tasks/reminder berbasis kartu.
- `prospek-management`: akses role Media (tanpa menu Prospek), label Umbrella, dan kepemilikan Umbrella hasil konversi.
- `simpro-kanban-delivery`: board SIMPRO untuk scope Pitching, Media sebagai pekerja operasional, dan kartu terjadwal pada step pending tanpa membuka akses step pending.
- `table-list-views`: label Grup menjadi Umbrella, aksi "Tambah ke Umbrella" pada table, dan Forms tidak lagi memuat Form Pitching.

## Impact

- Domain dan tipe: `src/lib/prototype/types.ts` (role `media`, Task scope Pitching, status terjadwal), `domain.ts` (visibilitas Umbrella, assign Prospek, review/assignment kartu Pitching, pre-assign, guard form), `store.ts` (aksi Umbrella/DnD, pembuatan task Pitching, assignment queue, reminder, persist version 10, seed Media).
- UI: `crm/projects.tsx`, `crm/groups.tsx`, `crm/project-detail.tsx`, `crm/project-work-panels.tsx`, `crm/prospek-detail.tsx`, `crm/pitching-detail.tsx`, `simpro/my-tasks.tsx`, `simpro/forms-page.tsx`, `simpro/board.tsx`, `project-card.tsx`, `shell.tsx`, `group-member-row.tsx`, dialog terkait.
- Data: `ProjectGroup` (tanpa perubahan bentuk), `Task` (projectId opsional + scope/Prospek/Pitching), `FormEntry` scope Prospek berhenti dipakai, seed Prospek/Pitching.
- Test: `tests/prospek.test.ts`, `tests/manager-assignment.test.ts`, `tests/stage-types.test.ts`, `tests/lifecycle.test.ts`, `tests/domain.test.ts`, plus test baru untuk Umbrella dan assignment queue.
- Tidak ada perubahan backend/API; semuanya tetap prototype berbasis Zustand + `localStorage`/IndexedDB.
