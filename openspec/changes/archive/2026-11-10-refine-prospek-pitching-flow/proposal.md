# Proposal

## Why

Alur Prospek sudah berjalan, tetapi daftar Pitching masih berupa accordion padat, pekerjaan Prospek belum punya halaman kerja sendiri, dan aturan akses serta assignment belum sesuai operasi nyata. Assignee masih dapat membuka Prospek, Finance belum bisa ditugaskan, kontrak belum punya antrean kerja, keputusan kalah hanya bisa di kondisi terbatas, dan anak proyek hasil konversi belum otomatis masuk Group Prospek.

Perubahan ini merapikan pengalaman Pitching menjadi card + halaman kerja bersection, memperluas assignment ke Finance, menegaskan bahwa Assignee bekerja lewat My Tasks/Forms, serta menambahkan tampilan tabel untuk Projects, Groups, dan Forms.

## What Changes

- Daftar Pitching pada detail Prospek menjadi **card** yang menampilkan status, total/status RAB, status Quotation, kelengkapan kontrak, assignee, due date, dan tautan proyek hasil konversi.
- Card Pitching dapat dibuka menjadi **halaman Pitching** dengan section **RAB, Quotation, Form Pitching, Kontrak, Finishing**. Finishing berisi keputusan menang/kalah, undo kalah, kelengkapan kontrak, konversi, dan riwayat.
- **Kontrak hanya dapat diisi setelah Pitching menang**; sebelum menang section kontrak terkunci dengan penjelasan.
- Pitching yang belum dikonversi dapat ditandai **Kalah kapan saja** (draft maupun menang), langsung masuk arsip read-only, dan menyediakan **undo kalah** yang mengembalikan status serta data sebelumnya.
- **Assignee tidak dapat melihat Prospek** sama sekali. Pekerjaan yang di-assign diakses lewat **My Tasks** dan **Forms**; Form Pitching yang di-assign muncul di Forms.
- RAB, Quotation, Form Pitching, dan Kontrak dapat di-assign kepada **Assignee, Manager, dan Finance**. Penerima mendapat notifikasi in-app dan pekerjaannya muncul di My Tasks (Form juga di Forms).
- Menambahkan **tampilan Table/List** dengan toggle Card/Table pada **CRM Projects**, **CRM Groups**, dan **Forms**; default Card dan pilihan diingat per halaman.
- Saat Pitching menang dikonversi, **nama Prospek otomatis menjadi Group**: Group dengan nama yang sama dipakai ulang bila ada, jika belum ada dibuat baru, dan anak proyek langsung menjadi anggota Group tersebut.
- Proyek lama, `ProjectGroup` lama, dan alur Pitching legacy tidak dimigrasikan.

## Capabilities

### New Capabilities

- `table-list-views`: toggle Card/Table pada CRM Projects, CRM Groups, dan Forms, termasuk kolom tabel, default tampilan, dan ingatan pilihan per halaman.

### Modified Capabilities

- `prospek-management`: akses Assignee/Finance ke Prospek, konversi yang otomatis membuat/menggunakan Group Prospek, dan penyesuaian navigasi pekerjaan Prospek.
- `prospek-pitching`: daftar card + halaman Pitching bersection, kontrak setelah menang, kalah kapan saja + undo, assignment ke Finance/Manager/Assignee, dan visibilitas pekerjaan di My Tasks/Forms.

## Impact

- **Model data**: status sebelum kalah/undo, assignee dan due date kontrak, penanda pekerjaan Prospek di My Tasks, serta tautan Group ke Prospek.
- **Domain/store**: permission Prospek tanpa Assignee, kandidat assignee Prospek yang mencakup Finance, aksi kalah/undo, assignment kontrak, konversi yang membuat/mereuse Group, dan pengumpulan work item untuk My Tasks/Forms.
- **UI CRM**: card Pitching, halaman `/crm/prospek/[id]/pitching/[pitchingId]` dengan section, halaman kerja terbatas untuk assignee/Finance, serta toggle tabel pada Projects dan Groups.
- **UI SIMPRO**: Forms menampilkan Form Pitching yang di-assign dan mendapat toggle Card/Table.
- **Navigasi & akses**: Assignee tidak lagi diarahkan ke Prospek; akses pekerjaan lewat My Tasks/Forms. Finance tetap tidak melihat daftar/detail Prospek.
- **Test & dokumentasi**: test akses, kalah/undo, assignment Finance/Manager, visibilitas My Tasks/Forms, konversi + Group, dan toggle tabel; pembaruan `AGENTS.md`, `Docs/Prospek.md`, `Docs/Stage-Types.md`.
- **Tidak berdampak**: aturan stage proyek, board SIMPRO enam status, RAB/BAST/Invoice/Pembayaran, dan data Pitching legacy.
