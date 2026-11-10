# Proposal

## Why

Detail proyek CRM saat ini punya tab Board terpisah dari Journey Management, sehingga PM harus berpindah tab untuk melihat task dari step yang sedang dikelola. Overview juga baru menampilkan hitungan task sederhana, belum memberi gambaran distribusi dan penyelesaian task seperti Dashboard SIMPRO. Di sisi SIMPRO, pilihan tahap Board masih memperlihatkan tahap yang belum berjalan kepada role selain Assignee, dan halaman Forms belum menjamin entri Form proyek yang di-assign selalu muncul untuk penerimanya.

## What Changes

- Menghapus sub-section/tab **Board** dari Detail Proyek CRM.
- Journey Management menjadi tempat pemilihan step: PM dapat memilih step mana pun yang sudah dibuat di **Kelola fase**, dan card task di bawahnya menampilkan task tahap SIMPRO untuk step terpilih.
- Overview menampilkan **Distribusi task** dan **Progress overview** bergaya Dashboard SIMPRO, khusus untuk proyek tersebut, ditempatkan di atas **Riwayat Aktivitas**.
- Board Detail Proyek SIMPRO hanya menawarkan tahap yang sedang berjalan dan tahap yang sudah selesai; tahap yang belum berjalan tidak ditampilkan atau dapat diakses oleh role mana pun, dan tahap selesai tetap read-only.
- Halaman Forms menampilkan semua Form yang di-assign kepada pengguna dari tahap **Prospek**, **Project**, maupun **Finance**, termasuk entri Form proyek yang sebelumnya dapat hilang karena proyek tidak masuk daftar proyek terlihat.
- **BREAKING (UI)**: tab Board di Detail Proyek CRM dihapus; deep link `?tab=board` tidak lagi membuka board.

## Capabilities

### New Capabilities

- `forms-inbox`: halaman Forms sebagai inbox tunggal untuk seluruh penugasan Form dari tahap Prospek, Project, dan Finance, dengan visibilitas berdasarkan assignment.

### Modified Capabilities

- `project-lifecycle`: tab workspace CRM berubah dari Overview/Journey Management/Board menjadi Overview/Journey Management; Journey Management memilih step untuk card task; Overview menampilkan distribusi dan progress task proyek.
- `simpro-kanban-delivery`: pilihan tahap Board SIMPRO dibatasi ke tahap aktif dan selesai untuk semua role, dengan tahap pending tersembunyi dan tidak dapat diakses.

## Impact

- UI CRM: `src/components/prototype/crm/project-detail.tsx`.
- UI SIMPRO: `src/components/prototype/simpro/project-page.tsx`, `src/components/prototype/simpro/forms-page.tsx`, dan komponen distribusi/progress task yang dapat dipakai ulang dari `src/components/prototype/simpro/dashboard.tsx`.
- Domain/visibilitas: `src/lib/prototype/domain.ts` (`canViewProject`, filter Forms, kandidat step).
- Dokumentasi: `Docs/Stage-Types.md`, `Docs/Prospek.md`, dan `AGENTS.md` bila aturan workspace/Forms berubah.
- Test: `tests/domain.test.ts`, `tests/simpro-forms.test.ts`, `tests/stage-types.test.ts`, dan test baru untuk visibilitas tahap Board serta inbox Forms.
