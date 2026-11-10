# Design

## Context

Lihat `proposal.md`. Aturan step wajib harus konsisten di tiga permukaan: template editor, pembuatan proyek, dan Journey Management; sementara model fase sudah mendukung `prospek` (dipakai legacy) dan `startProject` masih hanya menerima Planning/Running.

## Goals / Non-Goals

**Goals**

- Satu sumber aturan wajib (`MANDATORY_STEP_SPECS`) yang dipakai validasi, template, pembuatan proyek, dan UI.
- Prospek opsional per template namun wajib lengkap bila fase itu dipakai.
- Step wajib tidak dapat dihapus saat penyusunan/pembuatan; tetap dapat dihapus setelah proyek berjalan.
- Dialog Tambah/Edit Step menggantikan prompt; fase pilihan benar-benar dipakai.

**Non-Goals**

- Tidak mengubah mesin Form/Finance.
- Tidak mengubah aturan approval gate legacy Umum (legacy dikecualikan dari aturan wajib baru).

## Decisions

1. **Aturan wajib sebagai spesifikasi** (`mandatory-steps.ts`): RAB + Decision (client approval) untuk Prospek; BAST + Invoice untuk Finance. `matchesMandatorySpec` mencocokkan fase + jenis + financeKind/gateKind.
2. **Auto-create idempoten**: `ensureMandatoryStages` (template) dan `missingMandatoryProjectSteps` (proyek) menambahkan step yang hilang sesuai fase yang ada, lalu mengurutkan ulang per fase. `saveTemplate` dan `createProject` mode template memanggil ensure; pembuatan step baru pada fase yang masih kosong juga memanggil missing agar fase manual ikut lengkap. Fase yang sudah punya step tidak menambah ulang (menghormati penghapusan setelah proyek berjalan).
3. **Legacy dikecualikan**: Umum tidak memiliki gerbang menang, sehingga validasi/ensure dilewati untuk template `legacy`.
4. **Prospek opsional pada template**: `isNewProjectTemplate` kini menerima fase Prospek selama memuat RAB + Decision dan tetap memenuhi Planning/Running SIMPRO serta Finance finance_form.
5. **Start dari Prospek**: `startProject` menerima `"prospek"`; bila proyek memiliki step Prospek, start Planning/Running ditolak dan UI hanya menampilkan `Mulai dari Prospek`.
6. **Dialog step**: komponen `StepDialog` di project detail memuat nama/fase/jenis/form/gerbang/Manager PIC/deskripsi; Edit hanya mengubah nama/deskripsi/PIC (fase dan jenis terkunci untuk step yang sudah ada). Kartu `Pilih Step` dihapus; stepper header tetap menjadi pemilih.
7. **Label wajib/opsional**: baris step pada pembuatan proyek dan template editor menampilkan badge; ringkasan pembuatan menampilkan jumlah wajib/opsional.

## Risks / Trade-offs

- **KOL/Event template berubah** → KOL ditambah RAB (versi 3); migrasi template oleh store memakai seed baru sehingga data lama ikut diperbarui.
- **Penghapusan mandatory setelah start** → dipilih sesuai keputusan pengguna; auto-create hanya saat fase masih kosong agar tidak “menghidupkan” step yang sengaja dihapus.
- **Legacy Umum tidak punya Decision** → validasi/ensure melewati template legacy agar struktur enam step tetap.
- **Gate menang mengunci RAB** → perilaku lama `decideGate` dipakai; Prospek memanfaatkannya dan melanjutkan ke Planning.
