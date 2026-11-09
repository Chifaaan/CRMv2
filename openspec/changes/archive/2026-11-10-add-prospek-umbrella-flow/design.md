# Design

## Context

Lihat `proposal.md` untuk motivasi dan `specs/` untuk perilaku yang diminta. Kondisi teknis saat ini:

- Aplikasi prototype memakai Zustand + `localStorage` (persist version 4) dan IndexedDB untuk berkas.
- `Project` sudah punya `managerId` dan `groupId`; `ProjectGroup` hanya berisi nama/deskripsi/status.
- `Pitching` yang ada terikat ke `projectId` dan hanya dipakai step Pitching legacy.
- `FormEntry` terikat wajib ke `projectId` dan `stepKey`; template Form diambil dari step proyek.
- Audit proyek memakai `ProjectEvent` dengan `projectId` wajib.
- Permission operasional memakai helper di `domain.ts` (`canAssignOperational`, `operationalAssigneeCandidates`, `canWorkFormEntry`).
- Reminder saat ini berupa entri `Notification` in-app.

## Goals / Non-Goals

**Goals:**

- Menambah Prospek dan Pitching sebagai data baru tanpa mengubah data proyek lama.
- Memakai kembali mesin Form, assignment, notifikasi, dan audit yang sudah ada.
- Menjaga konversi Pitching → anak proyek tetap idempotent dan dapat diaudit.
- Menjaga perubahan persist tetap additive dan idempotent.

**Non-Goals:**

- Tidak memigrasikan step Pitching legacy ke Prospek.
- Tidak mengubah `ProjectGroup` atau alur finance RAB/BAST/Invoice/Pembayaran.
- Tidak menambah backend, email, atau integrasi SIMPRO baru.
- Tidak membuat template Prospek terpisah; Prospek memakai flow tetap.

## Decisions

### 1. Entitas terpisah, bukan memperluas `ProjectGroup`

Prospek disimpan sebagai koleksi baru (`prospeks`) dengan field detail sendiri. Kartu dan pola accordion meniru `ProjectGroup` di `projects.tsx`, tetapi data, status, dan halamannya terpisah. Alternatif memperluas `ProjectGroup` ditolak karena group dipakai untuk pengelompokan manual proyek yang sudah berjalan dan tidak punya siklus Pitching, pagu, atau kontrak.

### 2. Model data additive

Tipe baru:

- `Prospek`: `id`, `code`, `name`, `description`, `picId?`, `client`, `periodStart`, `periodEnd`, `pagu`, `status` (`active` | `completed` | `cancelled`), `cancelReason?`, `createdById`, `createdAt`, `updatedAt?`.
- `ProspekPitching`: `id`, `prospekId`, `title`, `description`, `templateId`, `templateVersion`, `status` (`draft` | `won` | `lost`), `createdById`, `createdAt`, `decidedAt?`, `decidedById?`, `lostReason?`, `projectId?`.
- `PitchingRab`: `id`, `pitchingId`, `status`, `items` (memakai `RabItem` + `kind: "manpower" | "cost"`), `notes`, `assigneeId?`, `dueDate?`, `submittedAt?`, `submittedById?`, `versions`.
- `PitchingQuotation`: `id`, `pitchingId`, `mode` (`link` | `pdf`), `url?`, `attachment?`, `amount?`, `assigneeId?`, `dueDate?`, `status`, `versions`, `submittedAt?`, `submittedById?`, `approvedAt?`, `approvedById?`.
- `PitchingContract`: `number`, `date`, `value`, `attachment?`, `termine: Termine[]`.
- `Termine`: `id`, `label`, `amount`, `dueDate`, `note?`.

`amount` pada Quotation opsional karena mode link/PDF tidak selalu menyertakan nilai; pagu memakai nilai RAB dan `amount` Quotation bila ada.

### 3. FormEntry mendapat scope Prospek

`FormEntry` diubah menjadi:

- `scope: "project" | "prospek"` (data lama dimigrasikan ke `"project"`),
- `projectId?` menjadi opsional,
- tambahan `prospekId?`, `pitchingId?`.

Entri Prospek memakai `templateStageId` dari template proyek yang dipilih Pitching untuk mengambil snapshot `formTemplate`, sehingga field, versi, submit, review, dan assignment tetap memakai komponen dan helper Form yang ada. Alternatif membuat entitas `ProspekFormEntry` terpisah ditolak karena menduplikasi validasi, versi, dan review.

### 4. RAB dan Quotation adalah entitas per Pitching

RAB dan Quotation tidak memakai `StepForm` proyek karena dimiliki Pitching, punya versi sendiri, dan dapat di-assign sebelum proyek ada. Penomoran versi mengikuti pola `form-versions.ts` (versi baru saat submit, versi lama tetap tersimpan).

Aturan submit:

- RAB minimal punya satu item; status `submitted` mencatat submitter dan waktu.
- Quotation link wajib URL valid; mode PDF wajib berkas; status `submitted` mencatat submitter dan waktu; approval hanya PM pemilik/Admin.

### 5. Decision dan contract sebagai gerbang konversi

Keputusan hanya untuk PM pemilik Prospek atau Admin. Syarat menang/kalah: RAB `submitted` dan Quotation `submitted`/`approved`. Kalah wajib `lostReason`. Setelah diputuskan, Pitching, RAB, Quotation, Form, dan kontraknya read-only; Form yang belum selesai dibatalkan atau dikunci dari pengeditan.

Kontrak hanya untuk Pitching menang dan wajib lengkap (nomor, tanggal, nilai, berkas, minimal satu Termine) sebelum `convertPitching` boleh berjalan. Kontrak menjadi read-only setelah konversi.

### 6. Konversi memakai jalur pembuatan proyek yang ada

`convertPitching` memanggil logika pembuatan proyek dengan template Pitching, lalu:

- mengisi `prospekId` dan `pitchingId` pada proyek anak,
- menyalin RAB, Quotation, dan kontrak sebagai snapshot/referensi pada proyek anak,
- menetapkan `managerId` dari PIC Prospek bila PIC ber-role Manager,
- menandai seluruh tahap fase Prospek (termasuk tahap Pitching bila ada) sebagai selesai saat pembuatan (creation-time), bukan skip setelah proyek dibuat, sehingga `structureLocked` tetap dihormati,
- mencatat event konversi dan menolak konversi kedua.

Alternatif membuat proyek lalu mengubah struktur ditolak karena melanggar aturan struktur terkunci.

### 7. Audit trail terpisah

Ditambah koleksi `prospekEvents` dengan bentuk mirip `ProjectEvent` tetapi `prospekId` wajib. Alternatif membuat `projectId` opsional pada `ProjectEvent` ditolak karena menyentuh backfill dan pembacaan event proyek yang sudah stabil.

Event minimal: `prospek.created`, `prospek.updated`, `prospek.cancelled`, `pitching.created`, `pitching.rab_submitted`, `pitching.quotation_submitted`, `pitching.decided`, `pitching.contract_saved`, `pitching.converted`.

### 8. Pagu dihitung dari nilai terkini

Ringkasan pagu menjumlahkan nilai RAB terbaru yang `submitted` dan `amount` Quotation terbaru yang `submitted`/`approved` per Pitching, lalu membandingkannya dengan `pagu`. Selisih ditampilkan sebagai peringatan, tidak pernah memblokir aksi.

### 9. Reminder in-app dengan deduplikasi

Reminder memakai `notifications` yang ada dengan tipe `prospek_assigned`, `prospek_due_soon`, dan `prospek_overdue`. Ambang "mendekati due date" adalah 3 hari sebelum due date. Setiap reminder memakai kunci deduplikasi (tipe + id entitas + tanggal) agar tidak berulang setiap render; sinkronisasi dijalankan saat hidrasi dan saat aksi yang mengubah due date/assignee.

### 10. Permission

Helper baru di `domain.ts`:

- `canManageProspek(user, prospek)`: Admin, atau PM pemilik, atau Manager.
- `canViewProspek(state, user, prospek)`: Manager/Admin, PM pemilik, atau Assignee yang punya pekerjaan di Prospek tersebut.
- `canDecidePitching(user, prospek, pitching)`: Admin atau PM pemilik Prospek.
- `canEditPitchingRab` / `canEditQuotation`: PM pemilik, Manager/Admin, atau assignee yang ditunjuk.
- `canConvertPitching`: Admin atau PM pemilik, ditambah syarat menang + kontrak lengkap.

Finance tidak masuk daftar role yang boleh melihat Prospek.

### 11. Rute dan UI

- `/crm/prospek` — daftar kartu Prospek, filter status, tombol buat Prospek.
- `/crm/prospek/[id]` — detail Prospek: header (PIC, client, periode, pagu, status), ringkasan pagu, daftar Pitching sebagai accordion/kartu.
- Panel Pitching: tab Ringkasan, RAB, Quotation, Form, Kontrak, Riwayat.
- Form entry Prospek memakai halaman `/crm/prospek/[id]/forms/[entryId]` yang memakai ulang komponen isi/submit/review Form yang ada.
- Menu Prospek ditambahkan ke `NAV_CRM`; label halaman ditambahkan ke pemetaan judul shell.

## Risks / Trade-offs

- [Perubahan `FormEntry.projectId` menjadi opsional menyentuh banyak pembacaan] → tambahkan helper `formEntryScope` dan jalankan type-check penuh; data lama diberi `scope: "project"` lewat migrasi.
- [Reminder bisa duplikat setiap render] → deduplikasi berdasarkan tipe + entitas + tanggal, dan sinkronisasi hanya pada aksi/hidrasi.
- [Pagu bisa dihitung ganda bila RAB dan Quotation sama-sama bernilai] → dokumentasikan bahwa pagu membandingkan total RAB dan nilai Quotation secara terpisah, bukan menjumlahkan keduanya sebagai biaya.
- [Template Pitching tidak punya tahap Pitching] → konversi tetap berjalan dan hanya menandai tahap Pitching bila ada.
- [Berkas PDF di localStorage] → berkas tetap disimpan di IndexedDB seperti lampiran yang ada; state hanya menyimpan metadata.
- [Audit Prospek menambah volume data] → event Prospek dipisah dari event proyek dan dibaca dengan pagination seperti riwayat proyek.
- [Data seed lama tanpa Prospek] → migrasi additive dengan array kosong; seed demo hanya diisi pada state awal baru.

## Migration Plan

1. Bump persist version ke 5.
2. Tambah array kosong `prospeks`, `prospekPitchings`, `pitchingRabs`, `pitchingQuotations`, `prospekEvents` bila belum ada.
3. Isi `scope: "project"` pada setiap `FormEntry` lama yang belum punya scope.
4. Jangan mengubah `projects`, `steps`, `pitchings`, `groups`, atau `formEntries` proyek selain penambahan scope.
5. Pastikan migrasi idempotent dengan test yang menjalankannya dua kali.
6. Rollback: kembalikan versi persist dan abaikan koleksi baru; data proyek lama tidak tersentuh.

## Open Questions

Tidak ada. Ambang reminder 3 hari dan pemakaian `amount` opsional pada Quotation dicatat sebagai keputusan desain dan dapat diubah tanpa mengubah spec.
