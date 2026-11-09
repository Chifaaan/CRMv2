# Proposal

## Why

Saat ini proses sebelum proyek berjalan (pitching, RAB, quotation, keputusan menang/kalah, kontrak) tidak punya wadah tersendiri. Pitching hanya hidup di dalam satu proyek, sehingga satu peluang klien yang berisi beberapa rencana proyek harus dipecah manual menjadi beberapa proyek sejak awal, RAB/quotation tersebar, dan tidak ada satu tempat untuk melihat pagu, status keputusan, serta kontrak sebelum proyek dieksekusi.

Prospek sebagai umbrella project menutup celah itu: satu Prospek menampung banyak Pitching, setiap Pitching punya RAB dan Quotation sendiri, dan hanya Pitching yang menang beserta kontraknya yang berubah menjadi anak proyek untuk dieksekusi di SIMPRO.

## What Changes

- Menu dan entitas baru **Prospek** di CRM (`/crm/prospek`), berbentuk seperti Group yang sudah ada namun punya detail sendiri: kode, nama, deskripsi, PIC, client, periode, dan pagu.
- Prospek berisi banyak **Pitching**. Setiap Pitching memilih template proyeknya sendiri saat dibuat, sehingga anak proyek mewarisi struktur yang sudah direncanakan.
- Setiap Pitching memiliki **RAB** (manpower + item biaya, submitter, tanggal submit, versi, lampiran/notifikasi/reminder) dan **Quotation** (mode Submit Link atau Import PDF, assignee, status draft/submitted/approved, versi).
- Tugas Prospek (mis. Presentasi, Concept Deck) dikerjakan sebagai **entri Form** memakai template Form, assignment, versi, dan review yang sudah ada.
- **Decision** Menang/Kalah dicatat PM pemilik atau Admin. Pitching kalah wajib beralasan dan menjadi riwayat read-only; Pitching menang wajib melengkapi **Kontrak** (nomor, tanggal, nilai, file, daftar Termine) sebelum dapat dikonversi.
- **Konversi** Pitching menang + kontrak lengkap menjadi anak proyek: proyek baru menyimpan `prospekId`/`pitchingId`, mewarisi RAB, Quotation, dan kontrak, serta mulai setelah tahap Pitching (Pitching tidak diulang di SIMPRO).
- **Termine** disimpan sebagai acuan pembayaran di fase Closing; Termine tidak otomatis membuat form Pembayaran/Invoice.
- **Pagu** hanya peringatan visual saat total RAB/Quotation melampaui pagu, bukan batas keras.
- **Reminder** hanya in-app: penugasan, mendekati due date, dan overdue. Tidak ada email.
- Proyek lama yang masih memakai step Pitching tetap berjalan sebagai **legacy** dan tidak dimigrasikan ke Prospek. `ProjectGroup` yang ada tidak berubah.
- Tidak ada perubahan pada alur SIMPRO selain proyek anak yang lahir dari Prospek.

## Capabilities

### New Capabilities

- `prospek-management`: entitas Prospek sebagai umbrella, detail PIC/client/periode/pagu, daftar Prospek, permission PM/Manager/Admin/Assignee, peringatan pagu, audit trail, dan konversi Pitching menang menjadi anak proyek.
- `prospek-pitching`: Pitching di dalam Prospek, RAB dan Quotation per Pitching, tugas berbasis Form, keputusan menang/kalah, kontrak beserta Termine, reminder in-app, dan riwayat read-only untuk Pitching kalah.

### Modified Capabilities

<!-- Tidak ada capability existing di repo ini (openspec/specs kosong). Perilaku proyek lama dan ProjectGroup tidak berubah. -->

## Impact

- **Model data & store**: tipe `Prospek`, `ProspekPitching`, `PitchingRab`, `PitchingQuotation`, `PitchingContract`, `Termine`; penyesuaian `FormEntry` agar bisa berada dalam scope Prospek/Pitching; persist migration baru yang tidak menyentuh data proyek lama.
- **Domain**: helper permission Prospek, aturan keputusan, aturan konversi, perhitungan pagu, dan reminder; tidak mengubah aturan Pitching legacy pada `Project`.
- **UI CRM**: menu Prospek, daftar/kartu Prospek seperti Group, halaman detail Prospek berisi daftar Pitching dan panel RAB/Quotation/Kontrak/Decision, serta form entry Prospek yang memakai komponen Form yang ada.
- **SIMPRO**: tidak ada menu baru; hanya menerima proyek anak hasil konversi dengan `prospekId`/`pitchingId` dan status tahap awal setelah Pitching.
- **Closing**: menampilkan referensi Termine dari kontrak Prospek pada proyek anak; tidak membuat form finance otomatis.
- **Data seed & test**: seed demo Prospek, unit test permission/decision/konversi/pagu/reminder, dan pembaruan dokumentasi (`AGENTS.md`, `Docs/Stage-Types.md`).
- **Tidak berdampak**: proyek lama dengan step Pitching, `ProjectGroup`, alur RAB/BAST/Invoice/Pembayaran yang sudah ada.
