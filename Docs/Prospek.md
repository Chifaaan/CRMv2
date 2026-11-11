# Prospek (Umbrella Project)

Prospek adalah wadah CRM untuk peluang sebelum proyek berjalan. Satu Prospek berisi banyak **Pitching**; setiap Pitching punya RAB, Quotation, tugas Form, dan kontrak sendiri. Pitching yang menang dan kontraknya lengkap menjadi **anak proyek** yang dieksekusi di SIMPRO.

## Alur

1. **Detail Prospek** — nama, PIC, client, periode, pagu.
2. **Pitching** — setiap Pitching memilih template proyek saat dibuat dan tampil sebagai card ringkas.
3. **Halaman Pitching** — card membuka halaman dengan section RAB, Quotation, Form Pitching, Kontrak, dan Finishing.
4. **RAB** — item manpower dan biaya, assignee, due date, versi, submitter/tanggal submit.
5. **Quotation** — mode Submit Link atau Import PDF, assignee, nilai opsional, versi, approval PM/Admin.
6. **Form Pitching** — Presentasi, Concept Deck, dan tugas lain dikerjakan sebagai kartu SIMPRO pada board dalam halaman Pitching; satu kartu per form stage template dan kartu custom.
7. **Decision** — Menang memerlukan RAB submitted, Quotation submitted/approved, dan semua kartu Form Pitching Completed. Kalah dapat dicatat kapan saja untuk Pitching yang belum dikonversi, wajib beralasan, langsung masuk arsip, dan dapat di-undo.
8. **Kontrak** — terkunci sampai Pitching menang; nomor, tanggal, nilai, berkas, dan minimal satu Termine wajib lengkap sebelum konversi. Kontrak dapat di-assign ke Assignee/Manager/Media/Finance.
9. **Konversi** — PM pemilik atau Admin mengubah Pitching menang menjadi anak proyek. Proyek menyimpan `prospekId` dan `pitchingId`, mewarisi RAB/Quotation/kontrak, dan memulai pekerjaan setelah fase Prospek selesai.
10. **Group otomatis** — konversi membuat atau memakai ulang Group bernama sama dengan Prospek, lalu memasukkan anak proyek ke Group tersebut.
11. **Eksekusi** — anak proyek berjalan di SIMPRO. Termine tampil sebagai acuan pembayaran di Closing dan tidak membuat form Invoice/Pembayaran otomatis.

## Aturan penting

- **Pagu hanya peringatan.** Total RAB dan Quotation dibandingkan dengan pagu; peringatan tidak memblokir penyimpanan.
- **Akses:** PM membuat dan hanya melihat Prospek miliknya; Manager/Admin melihat semua; Assignee, Media, dan Finance tidak melihat menu/halaman Prospek. Pekerjaan yang di-assign dibuka dari My Tasks/Forms atau `/work/prospek/[pitchingId]/[section]`.
- **Urutan Pitching:** RAB → Quotation → Form Pitching → Decision → Kontrak. Tahap berikutnya terkunci sampai tahap sebelumnya selesai; warna membedakan selesai/aktif/terkunci.
- **Assignment:** hanya Manager/Admin yang meng-assign pekerjaan Prospek. RAB dan Quotation di-assign kepada Finance atau Media; kartu Form Pitching dan Kontrak kepada Assignee, Manager, Media, atau Finance. PM pemilik membuat, mereview, dan memutuskan tanpa hak assign. Penerima mendapat notifikasi in-app; kartu Form Pitching muncul di My Tasks, bukan di Forms.
- **Form Pitching:** kartu task ber-scope Pitching (`prospekId`, `pitchingId`, `templateStageId`), dikerjakan pada board SIMPRO di detail Pitching. Satu kartu per form stage template saat "Buat dari template"; kartu custom boleh ditambah. Pitching kalah membekukan kartunya.
- **Read-only:** Pitching kalah mengunci RAB, Quotation, kartu Form Pitching, dan kontraknya. Kontrak terkunci setelah konversi. Undo kalah mengembalikan status sebelumnya.
- **Reminder:** hanya in-app untuk penugasan, mendekati due date (3 hari), dan overdue; tidak ada email.
- **Siklus anak proyek:** anak proyek hasil konversi memakai tiga fase Planning → Running → Finance, dibuat belum aktif, menyalin step dari template Pitching, dan menampilkan snapshot PIC/client/periode/pagu Prospek. Konversi berjalan otomatis saat kontrak lengkap.
- **Forms:** halaman Forms adalah inbox Form proyek, Form Keuangan, dan pekerjaan Prospek RAB/Quotation/Kontrak. Kartu Form Pitching tidak tampil di Forms. Penerima assignment selalu melihat pekerjaannya, penugasan user lain tidak ditampilkan, dan Manager/Admin dapat meng-assign entri yang belum di-assign langsung dari halaman Forms. PM pemilik/Admin dapat mereview entri submitted dari Forms.
- **Journey manual:** proyek langsung tidak memakai template; step dibuat PM/Admin di tab Journey Management. Journey hanya mengelola struktur dan ringkasan; form ada di tab Forms, board di tab Board, dan keputusan Gerbang di Overview. Proyek hasil Prospek memakai template Pitching dan step pending tetap dapat diedit/dihapus.
- **Tampilan:** CRM Projects, CRM Umbrella, Forms, dan Prospek punya toggle Card/Table; default Card dan preferensi disimpan per halaman. Projects dan Prospek memiliki pagination, dan Projects menampilkan daftar datar dengan label Prospek/Umbrella.
- **Legacy:** proyek lama dengan step Pitching dan `ProjectGroup` lama tidak dimigrasikan ke Prospek.

## Implementasi

- Tipe dan state: `src/lib/prototype/types.ts`
- Helper domain, permission, pagu, dan scope Form: `src/lib/prototype/domain.ts`
- Aksi store, konversi, dan reminder: `src/lib/prototype/store.ts`
- Audit Prospek: `src/lib/prototype/prospek-events.ts`
- UI daftar/detail: `src/components/prototype/crm/prospek.tsx`, `src/components/prototype/crm/prospek-detail.tsx`
- Rute: `/crm/prospek`, `/crm/prospek/[id]`, `/crm/prospek/[id]/forms/[entryId]`
- Test: `tests/prospek.test.ts`
