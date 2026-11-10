# Design

## Context

Lihat `proposal.md` untuk motivasi dan spec delta untuk perilaku. Kondisi saat ini:

- Detail proyek CRM masih satu halaman panjang dengan stepper dan panel step.
- Proyek baru masih mendukung mode template/manual; template eksekusi menyalin step.
- Forms SIMPRO menampilkan Form proyek dan Form Pitching, tetapi belum menampilkan RAB/Quotation/Kontrak Prospek sebagai pekerjaan Forms berkategori.
- Link Pekerjaan divalidasi sebagai URL HTTP/HTTPS dan belum punya tombol Simpan.
- Tabel Projects belum punya kolom Prospek.

## Goals / Non-Goals

**Goals:**
- Memisahkan Overview, Journey Management, dan Board tanpa membuat halaman baru.
- Menjadikan step proyek baru sepenuhnya manual dan bebas.
- Menyatukan pekerjaan Prospek yang di-assign ke Forms SIMPRO dengan kategori jelas.
- Menyederhanakan aturan Link Pekerjaan dan menambah aksi Simpan.
- Menambah kolom Prospek pada tabel Projects.

**Non-Goals:**
- Tidak menghapus data/template legacy atau memigrasikan proyek lama ke manual.
- Tidak menambah backend, integrasi SIMPRO nyata, atau validasi akses tautan eksternal.
- Tidak mengubah Groups manual atau alur Prospek selain visibilitas pekerjaan di Forms.

## Decisions

1. **Tab proyek berbasis query `tab`.**
   Detail proyek memakai tab `overview | journey | board`, default `overview`, disimpan di URL agar deep-link. Tab berlaku untuk semua proyek; konten legacy tetap ditampilkan.

2. **Overview menggabungkan header, asal Prospek, riwayat, dan penyelesaian tahap.**
   Overview memakai data yang sudah ada (`prospekSnapshot`, `projectEvents`, step status). Tidak ada model baru.

3. **Journey Management manual-only untuk proyek baru.**
   Proyek baru dibuat tanpa step (`creationMode: "manual"`). PM/Admin membuat step dengan nama bebas, memilih fase aktif atau fase berikutnya, dan mengatur Manager PIC. Template tidak lagi ditawarkan pada pembuatan proyek baru; template lama tetap tersimpan untuk histori/legacy. Konversi Prospek juga membuat anak proyek manual tanpa step.

4. **Running kosong saat mulai Planning.**
   Karena proyek baru tidak menyalin template, memulai dari Planning hanya mengaktifkan step Planning yang dibuat PM. Running tetap kosong sampai PM menambahkan step Running. Memulai langsung dari Running menandai Planning Dilewati dan membutuhkan minimal satu step Running.

5. **Board tab mengembed board SIMPRO.**
   Tab Board merender `TaskBoard`/board SIMPRO yang sama dengan filter step aktif. Task tetap dibuat di SIMPRO dan menyimpan `stageId`/`stepKey`; tab hanya menyediakan referensi dan akses cepat.

6. **Forms SIMPRO menampilkan work item Prospek berkategori.**
   `FormRow` mendapat `category: "Prospek" | "Project"`. Work item Prospek berasal dari `prospekWorkItemsForUser` (RAB, Quotation, Kontrak) plus FormEntry Pitching; Form proyek tetap `Project`. Tautan work item memakai route kerja Prospek. Filter Forms menambahkan kategori.

7. **Link Pekerjaan: wajib, tanpa validasi URL, dengan tombol Simpan.**
   Domain mengganti `validWorkUrl` menjadi `hasWorkLink` (non-empty). TaskDialog menampilkan input dan tombol **Simpan** yang memanggil `updateTaskWorkUrl`; transisi In Progress tetap mensyaratkan link non-empty. Link non-URL ditampilkan sebagai teks, bukan anchor.

8. **Kolom Prospek pada tabel Projects.**
   Tabel membaca `project.prospekId` dan menampilkan nama Prospek sebagai tautan; proyek langsung menampilkan “—”.

## Risks / Trade-offs

- [Tab Board duplikat dengan SIMPRO] → embed komponen board yang sama, bukan implementasi kedua.
- [Proyek baru manual-only menghapus kemudahan template] → template tetap tersedia untuk histori; PM dapat membuat step bebas.
- [Work item Prospek ganda di My Tasks dan Forms] → Forms menampilkan kategori Prospek dan tautan yang sama; tidak ada duplikasi data, hanya surface berbeda.
- [Link non-URL bisa disalahgunakan] → tetap wajib non-empty, ditampilkan sebagai teks jika bukan URL, dan hanya terlihat oleh role berwenang.
- [Legacy project tidak punya snapshot Prospek] → Overview menampilkan data yang ada dan “—” untuk yang tidak tersedia.

## Migration Plan

Tidak ada perubahan persist wajib. Proyek baru memakai `creationMode: "manual"`; proyek template/legacy yang sudah ada tetap memakai data dan tampilan lama. Tidak ada migrasi template atau penghapusan data.

## Open Questions

Tidak ada.
