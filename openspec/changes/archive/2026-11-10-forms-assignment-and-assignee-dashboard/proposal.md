# Proposal

## Why

Penugasan Form masih terbatas pada baris Form di menu Forms untuk entri proyek; Form Keuangan yang belum di-assign tidak terlihat oleh Manager dan tidak bisa di-assign saat form dibuka. Stepper header juga belum menampilkan fase Prospek pada proyek yang menyertakannya. Terakhir, SIMPRO belum memiliki dashboard untuk Assignee yang merangkum pekerjaan mereka seperti referensi desain.

## What Changes

- Manager/Admin dapat menetapkan assignee pada **Form** dan **Form Keuangan** yang belum memiliki assignee, baik dari menu Forms maupun saat form dibuka, tanpa terikat status tahap proyek.
- Manager dapat melihat seluruh Form Keuangan pada proyek yang dapat diakses (termasuk yang belum di-assign) di menu Forms; kandidat assignee mengikuti jenis form (RAB/Invoice/Pembayaran → Finance; BAST → Finance atau Media).
- Stepper fase pada header detail proyek menampilkan **Prospek** ketika proyek memiliki step Prospek, di samping Planning/Running/Finance.
- Dashboard SIMPRO untuk Assignee: banner sapaan, kartu Total proyek/Klien/Anggota tim/Total task, Distribusi task, Progress overview, Task saya, Recent projects, dan Upcoming deadlines, dengan data dibatasi pada pekerjaan/proyek yang dapat diakses Assignee (dan Media).
- Navigasi SIMPRO menampilkan **Dashboard** untuk semua role SIMPRO; **Projects** hanya untuk role yang dapat membuka detail proyek CRM.

## Capabilities

### New Capabilities

- `simpro-dashboard`: dashboard SIMPRO untuk Assignee/Media berisi ringkasan proyek, distribusi status task, progress, task pribadi, proyek terbaru, dan deadline terdekat.
- `forms-inbox`: inbox Form (entri proyek dan Form Keuangan) dengan visibilitas dan penugasan Manager, dibangun di atas perubahan port yang belum diarsipkan.

### Modified Capabilities

- `project-journey`: stepper header menampilkan fase Prospek bila proyek menyertakan Prospek.

## Impact

- `src/lib/prototype/domain.ts`, `src/lib/prototype/simpro-forms.ts`, `src/lib/prototype/stepper.ts`
- `src/components/prototype/simpro/forms-page.tsx`, `simpro/dashboard.tsx`, `crm/finance-form-page.tsx`, `shell.tsx`
- `src/app/(main)/dashboard/page.tsx`
- `tests/business-revenue.test.ts`, `tests/simpro-forms.test.ts`, `tests/stepper.test.ts`
- `AGENTS.md`, `Docs/Stage-Types.md`
