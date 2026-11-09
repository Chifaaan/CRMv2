# Prospek (Umbrella Project)

Prospek adalah wadah CRM untuk peluang sebelum proyek berjalan. Satu Prospek berisi banyak **Pitching**; setiap Pitching punya RAB, Quotation, tugas Form, dan kontrak sendiri. Pitching yang menang dan kontraknya lengkap menjadi **anak proyek** yang dieksekusi di SIMPRO.

## Alur

1. **Detail Prospek** — nama, PIC, client, periode, pagu.
2. **Pitching** — setiap Pitching memilih template proyek saat dibuat.
3. **RAB** — item manpower dan biaya, assignee, due date, versi, submitter/tanggal submit.
4. **Quotation** — mode Submit Link atau Import PDF, assignee, nilai opsional, versi, approval PM/Admin.
5. **Tugas Form** — Presentasi, Concept Deck, dan tugas lain memakai template Form serta assignment/versi/review yang sama dengan Form proyek.
6. **Decision** — Menang/Kalah oleh PM pemilik atau Admin setelah RAB submitted dan Quotation submitted/approved. Kalah wajib beralasan dan menjadi riwayat read-only.
7. **Kontrak** — nomor, tanggal, nilai, berkas, dan minimal satu Termine; wajib lengkap sebelum konversi.
8. **Konversi** — PM pemilik atau Admin mengubah Pitching menang menjadi anak proyek. Proyek menyimpan `prospekId` dan `pitchingId`, mewarisi RAB/Quotation/kontrak, dan memulai pekerjaan setelah fase Prospek selesai.
9. **Eksekusi** — anak proyek berjalan di SIMPRO. Termine tampil sebagai acuan pembayaran di Closing dan tidak membuat form Invoice/Pembayaran otomatis.

## Aturan penting

- **Pagu hanya peringatan.** Total RAB dan Quotation dibandingkan dengan pagu; peringatan tidak memblokir penyimpanan.
- **Akses:** PM membuat dan hanya melihat Prospek miliknya; Manager/Admin melihat semua; Assignee hanya melihat Pitching/Form/RAB/Quotation yang di-assign; Finance tidak mengakses Prospek sampai anak proyek dibuat.
- **Form scope:** entri Form Prospek memakai `scope: "prospek"`, `prospekId`, dan `pitchingId`. Entri Form proyek lama tetap `scope: "project"`.
- **Read-only:** Pitching kalah mengunci RAB, Quotation, Form, dan kontraknya. Kontrak terkunci setelah konversi.
- **Reminder:** hanya in-app untuk penugasan, mendekati due date (3 hari), dan overdue; tidak ada email.
- **Legacy:** proyek lama dengan step Pitching dan `ProjectGroup` lama tidak dimigrasikan ke Prospek.

## Implementasi

- Tipe dan state: `src/lib/prototype/types.ts`
- Helper domain, permission, pagu, dan scope Form: `src/lib/prototype/domain.ts`
- Aksi store, konversi, dan reminder: `src/lib/prototype/store.ts`
- Audit Prospek: `src/lib/prototype/prospek-events.ts`
- UI daftar/detail: `src/components/prototype/crm/prospek.tsx`, `src/components/prototype/crm/prospek-detail.tsx`
- Rute: `/crm/prospek`, `/crm/prospek/[id]`, `/crm/prospek/[id]/forms/[entryId]`
- Test: `tests/prospek.test.ts`
