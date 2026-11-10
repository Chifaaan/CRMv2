# PRD: Alur CRM Baru dan Fondasi Template Proyek

**Produk:** CRM x SIMPRO (repo `Chifaaan/CRMv2`) | **Versi:** 0.1 (draft untuk review) | **Tanggal:** 3 November 2026 | **Pemilik:** Chifan (Muhammad Nur Irfan)

Dokumen ini adalah addendum untuk `Docs/PRD.md` dan `Docs/MVP.md` yang sudah ada di repo. Bagian yang bertentangan dengan aturan lama dinyatakan eksplisit di bagian 3, dan untuk bagian itu dokumen ini yang berlaku setelah disetujui.

## 1. Ringkasan

CRM x SIMPRO saat ini memakai satu journey tetap enam step (Pitching, Survey, RAB, Running, BAST, Invoice) untuk semua proyek. Contoh Project Journey & Task Breakdown dari client menunjukkan bahwa jenis proyek berbeda (KOL Campaign 9 tahap, Event Program 14 tahap) punya tahapan yang berbeda, dan atasan meminta CRM mencakup tahap prospek sebelum proyek sampai proyek selesai.

Perubahan ini memperkenalkan:

1. **Empat fase tetap:** Prospek, Planning, Running, Closing.
2. **Template proyek** (KOL Campaign, Event Program, Umum) berisi tahap dan task default, dikelola oleh Admin dan PM.
3. **Jenis tahap** (checklist, form keuangan, gerbang) dan **gerbang persetujuan klien = menang**.
4. **Penyesuaian tahap saat pembuatan proyek, lalu struktur terkunci.**
5. **Status siklus hidup proyek** (Aktif, Menang, Kalah, Batal, Selesai).

Seluruh pekerjaan dilakukan di prototype berbasis browser (Zustand, localStorage, IndexedDB), tanpa backend.

## 2. Latar belakang dan masalah

| Masalah | Dampak |
| --- | --- |
| Satu journey tetap untuk semua jenis proyek | Proses KOL dan Event tercampur, tahap yang tidak relevan tetap muncul |
| Tidak ada konsep prospek | Usaha sebelum menang (sourcing vendor, tarif, survei, produksi aset) tidak tercatat, proyek kalah tidak meninggalkan data |
| Tahap detail client (Rate Inquiry, Vendor Selection, dst.) tidak punya tempat | Task client tidak bisa dipetakan ke sistem |
| Anggaran, profit, dan manpower tidak dikontrol sebagai satu alur | Atasan tidak bisa menilai akurasi estimasi dan deviasi (fase berikutnya) |

Temuan dari analisis journey client: garis fase jatuh pada **batas komitmen kontrak**. Prospek = belum ada komitmen kontrak (brief sampai persetujuan klien). Planning = mulai berkomitmen (booking vendor atau venue, PO, briefing). Running = eksekusi. Closing = laporan akhir, BAST, invoice, pembayaran, evaluasi.

## 3. Kondisi saat ini dan aturan yang berubah

Sumber: `AGENTS.md` repo. Hal yang tidak tertulis di sana harus diverifikasi agent langsung di kode.

**Kondisi saat ini**

- Stack: Next.js 16, React 18, Tailwind 4, shadcn `base-nova`, Zustand, TanStack Query, `@dnd-kit`, react-hook-form dan zod, vitest.
- Data prototype: Zustand dengan `localStorage`, file di IndexedDB. Tidak ada backend, auth, atau integrasi SIMPRO sungguhan. Auth diganti role switcher lokal.
- Lokasi penting: aturan domain, gerbang, progress, permission di `src/lib/prototype/domain.ts`. Audit trail (`project_events`, backfill, baca dan pagination) di `src/lib/prototype/events.ts`. UI history di `src/components/prototype/crm/project-history.tsx`. Seed di `seed.ts`, store di `store.ts`, file di `files.ts`, Excel di `excel.ts`.
- Rute CRM: `/crm`, `/crm/projects`, `/crm/projects/[id]`, `/crm/groups`, `/crm/workload`. Rute SIMPRO: `/dashboard`, `/projects`, `/projects/[id]/*`, `/my-tasks`, `/forms`.
- Fitur yang sudah ada dan harus tetap berfungsi: stepper klik dan history, audit trail, group beserta drag and drop, panel form RAB/BAST/Invoice dengan versi dan approval, import Excel, workload, board SIMPRO enam status.

**Aturan lama yang digantikan**

| Aturan lama (AGENTS.md) | Aturan baru |
| --- | --- |
| Enam step tetap dan wajib, tanpa edit dan tanpa skip | Tahap berasal dari template. Boleh disesuaikan **hanya saat pembuatan proyek**, lalu terkunci. Template "Umum" mempertahankan enam step lama |
| Hanya Pitching dan Running yang punya kartu Task | Tidak berubah pada template Umum. Untuk template baru lihat pertanyaan terbuka P1 |
| Journey % memakai penyebut 5 (BAST dan Invoice paralel, masing-masing 0,5) | Journey % dihitung dari tahap dengan bobot. Template Umum **harus menghasilkan angka identik** dengan rumus lama |
| Hanya fase lama (Planning, Running, Finishing) | Empat fase: Prospek, Planning, Running, Closing. Label "Planning" tetap dipakai tetapi artinya berubah |

**Aturan lama yang tidak berubah:** permission akses proyek (PM hanya melihat proyek sendiri), hanya Manager atau Admin yang menugaskan task, PM tidak menolak BAST atau Invoice, Finance mengedit sampai PM menutup proyek, Pitching tanpa batas jumlah dan boleh beberapa winner, workload hanya menghitung kartu task aktif, board SIMPRO tetap enam status.

## 4. Tujuan dan non-tujuan

**Tujuan**

- G1. Satu sistem mendukung beberapa jenis proyek dengan tahapan berbeda tanpa mencampur proses.
- G2. Prospek menjadi bagian alur: usaha sebelum menang tercatat, proyek kalah atau batal tersimpan beserta alasan.
- G3. Tahapan konsisten per proyek: bisa disesuaikan saat dibuat, terkunci sesudahnya, sehingga history dan laporan bisa dibandingkan.
- G4. Semua fitur yang sudah ada tetap berjalan, dan proyek lama tidak kehilangan data.

**Non-tujuan (fase berikutnya)**

- Task dan deliverable lanjutan (PIC, tenggat, lampiran detail per task) di luar yang sudah ada.
- Database vendor atau KOL, perbandingan penawaran, profil klien, evaluasi dan repeat order.
- Laporan estimasi vs rencana vs aktual (profit, deviasi, manpower), tetapi model data jangan menghalanginya.
- Backend, auth sungguhan, sinkronisasi dengan SIMPRO.
- Satu proyek dengan lebih dari satu template.

## 5. Pengguna dan peran

| Peran | Hak pada fitur ini |
| --- | --- |
| Admin | Mengelola semua template, membuat proyek, melihat semua proyek |
| PM | Mengelola template (lihat P2), membuat proyek, menyusun dan memulai journey lewat Journey Management, melihat proyek sendiri, me-review dan menyetujui gerbang sesuai aturan yang ada |
| Manager | Menugaskan task dan form dari CRM atau form terbuka. Hak template belum ditetapkan |
| Finance | Mengisi form keuangan sesuai aturan yang ada |
| Assignee | Tidak berubah |

Hak **mengelola template** adalah hak baru yang terpisah dari permission akses proyek. Permission akses proyek tidak boleh berubah.

## 6. Konsep dan glosarium

- **Fase:** Prospek, Planning, Running, Closing. Urutan tetap, tidak bisa diubah user.
- **Template:** cetakan tahap dan task untuk satu jenis proyek. Memiliki versi dan status (aktif, diarsipkan). Template Umum bertanda `legacy` dan dikecualikan dari validasi "tepat satu gerbang menang".
- **Tahap:** satuan journey yang masuk ke tepat satu fase.
- **Jenis tahap:**
  - *Checklist:* daftar task ringan beserta status.
  - *Form keuangan:* RAB, BAST, atau Invoice, memakai panel versi dan approval yang sudah ada.
  - *Gerbang:* titik keputusan dengan hasil (misalnya persetujuan klien: menang atau kalah, atau Go/No-Go).
- **Tahap berbiaya sebelum komitmen:** tahap di Prospek yang mengeluarkan biaya sebelum menang (contoh: produksi aset KV pada Event). Biayanya harus terlihat meski proyek kalah.
- **Gerbang menang:** persetujuan klien. Setara dengan menang. Efeknya: RAB terkunci sebagai baseline, proyek pindah dari Prospek ke Planning, status siklus hidup menjadi Menang.
- **Status siklus hidup:** Aktif, Menang, Kalah (dengan alasan), Batal, Selesai. Terpisah dari fase.
- **Salinan tahap:** proyek menyimpan salinan tahap dan task dari template saat dibuat, beserta referensi template dan versinya. Template tidak ditautkan.

## 7. Kebutuhan fungsional

Prioritas: **M** = wajib, **S** = sebaiknya, **C** = bila waktu memungkinkan.

### 7.1 Template dan model data

- **FR-1 (M)** Template memiliki: nama, deskripsi, jenis proyek, versi, status, daftar tahap. Perubahan template membuat versi baru, dan hanya proyek baru yang memakai versi itu.
- **FR-2 (M)** Tahap memiliki: nama, deskripsi, fase tujuan, urutan, jenis tahap, wajib atau opsional, flag berbiaya sebelum komitmen, durasi standar (opsional), **bobot progress** dan **grup paralel** (agar BAST dan Invoice pada Umum tetap membagi 0,5 dan 0,5), serta task default.
- **FR-3 (M)** Task template memiliki: nama, peran penanggung jawab, wajib atau opsional, deliverable yang diharapkan (teks).
- **FR-4 (M)** Template bersifat rekomendasi. Jika dipilih saat membuat proyek, tahap dan task Prospek **disalin** ke proyek; mengedit atau mengarsipkan template tidak memengaruhi proyek yang sudah ada. Proyek juga boleh dibuat tanpa template.
- **FR-5 (M)** Template yang sedang dipakai proyek tidak bisa dihapus, hanya diarsipkan.
- **FR-6 (M)** Template awal disimpan sebagai data seed (bagian 8), bukan hardcode di komponen.

### 7.2 Editor template (Admin dan PM)

- **FR-7 (M)** Halaman pengelolaan template (rute baru di bawah `/crm`, misalnya `/crm/templates`): daftar, buat, ubah, duplikat, arsipkan.
- **FR-8 (M)** Editor: daftar tahap vertikal dikelompokkan per fase, bisa diurutkan (gunakan `@dnd-kit` yang sudah ada), panel samping untuk mengedit tahap dan task, pratinjau stepper di atas.
- **FR-9 (M)** Validasi: minimal satu tahap per fase, tepat satu gerbang menang (kecuali template `legacy`), urutan fase harus maju, tahap tidak bisa dipindah ke fase yang melanggar urutan, nama tahap unik dalam satu template.
- **FR-10 (S)** Simpan sebagai versi baru dengan catatan perubahan. Tampilkan jumlah proyek yang memakai tiap versi.
- **FR-11 (M)** Akses editor hanya untuk Admin dan PM. Aturan ditegakkan di `domain.ts`, bukan hanya menyembunyikan menu.

### 7.3 Pembuatan proyek dan penguncian

- **FR-12 (M)** Form buat proyek mulai dengan fase Prospek kosong. Template bersifat opsional: memilih template hanya mengisi tahap Prospek sebagai rekomendasi.
- **FR-13 (M)** PM boleh menambah tahap manual (`+ Tahap`), menghapus, mengubah nama/jenis, dan mengurutkan ulang tahap. Tahap Prospek baru selalu `pending`; tidak ada tahap yang otomatis aktif saat proyek dibuat.
- **FR-14 (M)** Ringkasan akhir sebelum "Buat proyek", draft tersimpan selama form belum dikirim, dan peringatan perubahan belum tersimpan. Proyek boleh dibuat tanpa tahap untuk dilengkapi lewat Journey Management.
- **FR-15 (M)** **Prospek bisa diubah sampai journey dimulai.** PM/Admin memulai journey secara eksplisit dari Journey Management; saat dimulai, tahap pertama aktif dan fase Prospek terkunci. Penegakan di `domain.ts`/store, bukan hanya di UI.
- **FR-16 (M)** Proyek dibuat saat Brief Received. Tidak ada entitas lead terpisah.
- **FR-17 (M)** Proyek boleh tanpa template. Jika template dipakai untuk mengisi tahap, proyek hanya menyimpan `templateId`/`templateVersion` sebagai jejak; template tidak membatasi perubahan tahap.
- **FR-17a (M)** Journey Management di Detail Proyek memungkinkan PM/Admin memilih fase dan mengelola tahap pada fase yang belum dimulai, termasuk Planning/Running yang sudah dibuka. Closing bersifat rule-driven dan tidak bisa diedit manual.
- **FR-17b (M)** Journey non-legacy wajib punya tepat satu Gerbang persetujuan klien sebagai tahap terakhir Prospek sebelum dimulai. Umum `legacy` dikecualikan.
- **FR-17c (M)** Saat Running dimulai, sistem menambahkan Closing dan menjamin tepat satu BAST dan satu Invoice paralel; template boleh menambah tahap Closing lain, dan proyek tanpa template memakai default BAST, Invoice, dan Pembayaran.

### 7.4 Gerbang dan siklus hidup

- **FR-18 (M)** Gerbang menang: aksi Setujui atau Tolak oleh peran yang berhak. Saat disetujui: RAB terkunci sebagai baseline, fase pindah ke Planning, status menjadi Menang. Saat ditolak: status Kalah, alasan wajib.
- **FR-19 (M)** Status Batal dapat ditetapkan di fase mana pun dengan alasan. Proyek Kalah dan Batal tetap tersimpan lengkap dengan history, bersifat read-only, dan tidak masuk workload.
- **FR-20 (S)** Go/No-Go (gerbang awal Prospek) mencatat keputusan, alasan, dan penanggung jawab.
- **FR-21 (M)** Dua persetujuan dibedakan: persetujuan internal RAB oleh PM dan persetujuan klien (gerbang menang).
- **FR-22 (S)** Tahap berbiaya sebelum komitmen diberi penanda yang jelas, dan total biayanya terlihat pada proyek Kalah.
- **FR-23 (M)** Keterangan singkat (tooltip) pada label fase, dan catatan rilis bahwa arti "Planning" berubah.

### 7.5 Stepper dan panel

- **FR-24 (M)** Stepper tingkat atas menampilkan empat fase. Tahap dari template tampil di dalam fase aktif atau terpilih. Perilaku klik, penanda aktif dan sedang-dilihat, nonaktif dengan `aria-disabled`, navigasi keyboard, dan `?step=` di URL tetap seperti yang sudah ada.
- **FR-25 (M)** Panel mengikuti jenis tahap: checklist (task, status, deliverable), form keuangan (mode Isi, Review, History yang sudah ada), gerbang (ringkasan dan aksi).
- **FR-26 (M)** Panel RAB harus bisa muncul di fase Prospek. RAB menjadi baseline saat gerbang menang disetujui.
- **FR-27 (M)** Panel history memakai audit trail yang sudah ada, ditambah event baru (FR-31).

### 7.6 Progress, kartu, dan filter

- **FR-28 (M)** Journey % dihitung dari tahap selesai dengan bobot dan grup paralel. **Template Umum harus menghasilkan angka yang sama persis dengan rumus lama** (uji regresi). Perbedaan pada proyek lama dilaporkan, tidak diubah diam-diam.
- **FR-29 (M)** Label fase pada kartu project, filter "Semua fase", kartu group, dan dashboard diganti ke empat fase. Kartu menampilkan nama template. Tambah filter template di halaman Projects.
- **FR-30 (S)** Progress group tetap berbasis proporsi proyek selesai. Proyek berstatus Kalah dan Batal dikeluarkan dari penyebut atau ditandai terpisah (lihat P5).

### 7.7 Audit trail

- **FR-31 (M)** Event baru lewat helper yang sudah ada: `project.created_from_template` atau `project.created_manual`, `project.structure_customized`, `journey.started`, `phase.started`, `phase.composed`, `phase.opened`, `closing.appended`, `gate.approved`, `gate.rejected` (dengan alasan), `project.lifecycle_changed`, `template.created`, `template.version_published`, `template.archived`.
- **FR-32 (M)** Penolakan aksi struktur setelah proyek terkunci tidak perlu dicatat sebagai event, tetapi UI menampilkan pesan jelas.

## 8. Template awal (seed)

### 8.1 KOL Campaign (9 tahap)

| No | Tahap | Fase | Jenis |
| --- | --- | --- | --- |
| 1 | Brief Received | Prospek | Checklist |
| 2 | KOL Listing | Prospek | Checklist |
| 3 | Rate Inquiry | Prospek | Checklist (RAB draf dibentuk di sini) |
| 4 | KOL Approval | Prospek | **Gerbang menang** |
| 5 | KOL Briefing | Planning | Checklist |
| 6 | Storyline Review | Planning | Checklist |
| 7 | Content Posting | Running | Checklist |
| 8 | Insight Collection | Running | Checklist |
| 9 | Final Report | Closing | Checklist |

Tambahkan di Closing: BAST dan Invoice (form keuangan, paralel), pembayaran dan evaluasi (checklist). Keempat tahap ini tidak ada pada contoh client.

### 8.2 Event Program (14 tahap)

| No | Tahap | Fase | Jenis |
| --- | --- | --- | --- |
| 1 | Brief Received | Prospek | Checklist |
| 2 | Create Strategy & Concept | Prospek | Checklist |
| 3 | Create KV & Key Visual Assets | Prospek | Checklist, **berbiaya sebelum komitmen** |
| 4 | Contact Vendor | Prospek | Checklist |
| 5 | Site Survey | Prospek | Checklist |
| 6 | Budget & Quotation Review | Prospek | Form keuangan (RAB) |
| 7 | Vendor Selection | Prospek | Checklist |
| 8 | Client Approval | Prospek | **Gerbang menang** |
| 9 | Confirm Vendor & Venue | Planning | Checklist |
| 10 | Production Preparation | Planning | Checklist |
| 11 | Event Setup | Planning | Checklist |
| 12 | Event Execution | Running | Checklist |
| 13 | Documentation | Running | Checklist |
| 14 | Post-Event Report | Closing | Checklist |

Tambahkan di Closing: BAST, Invoice (paralel), pembayaran, dan evaluasi.

### 8.3 Umum (legacy)

Pitching, Survey, RAB, Running, BAST, Invoice dengan perilaku persis seperti sekarang (BAST dan Invoice paralel dan masing-masing 0,5 dari Finance). Pemetaan fase: Pitching, Survey, RAB ke Prospek, Running ke Running, BAST dan Invoice ke Closing. Fase Planning kosong. Pemetaan ini adalah asumsi dan harus dilaporkan agent untuk dikonfirmasi (lihat P4).

## 9. Model data (konseptual)

Bentuk TypeScript berikut ilustratif. Agent menyesuaikannya dengan tipe di `domain.ts` dan `store.ts`.

```ts
type Phase = 'prospek' | 'planning' | 'running' | 'closing';
type StageKind = 'checklist' | 'finance_form' | 'gate';
type Lifecycle = 'active' | 'won' | 'lost' | 'cancelled' | 'done';

interface TemplateStage {
  id: string; name: string; description?: string;
  phase: Phase; order: number; kind: StageKind;
  required: boolean; costBeforeCommitment?: boolean;
  weight?: number; parallelGroup?: string;
  financeKind?: 'rab' | 'bast' | 'invoice';
  gateKind?: 'go_no_go' | 'client_approval';
  tasks: { id: string; name: string; role?: string; required: boolean; deliverable?: string }[];
}
interface ProjectTemplate {
  id: string; name: string; version: number; legacy?: boolean;
  status: 'active' | 'archived'; stages: TemplateStage[];
}
// Project menyimpan salinan:
interface ProjectStageInstance extends TemplateStage {
  projectId: string; status: 'pending' | 'active' | 'done'; completedAt?: string;
}
// Project: templateId, templateVersion, lifecycle, lostReason?, stages: ProjectStageInstance[], structureLocked: boolean
```

Persistence: tambahkan koleksi template dan field baru ke store Zustand dengan **versi dan fungsi migrasi** persist (`version` dan `migrate`) agar data localStorage lama tidak rusak. Seed template ditambahkan ke `seed.ts`. Event baru ditulis lewat `events.ts`.

## 10. Dampak ke kode

| Area | Perubahan |
| --- | --- |
| `src/lib/prototype/domain.ts` | Fase, jenis tahap, gerbang, penguncian struktur, progress berbobot, hak template, validasi template |
| `src/lib/prototype/store.ts` | Koleksi template, salinan tahap pada proyek, status siklus hidup, versi dan migrasi persist |
| `src/lib/prototype/seed.ts` | Seed tiga template, pemetaan proyek demo ke Umum |
| `src/lib/prototype/events.ts` | Event baru (FR-31), backfill tidak berubah |
| `src/components/prototype/crm/` | Stepper empat fase, panel per jenis tahap, project-history, kartu project dan group, filter |
| `src/app/(main)/crm/` | Rute pengelolaan template, alur buat proyek dengan langkah penyesuaian |
| `tests/` | Test baru (bagian 13) |
| `AGENTS.md` dan `Docs/` | Perbarui bagian "Product rules" dan tautkan dokumen ini |

Aturan lint repo dibatasi ke path tertentu, sehingga file baru harus berada di path yang tercakup (`src/components/prototype`, `src/lib/prototype`, `src/app/(main)/crm`, `tests`). Jangan menambah dependency. Reuse shell, primitive UI, dan token visual yang ada, dan jangan membuat sidebar atau design system kedua.

## 11. Migrasi proyek yang ada

- Semua proyek lama dihubungkan ke template Umum, dengan tahap disalin dari enam step lama. Data step, status, versi form, dan history tidak berubah.
- Pemetaan fase lama ke empat fase baru sesuai bagian 8.3, dilaporkan di ringkasan.
- Status siklus hidup awal: Aktif untuk proyek berjalan, Selesai untuk proyek yang sudah ditutup, Batal untuk proyek yang sudah berstatus cancelled.
- Migrasi idempotent dan dijalankan lewat migrasi persist store.
- Progress proyek lama dibandingkan sebelum dan sesudah migrasi. Selisih dilaporkan.
- Tambahkan event sintetis "Dihubungkan ke template Umum" pada proyek lama.

## 12. Persyaratan non-fungsional

- **Aksesibilitas:** kontras WCAG AA, fokus terlihat, `aria-expanded`, `aria-current`, `aria-disabled`, `role=tablist` pada stepper, label dan `aria-describedby` pada form, navigasi keyboard.
- **Responsif:** stepper scroll horizontal di dalam container, editor template dan langkah penyesuaian tetap bisa dipakai di layar sempit.
- **State:** loading, kosong, dan error di semua layar baru.
- **Performa:** stepper dan editor tetap responsif untuk template sampai 30 tahap dan 10 task per tahap.
- **Konsistensi data:** perubahan template tidak memengaruhi proyek yang ada, tidak ada state ganda antar halaman.
- **Bahasa UI:** Bahasa Indonesia, konsisten dengan label yang sudah ada.

## 13. Rencana rilis dan kriteria penerimaan

### M1: Fondasi data dan migrasi

- Tipe, koleksi template, seed tiga template, salinan tahap pada proyek, migrasi persist, dan migrasi proyek lama ke Umum.
- **Diterima jika:** semua test lama lolos, progress proyek lama identik, aplikasi berjalan tanpa error dengan data localStorage lama, dan migrasi idempotent.

### M2: Empat fase, stepper, dan gerbang

- Stepper empat fase, panel per jenis tahap, gerbang menang, status siklus hidup, label dan filter fase.
- **Diterima jika:** persetujuan klien memindahkan proyek ke Planning dan mengunci RAB, penolakan menjadikan proyek Kalah dengan alasan, dan proyek Kalah atau Batal read-only dan tidak masuk workload.

### M3: Editor template dan pembuatan proyek

- Halaman template, editor, validasi, versi, langkah "Sesuaikan tahapan", dan penguncian struktur.
- **Diterima jika:** Admin dan PM bisa mengelola template, peran lain tidak bisa, struktur proyek tidak bisa diubah setelah dibuat (ditolak di lapisan domain), dan mengedit template tidak mengubah proyek yang sudah ada.

### M4: Penyelesaian

- Event audit baru, tooltip fase, catatan rilis, pembaruan `AGENTS.md` dan `Docs/`.
- **Diterima jika:** `npm run build`, `npm run lint`, dan `npm test` lolos.

### Pengujian wajib (vitest)

- Penyalinan template ke proyek dan independensi dari perubahan template.
- Validasi template dan validasi penyesuaian saat pembuatan.
- Penguncian struktur setelah proyek dibuat.
- Transisi gerbang (menang, kalah, batal) dan dampaknya pada RAB dan fase.
- Progress: Umum identik dengan rumus lama, template baru berbobot benar, grup paralel.
- Permission: hak template (Admin dan PM), PM hanya melihat proyek sendiri, peran lain ditolak.
- Migrasi proyek lama dan idempotensi.
- Regresi: group, panel RAB/BAST/Invoice, audit trail, workload.

## 14. Metrik keberhasilan

- Proyek KOL dan Event dibuat dari template tanpa tahap yang tidak relevan.
- 100% proyek baru memiliki template dan status siklus hidup.
- Proyek Kalah dan Batal tersimpan dengan alasan (target 100%).
- Tidak ada regresi pada test lama dan nilai progress proyek lama.
- Pengurangan waktu pembuatan proyek dibanding mengisi manual (diukur secara kualitatif oleh tim).

## 15. Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Perubahan arti "Planning" membingungkan tim | Tooltip, catatan rilis, pemetaan lama ke baru yang eksplisit |
| Template Umum menghasilkan progress berbeda | Uji regresi wajib, bobot dan grup paralel pada model |
| Data localStorage lama rusak | Versi dan migrasi persist, uji dengan snapshot data lama |
| Tahap terkunci tetapi ternyata salah | Penyesuaian dilakukan saat pembuatan dengan ringkasan akhir. Jalur koreksi pasca-pembuatan menjadi pertanyaan terbuka P3 |
| Beban input naik | Template mengurangi pengetikan, field wajib seminimal mungkin |
| Terlalu fleksibel sehingga laporan tidak sebanding | Fase dan gerbang tetap, hanya tahap di dalam fase yang bisa diubah |
| Prospek berat secara operasional | Catat usaha dan biaya sebelum komitmen, siapkan evaluasi Go/No-Go di fase berikutnya |

## 16. Pertanyaan terbuka

- **P1.** Apakah tahap checklist pada KOL dan Event menjadi kartu Task di board SIMPRO dan masuk workload, atau tetap ringan seperti StepForm? Aturan lama membatasi kartu Task pada Pitching dan Running. **Default PRD ini:** checklist tidak muncul di board, My Tasks, dan workload.
- **P2.** Apakah PM boleh mengelola semua template, atau hanya template yang ia buat? Admin dan PM sudah disepakati, cakupan PM belum.
- **P3.** Jika struktur terkunci ternyata salah, adakah jalur koreksi (misalnya hanya Admin, atau membuat ulang proyek)? Default: tidak ada jalur koreksi pada rilis ini.
- **P4.** Pemetaan template Umum (Pitching, Survey, RAB ke Prospek, Planning kosong) perlu dikonfirmasi.
- **P5.** Bagaimana proyek Kalah dan Batal diperlakukan pada progress group dan dashboard (dikeluarkan atau ditampilkan terpisah)?
- **P6.** Hubungan Pitching dengan beberapa winner dan gerbang menang (persetujuan klien). Apakah winner pitching tetap dipakai pada Umum dan bagaimana ia terkait dengan gerbang menang?
- **P7.** Siapa yang berhak menyetujui gerbang menang (PM, Manager, atau Admin)?
- **P8.** Apakah produksi aset berbiaya sebelum komitmen perlu tercatat sebagai angka biaya sekarang, atau cukup penanda?

## 17. Fase berikutnya

Task dan deliverable lanjutan, estimasi vs rencana vs aktual (anggaran, margin, manpower, deviasi), database vendor atau KOL dengan perbandingan penawaran, profil klien dan evaluasi pasca-proyek, serta pemisahan Prospek menjadi sub-fase Kualifikasi dan Penawaran bila beban operasionalnya terbukti berat.

## 18. Revisi November 2026: journey per fase, Media, dan revenue

Revisi ini menggantikan aturan struktur yang terkunci penuh saat proyek dibuat.

- **Journey per fase.** Hanya fase Prospek yang disalin saat proyek dibuat. Setelah gerbang menang, PM menyusun Planning dan Running; tahap Closing ditambahkan otomatis saat Running dimulai. Fase terkunci setelah dimulai dan fase selesai menjadi history read-only. Rujukan: `openspec/changes/evolve-workflow-roles-revenue/specs/project-journey/spec.md`.
- **Brief Received Event.** Create Strategy & Concept sampai Vendor Selection menjadi entri di bawah tahap Brief Received, bukan tahap terpisah. Client Approval tetap menjadi gerbang menang. Rujukan: spec `project-journey`.
- **Role Media dan BOD.** Media bekerja di SIMPRO untuk task/entri yang di-assign dan boleh mengisi BAST yang di-assign; tidak punya akses CRM umum dan tidak boleh mengedit RAB/Invoice/Pembayaran. BOD hanya membuka Business Dashboard read-only. Rujukan: `openspec/changes/evolve-workflow-roles-revenue/specs/work-assignment/spec.md`.
- **Alokasi backlog-first.** PM membuat proyek dan kartu di Backlog; Manager/Admin mengalokasikan ke assignee dan boleh memilih dirinya sendiri. PM tidak boleh meng-assign.
- **Link kerja wajib.** `To Do → In Progress` dan `Need Revision → In Progress` membutuhkan URL `http(s)` yang tersimpan di kartu dan tercatat di audit trail.
- **RAB/MO dan Business Dashboard.** Setiap item RAB/MO dipetakan ke unit bisnis (Makerspace, Makerspace Video, Spektrum). MO adalah dokumen proyek yang ter-roll up ke group/umbrella. Dashboard `/business` menampilkan revenue, cost, margin, margin %, planned RAB, dan variance. Rujukan: `openspec/changes/evolve-workflow-roles-revenue/specs/revenue-tracking/spec.md` dan `Docs/Revenue-Tracking.md`.

Aturan lama yang tetap berlaku: empat fase tetap, template Umum legacy dengan enam tahap dan progress identik, hanya Manager/Admin yang meng-assign, PM hanya melihat proyek sendiri, BAST/Invoice paralel, dan proyek kalah/batal read-only.

## Lampiran: peta fase lama ke baru

| Fase atau step lama | Fase baru (template Umum) |
| --- | --- |
| Planning: Pitching, Survey, RAB | Prospek |
| Running | Running |
| Finishing: BAST, Invoice | Closing |
| (belum ada) | Planning (kosong di Umum, terisi di KOL dan Event) |
