# PRD — CRM × SIMPRO (Prototype Monolith)

| Field | Value |
|---|---|
| Status | Final untuk implementasi prototype |
| Versi | 1.0 |
| Tanggal | 30 Oktober 2026 |
| Sumber keputusan | Sesi grilling 30 Oktober 2026 (Q1–Q32) |
| Dokumen terkait | [`MVP.md`](./MVP.md), [`References/`](./References/) |
| Menggantikan | `SIMPROv2/CRM-MVP.md` dan `SIMPROv2/BRIEF.md` untuk lingkup prototype ini |

> **Catatan implementasi terbaru:** aturan journey 6 step tetap di dokumen ini sudah digantikan oleh empat fase di `Docs/PRD-Alur-CRM-Baru.md`. Template kini opsional dan hanya mengisi Prospek sebagai rekomendasi; Proyek boleh mulai dengan Prospek kosong, tahap Prospek baru `pending`, dan PM memulai journey lewat Journey Management. Detail Proyek kini bertab **Overview** dan **Journey Management**: Overview khusus proyek yang dibuka (penyelesaian tahap, distribusi task, progress, riwayat), Journey Management menampilkan keempat fase termasuk `0 Tahap`, dan tahap baru dibuat lewat dialog nama/format dengan preview tabel. Fase yang sudah dimulai boleh menambah/menghapus tahap selama belum ada pekerjaan. Board SIMPRO untuk Assignee/Media hanya menampilkan tahap aktif dan selesai. Kartu punya Manager opsional di samping Assignee, PM boleh memindahkan kartu yang punya owner ke status mana pun, dan Link Pekerjaan tidak divalidasi sebagai URL. Detail tipe tahap dan distribusi form ada di `Docs/Stage-Types.md`.

---

## 1. Ringkasan

CRM dan SIMPRO adalah dua modul dari satu aplikasi monolith:

- **CRM** mengelola siklus proyek empat fase (Prospek, Planning, Running, Closing): membuat proyek, menyusun dan memulai journey, menjaga gate, mengelola pitching, survey, RAB, BAST, invoice, group, dan workload.
- **SIMPRO** mengelola eksekusi pekerjaan: board kanban, task, assignment, review, checklist, komentar, dan lampiran.

Prinsip pemisahnya:

> **CRM memiliki proyek, step, dan form. SIMPRO memiliki task card dan eksekusinya.**

Prototype ini dibuat untuk mendemonstrasikan satu proyek berjalan dari **Planning** sampai **Finance** tanpa kerja manual di luar kedua modul, dengan tampilan yang mengikuti screenshot SIMPRO di folder `Docs/References/`.

---

## 2. Latar belakang

SIMPRO yang berjalan saat ini cocok untuk proyek yang sudah masuk tahap eksekusi. Namun siklus nyata sebuah proyek dimulai jauh sebelum Running:

- Pitching dan penentuan pemenang
- Survey lapangan
- Penyusunan RAB
- Eksekusi proyek
- BAST
- Invoice

CRM dibutuhkan untuk mengelola tahap sebelum dan sesudah Running, serta menghubungkannya ke task execution di SIMPRO. Tanpa CRM, informasi pitching, survey, RAB, BAST, dan invoice tersebar dan progres proyek tidak terlihat sebagai satu journey.

---

## 3. Tujuan dan non-tujuan

### 3.1 Tujuan

1. Menyediakan satu lifecycle proyek dari Planning sampai Finance.
2. Menghubungkan hasil CRM (pitching, survey, RAB) ke pekerjaan di SIMPRO.
3. Menjaga gate antar step agar proyek tidak maju sebelum syaratnya terpenuhi.
4. Menyediakan monitoring progres proyek, group, dan workload assignee.
5. Menegakkan batas tanggung jawab tiap role.
6. Menjadi prototype yang bisa didemokan end-to-end di satu browser.

### 3.2 Non-tujuan

- Integrasi API nyata dengan SIMPROv2.
- Autentikasi, SSO, multi-tenant, dan manajemen user produksi.
- Portal klien.
- Pembayaran, e-signature, dan generate PDF.
- Notifikasi email/WhatsApp/push.
- Perhitungan biaya, margin, dan laporan keuangan formal.
- Custom journey builder atau template per jenis proyek.

---

## 4. Definisi dan glosarium

| Istilah | Definisi |
|---|---|
| **Proyek** | Satu pekerjaan klien yang memiliki journey, tim, dan output. |
| **Fase** | Empat fase tetap: `Prospek`, `Planning`, `Running`, `Closing`. |
| **Step** | Tahapan dalam satu fase. Prospek dapat disusun manual, dari template, atau kosong sebelum journey dimulai. |
| **Gate** | Syarat yang harus terpenuhi sebelum step bisa diselesaikan. |
| **Pitching** | Penawaran/konsep yang diajukan kepada klien; bisa menang atau kalah. |
| **Pitching Role** | Peran dalam pitching, misalnya Pembuat PPT atau Presenter. |
| **Requested Assignee** | Orang yang diusulkan PM untuk sebuah task pitching; Manager yang mengonfirmasi assignment. |
| **Survey** | Form hasil kunjungan lapangan, berisi foto, temuan, dan keterangan. |
| **RAB** | Rencana Anggaran Biaya; form item pekerjaan dan total. |
| **Running** | Fase eksekusi; seluruh task dikerjakan di SIMPRO. |
| **BAST** | Berita Acara Serah Terima; form finance di CRM. |
| **Invoice** | Tagihan; form finance di CRM. |
| **Task** | Card pekerjaan di SIMPRO. Hanya ada di step Pitching dan Running. |
| **StepForm** | Form non-card untuk Survey, RAB, BAST, dan Invoice. Bukan `Task`. |
| **Group** | Container untuk mengelompokkan beberapa proyek. |
| **Journey %** | Persentase step yang selesai. |
| **Work %** | Persentase task selesai (Pitching/Running) atau form selesai (Survey/RAB/BAST/Invoice). |
| **Workload** | Jumlah task card aktif yang di-assign ke seorang assignee. |

---

## 5. Persona dan role

Satu user hanya memiliki **satu role**.

| Role | Tanggung jawab utama | Akses modul |
|---|---|---|
| **Admin Utama** | Semua aksi dan semua data. | CRM + SIMPRO |
| **Manager** | Melihat semua proyek, meng-assign task, mengelola group, memantau workload. Tidak membuat task dan tidak review task. | CRM + SIMPRO |
| **PM** | Membuat proyek, mengelola pitching/survey/RAB, membuat task, review task, menyelesaikan step, menutup proyek. Hanya proyek miliknya. | CRM + SIMPRO |
| **Finance** | Mengisi RAB, BAST, dan Invoice. Melihat proyek lain read-only. | CRM |
| **Assignee** | Mengerjakan task dan form Survey yang di-assign. | SIMPRO |

### 5.1 Batas role

- **PM** hanya melihat proyek yang ia buat.
- **Manager** melihat semua proyek, tetapi tidak boleh mengubah konten task atau melakukan review.
- **Finance** melihat semua proyek, tetapi hanya bisa mengubah form finance yang di-assign kepadanya.
- **Assignee** tidak memiliki akses CRM.
- **Admin** dapat melakukan semua aksi, kecuali skip step (tidak ada skip di MVP).

### 5.2 Role switcher prototype

Karena prototype tidak memakai login, role diganti melalui dropdown di header. Perubahan role mengubah data yang terlihat dan aksi yang tersedia secara langsung.

---

## 6. Prinsip produk

1. **Satu pemilik per data.** CRM memiliki proyek, step, pitching, form, group, dan notifikasi. SIMPRO memiliki task, status task, assignment, komentar, checklist, dan attachment.
2. **Task card hanya untuk Pitching dan Running.** Survey, RAB, BAST, dan Invoice adalah StepForm.
3. **Satu step aktif pada satu waktu**, kecuali fase Finance di mana BAST dan Invoice aktif bersamaan.
4. **Tidak ada skip step.** Semua 6 step wajib dilalui atau proyek dibatalkan.
5. **Gate dihitung di server/domain layer, dieksekusi manual oleh PM.** Tombol selesai step nonaktif sampai gate lulus.
6. **Dua angka progres.** Journey % dan Work % tidak pernah digabung.
7. **Semua perubahan status task mengikuti role.** Tidak ada drag bebas yang melewati aturan.
8. **Semua data prototype transparan.** Ada seed data dan tombol reset.

---

## 7. Lifecycle proyek

### 7.1 Journey 6 step

```
PLANNING                 RUNNING          FINISHING
Pitching → Survey → RAB → Running → BAST ∥ Invoice → Selesai
```

Label kategori journey di UI: **Planning**, **Running**, **Finishing**. "Finishing" adalah label tampilan untuk fase Finance.

| Urutan | Step | Fase | Pemilik utama | Gate |
|---|---|---|---|---|
| 1 | Pitching | Planning | PM | Semua pitching diputuskan, minimal 1 menang, task pitching pemenang selesai. |
| 2 | Survey | Planning | Assignee (isi), PM (review) | Form Survey `approved`. |
| 3 | RAB | Planning | Finance (isi), PM (review) | Form RAB `approved`. |
| 4 | Running | Running | PM, Manager, Assignee | Tidak ada task aktif di step Running. |
| 5 | BAST | Finance | Finance (isi), PM (cek) | Form BAST `submitted`. |
| 6 | Invoice | Finance | Finance (isi), PM (cek) | Form Invoice `submitted`. |

**Catatan:** BAST dan Invoice berada di fase Finance dan berjalan paralel. Keduanya aktif bersamaan; tidak ada urutan wajib antara keduanya.

### 7.2 Aturan step

- Tepat satu step aktif, kecuali Finance yang memiliki dua step aktif (BAST dan Invoice).
- Step berikutnya baru aktif setelah step sebelumnya `completed`.
- Step hanya bisa diselesaikan oleh PM pemilik proyek atau Admin.
- Step tidak bisa di-skip. Jika proyek tidak memungkinkan lanjut, PM/Manager/Admin membatalkan proyek dengan alasan.
- Step yang sudah `completed` terkunci.
- Pitching yang tidak menghasilkan pemenang membuat proyek tidak bisa lanjut; proyek harus dibatalkan.

### 7.3 Status proyek

| Status | Arti |
|---|---|
| `active` | Proyek berjalan; step aktif menunggu pekerjaan/gate. |
| `completed` | Semua step selesai dan PM sudah menutup proyek. |
| `cancelled` | Proyek dihentikan dengan alasan. |

Tidak ada status `on_hold` di MVP.

---

## 8. Functional requirements

### 8.1 App shell dan navigasi

- Basis aplikasi adalah root repo yang sudah ada. SIMPRO memakai route dan komponen visual yang sudah ada di sana; CRM ditambahkan sebagai route group baru di `/crm`.
- Route SIMPRO yang dipakai ulang: `/dashboard`, `/projects`, `/projects/[id]`, `/projects/[id]/board`, `/projects/[id]/backlog`, `/projects/[id]/rab`, `/projects/[id]/forms`, `/my-tasks`, dan `/forms`.
- Route CRM: `/crm`, `/crm/projects`, `/crm/projects/[id]`, `/crm/groups`, `/crm/workload`.
- Sidebar berisi menu sesuai modul dan role. Menu frontend yang tidak dipakai prototype (Meetings, Personal Notes, Daftar Surat, Budget, Clients, Members) disembunyikan.
- Topbar berisi:
  - pengalih modul **CRM | SIMPRO** (hanya modul yang boleh diakses),
  - role switcher prototype (menggantikan auth/session),
  - notification bell,
  - nama/avatar user.
- Landing setelah memilih role:
  - Admin, Manager, PM, Finance → `/crm`
  - Assignee → `/my-tasks`
- Jika role tidak punya akses ke modul, route modul tersebut menampilkan 403/redirect.
- Tombol **Reset data demo** tersedia di sidebar dengan konfirmasi.
- Komponen UI memakai `src/components/ui` (shadcn base-nova) dan token dari `src/app/globals.css`; tidak membuat design system kedua.

### 8.2 CRM Dashboard

Menampilkan ringkasan sesuai visibilitas role:

- KPI: proyek aktif, proyek per fase, step tertahan, form finance menunggu.
- Pipeline proyek per fase (Planning, Running, Finance).
- Daftar proyek terbaru dengan progress dan fase.
- Daftar aksi yang menunggu user saat ini:
  - PM: pitching belum diputuskan, form menunggu review, step siap diselesaikan.
  - Manager: task backlog belum di-assign, form belum di-assign, group perlu perhatian.
  - Finance: RAB/BAST/Invoice yang di-assign dan belum submitted.
  - Admin: semua item di atas.
- Untuk PM, data hanya proyek miliknya.

### 8.3 Projects

- Daftar proyek dalam bentuk card/table dengan:
  - kode proyek, nama, klien, fase, status, prioritas, Journey %, Work %, tanggal mulai/target, avatar tim.
- Search berdasarkan nama, kode, atau klien.
- Filter fase, status, prioritas, dan group.
- PM/Admin dapat membuat proyek baru.
- Field proyek:
  - nama,
  - klien (free text),
  - deskripsi,
  - prioritas (`Low`, `Medium`, `High`, `Critical`),
  - tanggal mulai,
  - target selesai,
  - warna cover.
- Kode proyek dibuat otomatis (contoh: `LEMMIC`) dan unik.
- PM adalah creator proyek.
- Manager dapat melihat semua proyek, tetapi tidak mengedit konten proyek.
- PM/Manager/Admin dapat membatalkan proyek dengan alasan.
- Proyek dapat dimasukkan ke group (lihat §8.10).

### 8.4 Project detail dan stepper

Header proyek menampilkan:

- nama, kode, klien, prioritas, status, PM, tanggal.
- stepper 6 step dengan status `pending`, `active`, `completed`.
- **Journey %** dan **Work %**.
- badge ketersediaan data:
  - pitching: jumlah pitching, jumlah pemenang,
  - survey: status form dan jumlah foto,
  - RAB: total RAB dan status form,
  - running: jumlah task aktif/selesai,
  - BAST: nomor dan status,
  - invoice: nomor, nominal, dan status,
  - group: nama group jika ada.
- Tombol aksi step yang tersedia sesuai role.

Konten step:

| Step | Konten di CRM |
|---|---|
| Pitching | Daftar pitching, form create/edit, role assignment, tombol menang/kalah, riwayat. |
| Survey | Ringkasan read-only form Survey dari SIMPRO + tautan ke SIMPRO. |
| RAB | Form RAB interaktif untuk Finance; review untuk PM. |
| Running | Mirror read-only board SIMPRO: jumlah per status, daftar task, progress. |
| BAST | Form BAST + import Excel. |
| Invoice | Form Invoice + import Excel. |

Tombol **Selesaikan Step**:

- Nonaktif selama gate belum lulus.
- Menampilkan checklist syarat gate.
- Untuk Finance, tombol berubah menjadi **Selesaikan Proyek** dan hanya aktif saat BAST + Invoice `submitted`.

### 8.5 Pitching

#### 8.5.1 Data pitching

Setiap pitching memiliki:

- judul,
- deskripsi/catatan,
- status `draft`, `won`, atau `lost`,
- daftar role.

Setiap role memiliki:

- label bebas (contoh: `Pembuat PPT`, `Presenter`, `Riset Kompetitor`),
- requested assignee (user Assignee),
- relasi ke task yang dibuat.

#### 8.5.2 Jumlah dan pemenang

- Jumlah pitching tidak dibatasi; tidak ada aturan "harus 5".
- UI boleh menyediakan tombol cepat **Buat 5 Pitching**, tetapi lima bukan batas.
- Pemenang boleh lebih dari satu.
- Minimal harus ada satu pemenang untuk lanjut ke Survey.
- Pitching yang kalah tetap tersimpan di **Riwayat Pitching** dan bisa dilihat read-only.
- Pitching yang menang dan kalah sama-sama tidak bisa diubah setelah diputuskan.

#### 8.5.3 Task dari pitching

Untuk setiap role yang memiliki requested assignee, sistem membuat satu task card:

- judul: `[<judul pitching>] <label role>`
- step: Pitching
- status awal: `Backlog`
- requested assignee: user yang dipilih PM
- reporter: PM
- source: `pitching`

Alur assignment:

1. PM memilih requested assignee saat membuat/mengedit pitching.
2. Task muncul di `Backlog` dengan penanda requested assignee.
3. Manager/Admin mengonfirmasi assignment. Task pindah ke `To Do`.
4. Assignee mengerjakan task seperti task biasa.

Jika role dihapus sebelum pitching diputuskan, task terkait diarsipkan. Jika requested assignee diganti sebelum task keluar dari `Backlog`, task diperbarui. Setelah task keluar dari `Backlog`, perubahan role tidak lagi mengubah assignee task.

#### 8.5.4 Menang/kalah

- Hanya PM pemilik proyek atau Admin yang dapat menandai `won`/`lost`.
- Menang:
  - status pitching menjadi `won`,
  - task tetap aktif dan wajib diselesaikan sebelum step Pitching selesai.
- Kalah:
  - status pitching menjadi `lost`,
  - semua task milik pitching tersebut diarsipkan (`archivedAt`, alasan `pitching_lost`),
  - task tidak dihitung di board, progress, gate, atau workload,
  - task tetap terlihat di Riwayat Pitching.
- Jika semua pitching kalah, proyek tidak bisa lanjut; PM harus membatalkan proyek.

#### 8.5.5 Gate Pitching

Step Pitching dapat diselesaikan jika:

1. Semua pitching berstatus `won` atau `lost`.
2. Minimal ada satu pitching `won`.
3. Semua task milik pitching `won` berstatus `completed`.
4. Tidak ada task non-archived lain di step Pitching yang masih aktif.

PM kemudian menekan **Selesaikan Step**.

### 8.6 Survey

#### 8.6.1 Lokasi dan assignment

- Survey adalah **StepForm**, bukan Task.
- Form Survey berada di **SIMPRO**.
- Form dibuat otomatis saat step Survey aktif dengan status `unassigned`.
- Manager/Admin meng-assign form ke seorang Assignee.
- Assignee melihat form di menu **Forms** dan/atau tab **Forms** pada detail proyek.
- PM/Manager/Admin dapat melihat form; hanya assignee yang mengisi.
- Finance read-only.

#### 8.6.2 Field Survey

- tanggal survey,
- lokasi,
- PIC lapangan,
- temuan/hasil survey,
- kesimpulan/catatan,
- foto (minimal 1, maksimal 10; JPG/PNG/WebP; maksimal 5 MB per foto).

#### 8.6.3 Status dan review

```
unassigned → assigned → draft → submitted → approved
                                      ↘ need_revision → draft
```

- Assignee menyimpan draft lalu submit.
- PM/Admin review:
  - `approved`, atau
  - `need_revision` dengan komentar wajib.
- Setelah `approved`, form terkunci.
- Form `need_revision` dapat diperbaiki dan disubmit ulang.
- Gate Survey: form `approved`.
- PM kemudian menekan **Selesaikan Step**.

#### 8.6.4 Mirror di CRM

CRM menampilkan read-only:

- status form,
- tanggal, lokasi, PIC,
- ringkasan temuan,
- jumlah/foto,
- assignee,
- komentar review terakhir,
- tautan **Buka di SIMPRO**.

### 8.7 RAB

#### 8.7.1 Lokasi dan assignment

- RAB adalah **StepForm**, bukan Task.
- Form RAB berada di **CRM**.
- Form dibuat otomatis saat step RAB aktif dengan status `unassigned`.
- Manager/Admin meng-assign form ke seorang Finance.
- Finance mengisi form di CRM.
- PM/Manager/Admin dapat melihat; PM melakukan review.
- Tidak ada task RAB di SIMPRO.

#### 8.7.2 Field RAB

- daftar item pekerjaan:
  - deskripsi item,
  - qty,
  - satuan,
  - harga satuan,
  - total (otomatis),
- catatan,
- total RAB (otomatis dari item).

Tidak ada import Excel RAB di MVP.

#### 8.7.3 Status dan review

```
unassigned → assigned → draft → submitted → approved
                                      ↘ need_revision → draft
```

- Finance menyimpan draft lalu submit.
- PM/Admin review: `approved` atau `need_revision` dengan komentar wajib.
- Setelah `approved`, form terkunci.
- Gate RAB: form `approved`.
- PM kemudian menekan **Selesaikan Step**.

#### 8.7.4 Mirror di SIMPRO

Tab RAB di SIMPRO hanya menampilkan ringkasan read-only:

- status,
- total RAB,
- daftar item,
- assignee Finance.

Tidak ada aksi edit dari SIMPRO.

### 8.8 Running

#### 8.8.1 Prinsip

- Seluruh eksekusi Running dilakukan di SIMPRO.
- CRM hanya menampilkan mirror read-only.
- Board SIMPRO hanya menampilkan task dari **step aktif**.
- Untuk Assignee/Media yang terikat proyek, pilihan tahap board hanya menampilkan tahap `active` dan `completed`; tahap `pending` disembunyikan. Tahap selesai tetap bisa dibuka read-only.
- Task Running tidak bisa dibuat sebelum step Running aktif.
- Manager opsional pada kartu bisa memulai/mengajukan dan assign/reassign, tetapi tidakreview. PM pemilik boleh memindahkan kartu yang punya Assignee/Manager ke status mana pun; PM tetap tidak assign.

#### 8.8.2 Pembuatan task

- PM/Admin membuat task di SIMPRO untuk step aktif.
- Task baru selalu masuk `Backlog`.
- Task tanpa assignee tidak bisa keluar dari `Backlog`.
- Manager/Admin meng-assign task; task otomatis pindah ke `To Do`.
- Assignee tidak bisa membuat task.
- Manager tidak bisa membuat task.

#### 8.8.3 Field task

- kode task otomatis (`{kode proyek}-{nomor urut}`),
- judul,
- deskripsi,
- prioritas (`Low`, `Medium`, `High`, `Critical`),
- assignee (satu orang),
- manager (opsional, satu orang) di samping assignee,
- due date (opsional),
- checklist,
- komentar,
- attachment (maksimal 5 file, 5 MB per file),
- activity log.

#### 8.8.4 Status task

Enam status:

`Backlog`, `To Do`, `In Progress`, `Awaiting Approval`, `Need Revision`, `Completed`.

Tidak ada `On Check`, `Ready to Deploy`, `On Hold`, atau `Cancelled` di MVP.

#### 8.8.5 Gate Running

Step Running dapat diselesaikan jika **tidak ada task aktif** di step Running:

- `Backlog`,
- `To Do`,
- `In Progress`,
- `Awaiting Approval`,
- `Need Revision`.

Task `Completed` tidak menghalangi. Tidak ada parking lot.

PM kemudian menekan **Selesaikan Step**.

#### 8.8.6 Mirror di CRM

CRM menampilkan:

- jumlah task per status,
- daftar task beserta assignee dan due date,
- Work % step Running,
- peringatan jika masih ada task aktif,
- tautan **Buka Board di SIMPRO**.

Tidak ada aksi ubah status dari CRM.

### 8.9 Finance: BAST dan Invoice

#### 8.9.1 Prinsip

- BAST dan Invoice adalah **StepForm**, bukan Task.
- Keduanya berada di **CRM**.
- Keduanya aktif paralel di fase Finance.
- Finance mengisi dan submit.
- PM hanya memeriksa kelengkapan; tidak me-reject.
- Proyek selesai setelah PM menekan **Selesaikan Proyek** ketika BAST dan Invoice sama-sama `submitted`.

#### 8.9.2 Assignment

- Form BAST dan Invoice dibuat otomatis saat fase Finance aktif dengan status `unassigned`.
- Manager/Admin meng-assign masing-masing form ke seorang Finance.
- Bisa orang yang sama atau berbeda.
- Finance hanya bisa mengisi form yang di-assign kepadanya.

#### 8.9.3 Field BAST

- nomor BAST,
- tanggal BAST,
- catatan,
- link dokumen.

#### 8.9.4 Field Invoice

- nomor invoice,
- tanggal invoice,
- nominal,
- persentase PPN,
- nominal PPN (otomatis dari persentase, bisa dikoreksi),
- catatan,
- link dokumen.

Mata uang: IDR.

#### 8.9.5 Status

```
unassigned → assigned → draft → submitted
```

- Tidak ada status `approved` untuk BAST/Invoice.
- `submitted` adalah status final.
- Finance masih bisa mengedit form `submitted` selama proyek belum `completed`; edit mengembalikan status ke `draft` dan wajib submit ulang.
- Setelah proyek `completed`, form terkunci.

#### 8.9.6 Excel import

- Dialog import tersedia per proyek, dengan dua tab: **BAST** dan **Invoice**.
- Setiap tab mendukung:
  - isi manual,
  - unduh template,
  - import satu baris Excel.
- Import menampilkan preview dan validasi sebelum menyimpan.
- Import menimpa nilai form saat ini setelah konfirmasi.
- Tidak ada bulk import lintas proyek di MVP.

Template BAST:

`project_code`, `bast_number`, `bast_date`, `notes`, `document_url`

Template Invoice:

`project_code`, `invoice_number`, `invoice_date`, `amount`, `tax_percent`, `tax_amount`, `notes`, `document_url`

#### 8.9.7 Penyelesaian proyek

Tombol **Selesaikan Proyek** aktif jika:

1. Step Pitching, Survey, RAB, dan Running sudah `completed`.
2. BAST `submitted`.
3. Invoice `submitted`.
4. Proyek masih `active`.

Saat diklik:

- proyek menjadi `completed`,
- `actualEndDate` diisi,
- step BAST dan Invoice menjadi `completed`,
- form BAST/Invoice terkunci,
- group rollup diperbarui,
- notifikasi dikirim.

PM tidak bisa menyelesaikan proyek jika salah satu form belum `submitted`.

### 8.10 Groups

- Group adalah container datar; tidak memiliki step, BAST, atau invoice sendiri.
- Satu proyek hanya boleh berada di satu group.
- Minimal 2 proyek saat membuat group.
- Field: nama, deskripsi.
- Manager/Admin dapat membuat, mengubah, menambah/menghapus anggota, dan membubarkan group.
- PM dapat melihat group yang berisi proyek miliknya, tetapi read-only.
- Finance dapat melihat group read-only.
- Anggota dapat diubah sampai group `completed`.
- Group selesai jika semua proyek non-cancelled di dalamnya `completed`.
- Proyek `cancelled` tidak menghalangi dan tidak dihitung.
- Jika semua anggota cancelled, group menjadi `cancelled`.
- Progress group = jumlah proyek `completed` ÷ jumlah proyek non-cancelled.
- Penyelesaian proyek individual tidak ditahan oleh group.
- Group yang sudah `completed` terkunci.
- Menghapus anggota hingga tersisa kurang dari 2 tidak diperbolehkan; gunakan **Bubarkan Group**.

### 8.11 Workload

- Hanya Manager dan Admin.
- Workload = jumlah **task card aktif** per assignee.
- Status yang dihitung:
  - `To Do`,
  - `In Progress`,
  - `Awaiting Approval`,
  - `Need Revision`.
- Tidak dihitung:
  - `Backlog` (termasuk task dengan requested assignee),
  - `Completed`,
  - task archived,
  - semua StepForm (Survey, RAB, BAST, Invoice).
- Tampilkan per assignee:
  - nama/avatar,
  - jumlah task aktif,
  - breakdown status,
  - breakdown prioritas,
  - daftar proyek,
  - jumlah task overdue.
- Overdue = due date sudah lewat dan status belum `Completed`.
- Urutkan dari beban terbanyak.
- Filter per proyek.
- Tidak ada kapasitas, poin, atau utilisasi di MVP.

### 8.12 Notifications dan activity log

#### 8.12.1 Notification bell

- Tersedia di CRM dan SIMPRO.
- Menampilkan daftar notifikasi milik user yang sedang aktif.
- Unread badge, mark as read, mark all as read.
- Klik notifikasi membuka entity terkait.
- Tidak ada email/push/WhatsApp.

Event minimum:

| Event | Penerima |
|---|---|
| Task di-assign | Assignee |
| Task disubmit ke Awaiting Approval | PM |
| Task Need Revision | Assignee |
| Task Completed | Assignee |
| Komentar baru | Assignee dan PM |
| Pitching diputuskan | PM dan Manager |
| Survey di-assign | Assignee |
| Survey submitted | PM |
| Survey approved / need revision | Assignee |
| RAB di-assign | Finance |
| RAB submitted | PM |
| RAB approved / need revision | Finance |
| BAST/Invoice di-assign | Finance |
| BAST/Invoice submitted | PM |
| Step selesai | PM dan Manager |
| Proyek selesai / cancelled | PM, Manager, Finance |
| Group selesai | Manager dan PM anggota |

#### 8.12.2 Activity log

- Activity log per task dan per proyek.
- Mencatat: pembuatan, assignment, perubahan status, komentar, review, step selesai, form submit, proyek selesai/cancelled.
- Ditampilkan di card dialog dan project detail.
- Read-only.

#### 8.12.3 Riwayat proyek (audit trail prototype)

- `project_events` append-only di lapisan data prototype: `projectId`, `step` nullable, `eventType`, `actorId`, `occurredAt`, `summary`, `metadata`, `groupId`.
- Event ditulis dari store mutation yang sama dengan perubahan data; tidak ada update/delete event.
- `project.step_changed` mencatat transisi step dan menjadi sumber kebenaran status step.
- Backfill idempotent dari `activityLogs`; proyek tanpa riwayat mendapat event `project.backfill`.
- Endpoint-like read: filter step, urutan waktu menurun, cursor pagination, permission proyek, dan masking metadata untuk Assignee.
- Stepper menjadi tab: step selesai/aktif/dilewati dapat dibuka; step pending `aria-disabled`; step terpilih disimpan di `?step=`.
- Panel menampilkan ringkasan step, timeline per tanggal, before/after, dokumen/foto, loading/empty/error, dan Muat lebih banyak.
- Ini bukan audit trail produksi; table/index DB nyata tetap di luar scope prototype.

### 8.13 SIMPRO screens

SIMPRO memakai tampilan, komponen, dan route yang sudah ada di `src`. Jangan membuat layout SIMPRO baru; adaptasi yang diizinkan hanya menghapus ketergantungan auth/API, menyembunyikan menu/tab yang tidak dipakai, dan menyesuaikan board ke 6 status.

#### 8.13.1 SIMPRO Dashboard

Mengikuti gaya screenshot `Dashboard SIMPRO.png`:

- sapaan dan ringkasan harian,
- KPI: total proyek, total klien, anggota tim, total task,
- distribusi task per status,
- progress overview,
- task saya,
- recent projects,
- team workload,
- upcoming deadlines.

Gantt/timeline penuh tidak termasuk MVP.

#### 8.13.2 Projects

- Daftar project card dengan cover color, phase, priority, progress, avatar tim.
- Search dan filter.
- PM/Admin dapat membuat proyek dari sini (form yang sama dengan CRM).
- Assignee hanya melihat proyek yang memiliki task/form untuknya.

#### 8.13.3 Project detail

Gunakan pola sub-route yang sudah ada di root repo:

- **Overview** — `/projects/[id]`
- **Board** — `/projects/[id]/board`
- **Backlog** — `/projects/[id]/backlog`
- **RAB** — `/projects/[id]/rab` (read-only dari CRM)
- **Forms** — `/projects/[id]/forms` (baru; form Survey)

Sub-route Sprint, Gantt, RAP, Discussion, Reports, dan Log disembunyikan.

Header proyek menampilkan:

- cover color,
- phase, priority, client,
- Journey % dan Work %,
- tanggal mulai/target,
- tombol edit untuk PM/Admin.

#### 8.13.4 My Tasks

- Tiga tampilan: **Board**, **List**, **Swimlane**.
- Hanya task yang di-assign ke user aktif.
- Filter proyek dan status.
- Swimlane dikelompokkan per assignee.
- StepForm tidak muncul di My Tasks; Survey muncul di menu **Forms**.

#### 8.13.5 Forms

- Menu khusus untuk StepForm yang di-assign ke user.
- Assignee melihat Survey yang harus diisi.
- PM/Manager/Admin dapat melihat form proyek.
- Finance tidak mengakses SIMPRO.

#### 8.13.6 Card dialog

Mengikuti `Card Dialog SIMPRO.png`:

- judul, kode task, project, priority,
- stepper status read-only,
- aksi status sesuai role,
- deskripsi,
- checklist,
- attachment,
- komentar,
- activity log,
- panel team/assignee dan jadwal.

Drag-and-drop di board tetap mengikuti aturan transisi role; drop yang tidak valid ditolak dengan toast alasan.

---

## 9. Business rules dan state machines

### 9.1 Project status

```
active → completed
active → cancelled
```

- `completed` hanya lewat tombol **Selesaikan Proyek**.
- `cancelled` membutuhkan alasan.
- Tidak ada reopen di MVP.

### 9.2 Step status

```
pending → active → completed
```

- Satu aktif, kecuali Finance (BAST + Invoice keduanya aktif).
- Tidak ada `skipped`.
- Step completed terkunci.

### 9.3 Gate per step

| Step | Syarat |
|---|---|
| Pitching | Semua pitching decided; min 1 won; semua task pitching won completed; tidak ada task Pitching aktif lain. |
| Survey | Form Survey `approved`. |
| RAB | Form RAB `approved`. |
| Running | Tidak ada task aktif di Running. |
| BAST | Form BAST `submitted`. |
| Invoice | Form Invoice `submitted`. |
| Proyek | Semua step completed; BAST + Invoice submitted; PM klik Selesaikan Proyek. |

### 9.4 Task state machine

| Dari | Aksi | Role | Ke |
|---|---|---|---|
| — | Buat task | PM/Admin | `Backlog` |
| `Backlog` | Assign | Manager/Admin | `To Do` |
| `To Do` | Mulai kerja | Assignee | `In Progress` |
| `In Progress` | Ajukan review | Assignee | `Awaiting Approval` |
| `Awaiting Approval` | Approve | PM/Admin | `Completed` |
| `Awaiting Approval` | Minta revisi (komentar wajib) | PM/Admin | `Need Revision` |
| `Need Revision` | Kerjakan lagi | Assignee | `In Progress` |

Aturan tambahan:

- Tidak ada transisi lain.
- Task tanpa assignee tidak bisa keluar dari `Backlog`.
- Task completed terkunci.
- Manager/Admin dapat reassign saat `Backlog`, `To Do`, `In Progress`, atau `Need Revision`; status menjadi `To Do` agar assignee baru mulai dari antrean.
- Reassign tidak diperbolehkan saat `Awaiting Approval` atau `Completed`.
- PM/Admin dapat menghapus task (soft delete) dengan konfirmasi dan alasan; task deleted tidak dihitung gate/progress/workload.
- Assignee tidak dapat menghapus task.

### 9.5 Form state machine

#### Survey dan RAB

```
unassigned → assigned → draft → submitted → approved
                                      ↘ need_revision → draft → submitted
```

| Aksi | Role |
|---|---|
| Assign | Manager/Admin |
| Isi/simpan draft | Assignee (Survey), Finance (RAB) |
| Submit | Assignee (Survey), Finance (RAB) |
| Approve / Need Revision | PM/Admin |

- Komentar wajib saat `need_revision`.
- Form `approved` terkunci.
- Gate membutuhkan `approved`.

#### BAST dan Invoice

```
unassigned → assigned → draft → submitted
```

| Aksi | Role |
|---|---|
| Assign | Manager/Admin |
| Isi/simpan draft | Finance (assigned) |
| Submit | Finance (assigned) |
| Edit setelah submit | Finance, selama proyek belum completed |
| Cek kelengkapan | PM/Admin |

- Tidak ada approve/reject dari PM.
- `submitted` adalah status final.
- Edit setelah submit mengembalikan status ke `draft`.

### 9.6 Progress

#### Journey %

Bobot:

| Deliverable | Bobot |
|---|---|
| Pitching | 1 |
| Survey | 1 |
| RAB | 1 |
| Running | 1 |
| BAST | 0.5 |
| Invoice | 0.5 |
| **Total** | **5** |

```
Journey % = total bobot selesai / 5 × 100
```

- Pitching/Survey/RAB/Running dianggap selesai saat step `completed`.
- BAST dianggap selesai saat form `submitted`.
- Invoice dianggap selesai saat form `submitted`.
- Contoh: BAST submitted, Invoice draft → 4.5 / 5 = 90%.

#### Work %

| Step | Rumus | Label |
|---|---|---|
| Pitching | Task completed / total task non-archived di step | Task |
| Running | Task completed / total task non-archived di step | Task |
| Survey | Draft/assigned = 0%; Submitted = 50%; Approved = 100% | Form |
| RAB | Draft/assigned = 0%; Submitted = 50%; Approved = 100% | Form |
| BAST | Draft/assigned = 0%; Submitted = 100% | Form |
| Invoice | Draft/assigned = 0%; Submitted = 100% | Form |
| Finance | Rata-rata Work % BAST dan Invoice | Form |

- Jika tidak ada task di Pitching/Running, Work % = 100% (tidak ada pekerjaan tertunda).
- Form `unassigned`/`assigned` = 0%.
- `need_revision` = 0% sampai disubmit ulang.

#### Group %

```
Group % = proyek completed ÷ proyek non-cancelled × 100
```

### 9.7 Visibility

| Role | Proyek | Task | Form |
|---|---|---|---|
| Admin | Semua | Semua | Semua |
| Manager | Semua | Semua (assign, read) | Semua (assign, read) |
| PM | Miliknya | Miliknya | Miliknya (review/read) |
| Finance | Semua (read-only) | Tidak perlu akses | Form finance yang di-assign |
| Assignee | Yang punya task/form | Yang di-assign | Survey yang di-assign |

### 9.8 Cancel dan archive

- Proyek cancelled: semua step berhenti, task dan form terkunci, tidak dihitung group.
- Pitching lost: pitching dan task-nya diarsipkan.
- Task dihapus: soft delete, tercatat di activity log, tidak dihitung gate/progress/workload.

---

## 10. Permission matrix

| Aksi | Admin | Manager | PM | Finance | Assignee |
|---|---|---|---|---|---|
| Akses CRM | ✓ | ✓ | ✓ | ✓ | — |
| Akses SIMPRO | ✓ | ✓ | ✓ | — | ✓ |
| Buat proyek | ✓ | — | ✓ | — | — |
| Edit proyek | ✓ | — | miliknya | — | — |
| Cancel proyek | ✓ | ✓ | miliknya | — | — |
| Lihat semua proyek | ✓ | ✓ | — | ✓ | — |
| Lihat proyek sendiri | ✓ | ✓ | ✓ | ✓ | yang di-assign |
| Buat pitching | ✓ | — | miliknya | — | — |
| Putuskan pitching | ✓ | — | miliknya | — | — |
| Assign form | ✓ | ✓ | — | — | — |
| Isi Survey | ✓ | — | — | — | di-assign |
| Review Survey | ✓ | — | miliknya | — | — |
| Isi RAB | ✓ | — | — | di-assign | — |
| Review RAB | ✓ | — | miliknya | — | — |
| Isi BAST/Invoice | ✓ | — | — | di-assign | — |
| Cek BAST/Invoice | ✓ | — | miliknya | — | — |
| Buat task | ✓ | — | miliknya | — | — |
| Assign task | ✓ | ✓ | — | — | — |
| Pindah task (kerja) | ✓ | — | — | — | di-assign |
| Review task | ✓ | — | miliknya | — | — |
| Hapus task | ✓ | — | miliknya | — | — |
| Selesaikan step | ✓ | — | miliknya | — | — |
| Selesaikan proyek | ✓ | — | miliknya | — | — |
| Kelola group | ✓ | ✓ | — | — | — |
| Lihat workload | ✓ | ✓ | — | — | — |
| Lihat notifikasi | ✓ | ✓ | ✓ | ✓ | ✓ |

Catatan:

- "miliknya" berarti proyek yang dibuat PM tersebut.
- Admin dapat melakukan aksi role lain, tetapi tidak dapat skip step.
- Manager tidak melakukan review task.
- PM tidak melakukan assign task.

---

## 11. Data model

### 11.1 Entitas utama

| Entitas | Field kunci | Catatan |
|---|---|---|
| `User` | id, name, email, role, avatar | Satu role per user. |
| `Project` | id, code, name, client, description, priority, status, startDate, targetEndDate, actualEndDate, coverColor, createdById, groupId | `code` unik. |
| `ProjectStep` | id, projectId, key, phase, order, status, startedAt, completedAt, completedById | 6 baris per proyek. |
| `Pitching` | id, projectId, title, description, status, decidedAt, createdById | Status `draft/won/lost`. |
| `PitchingRole` | id, pitchingId, label, requestedUserId, taskId | Task opsional. |
| `Task` | id, code, projectId, stepId, pitchingId?, title, description, priority, status, requestedAssigneeId?, assigneeId?, reporterId, dueDate, archivedAt?, archiveReason? | Hanya Pitching/Running. |
| `TaskChecklistItem` | id, taskId, text, done, order | — |
| `TaskComment` | id, taskId, authorId, body, createdAt | — |
| `Attachment` | id, taskId, fileName, mimeType, size, storageKey | Binary di IndexedDB. |
| `StepForm` | id, projectId, stepKey, type, status, assigneeId, payload, submittedAt, reviewedById, reviewedAt, reviewComment | Satu per step form per proyek. |
| `SurveyPhoto` | id, formId, fileName, mimeType, size, storageKey | — |
| `ProjectGroup` | id, name, description, status, createdById | Flat. |
| `Notification` | id, userId, type, title, body, entityType, entityId, readAt | — |
| `ActivityLog` | id, projectId, taskId?, actorId, action, metadata, createdAt | — |

### 11.2 Relasi

- `User 1—N Project` (creator)
- `Project 1—N ProjectStep`
- `Project 1—N Pitching`
- `Pitching 1—N PitchingRole`
- `PitchingRole 0—1 Task`
- `Project 1—N Task`
- `Project 1—N StepForm` (satu per `stepKey`)
- `Project 0—1 ProjectGroup`
- `User 1—N Notification`
- `Project 1—N ActivityLog`

### 11.3 Payload StepForm

`StepForm.payload` bertipe sesuai `type`:

```ts
type SurveyPayload = {
  surveyDate: string;
  location: string;
  pic: string;
  findings: string;
  notes: string;
  photoIds: string[];
};

type RabPayload = {
  items: {
    id: string;
    description: string;
    qty: number;
    unit: string;
    unitPrice: number;
    total: number;
  }[];
  notes: string;
};

type BastPayload = {
  number: string;
  date: string;
  notes: string;
  documentUrl: string;
};

type InvoicePayload = {
  number: string;
  date: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  notes: string;
  documentUrl: string;
};
```

---

## 12. UX/UI

### 12.1 Referensi visual

Sumber utama tampilan adalah **kode `src`**, bukan screenshot. Screenshot di `Docs/References/` hanya referensi pendukung untuk kondisi visual yang diinginkan.

Komponen dan halaman yang menjadi baseline:

- `src/app/globals.css` — token Tailwind 4 + shadcn base-nova.
- `src/app/layout.tsx` — font Inter, bahasa `id`.
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Topbar.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/components/layout/NotificationBell.tsx`
- `src/app/(main)/dashboard/`
- `src/app/(main)/projects/`
- `src/app/(main)/projects/[id]/`
- `src/components/features/board/`
- `src/components/features/tasks/`
- `src/app/(main)/my-tasks/`

Screenshot pendukung:

- `Dashboard SIMPRO.png`
- `Projects Menu SIMPRO.png`
- `Detail Proyek - Overview SIMPRO.png`
- `Detail Proyek - Kanban Board SIMPRO.png`
- `Detail Proyek - Backlog SIMPRO.png`
- `Detail Proyek - RAB SIMPRO.png`
- `My Task - Board SIMPRO.png`
- `My Task - Swimlane SIMPRO.png`
- `Card Dialog SIMPRO.png`
- `Card Dialog SIMPRO 2.png`

### 12.2 Design token

Gunakan token yang sudah ada di `src/app/globals.css` (Tailwind 4, shadcn `base-nova`, CSS variables). Jangan menambahkan palet kedua.

| Token | Sumber |
|---|---|
| Background | `--background` (oklch, tema biru) |
| Foreground | `--foreground` |
| Card/surface | `--card` |
| Border | `--border` |
| Primary | `--primary` (oklch(0.5 0.22 264)) |
| Primary foreground | `--primary-foreground` |
| Muted | `--muted` / `--muted-foreground` |
| Sidebar | `--sidebar`, `--sidebar-accent` |
| Radius | `--radius` = 0.625rem |
| Font | Inter via `next/font/google` |
| Default project cover | `#2563EB` (fallback frontend) |

Status task memakai konvensi warna frontend:

| Status | Warna |
|---|---|
| Backlog | Slate |
| To Do | Blue |
| In Progress | Violet/Orange |
| Awaiting Approval | Amber |
| Need Revision | Rose |
| Completed | Emerald |

Prioritas:

| Prioritas | Warna |
|---|---|
| Low | Slate |
| Medium | Sky/Blue |
| High | Amber/Orange |
| Critical | Red |

Fase:

| Fase | Warna |
|---|---|
| Planning | Violet/Indigo |
| Running | Blue/Sky |
| Finance | Emerald |

### 12.3 Layout

- Gunakan shell `src/app/(main)/layout.tsx`: sidebar + topbar + main scroll area.
- Sidebar: 240px saat terbuka, 68px saat collapsed; mobile memakai sheet.
- Topbar: 56px (`h-14`), judul halaman, notification bell, avatar/user menu.
- Konten: padding `p-4` / `md:p-6`.
- Card, badge, button, dialog, sheet, select, tabs, table memakai `src/components/ui`.
- Project detail memakai header berwarna sesuai `coverColor` dan komponen banner yang sudah ada.
- Modal/dialog lebar untuk card dan form.
- Empty state informatif, bukan halaman kosong.
- Toast memakai `sonner` untuk sukses/gagal, terutama drop kanban yang ditolak.

### 12.4 Bahasa dan format

- Bahasa UI: Indonesia.
- Mata uang: IDR (`Rp`).
- Tanggal: `dd MMM yyyy` (contoh: `30 Okt 2026`).
- Timezone: `Asia/Jakarta`.
- Nama role ditampilkan dalam bahasa Indonesia.

### 12.5 Responsif

- Desktop-first; optimal 1280px ke atas.
- Tetap usable di 1024px.
- Mobile tidak dioptimalkan di MVP; tabel boleh scroll horizontal.

### 12.6 Aksesibilitas

- Fokus keyboard terlihat.
- Modal dapat ditutup dengan Escape.
- Label form eksplisit.
- Kontras teks minimal WCAG AA untuk teks utama.
- Tombol destruktif memakai konfirmasi.

### 12.7 Frontend baseline dan adaptasi prototype

**Yang dipakai ulang dari root repo:**

- Shell: `Sidebar`, `Topbar`, `MobileNav`, `NotificationBell`.
- Komponen UI shadcn base-nova di `src/components/ui`.
- Dashboard, projects, project detail, board, backlog, RAB, my tasks, card/task sheets.
- Token CSS, font Inter, ikon Lucide, pola status/priority pill.
- Library yang sudah ada: Zustand, TanStack Query, dnd-kit, xlsx, date-fns, sonner.

**Yang harus diadaptasi:**

- Auth/session server (`getServerSession`, `authClient`, redirect `/login`) diganti role switcher lokal.
- Panggilan API (`@/lib/api/client`, `useQuery`, `useMutation`) diganti adapter ke store prototype.
- `BOARD_MAIN_PIPELINE` dan `BOARD_PARKING_LOT` tidak boleh dipakai apa adanya. Board prototype hanya 6 status: `backlog`, `todo`, `in_progress`, `awaiting_approval`, `need_revision`, `completed`; tanpa `on_check`, `ready_to_deploy`, `on_hold`, `cancelled`.
- Menu frontend yang tidak dipakai (Meetings, Personal Notes, Daftar Surat, Budget, Clients, Members) disembunyikan.
- Tab project detail yang tidak dipakai (Sprint, Gantt, RAP, Discussion, Reports, Log) disembunyikan.
- Route SIMPRO memakai route yang sudah ada; CRM ditambahkan di `/crm`.

**Yang tidak boleh dilakukan:**

- Membuat shell/sidebar/topbar kedua yang berbeda dari root repo.
- Menyalin 8 status board atau parking lot ke prototype.
- Menghidupkan kembali backend/auth hanya untuk prototype.

---

## 13. Non-functional requirements (prototype)

| Aspek | Requirement |
|---|---|
| Platform | Browser Chrome/Edge terbaru. |
| Frontend | root repo — Next.js 16, React 18, Tailwind 4, shadcn base-nova. |
| Penyimpanan data | `localStorage` untuk state JSON. |
| Penyimpanan file | IndexedDB untuk foto dan attachment. |
| Backend | Tidak ada. |
| Auth | Tidak ada; role switcher. |
| Multi-user | Tidak ada; satu browser. |
| Batas file | 5 MB per file; 10 foto Survey; 5 attachment per task. |
| Performa | Interaksi < 100ms pada seed data < 100 task. |
| Reset | Tombol reset mengembalikan seed dan menghapus IndexedDB. |
| Error handling | Validasi form + toast. |
| Data | Hanya data demo, bukan data produksi. |
| Audit | `project_events` + activity log in-app; bukan audit trail produksi/DB formal. |

---

## 14. Asumsi dan dependensi

1. SIMPRO di prototype ini adalah simulasi modul, bukan integrasi ke `SIMPROv2`.
2. Semua user adalah data seed; tidak ada registrasi/login.
3. Satu role per user.
4. Satu assignee per task.
5. Satu Survey, satu RAB, satu BAST, dan satu Invoice per proyek.
6. Satu group per proyek.
7. Semua 6 step wajib.
8. BAST/Invoice tidak memiliki approval PM; `submitted` adalah final.
9. Workload hanya menghitung task card, bukan form.
10. File disimpan di browser; tidak ada cloud storage.
11. Excel import hanya untuk BAST/Invoice, bukan RAB.
12. Tidak ada multi-currency; semua IDR.
13. Tidak ada client master; klien berupa teks.
14. Kode proyek dan kode task dibuat otomatis.
15. Baseline UI adalah root repo (Next.js 16, React 18, Tailwind 4, shadcn base-nova). Prototype memakai komponen dan route SIMPRO yang sudah ada, lalu mengganti auth/API dengan store lokal.

---

## 15. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Semua step wajib | Proyek yang tidak butuh Pitching/Survey tidak bisa lanjut | PM dapat membatalkan proyek; skip step masuk P1. |
| StepForm bukan Task | Form tidak muncul di workload/task progress | Tampilkan Form % dan menu Forms; dokumentasikan. |
| Workload hanya count | Beban task sulit dan mudah dianggap sama | P1: poin/estimasi. |
| Penyimpanan browser | Data hilang jika storage dibersihkan; kuota terbatas | Batas file, IndexedDB, tombol reset, label prototype. |
| Tidak ada reject BAST/Invoice | Data salah baru ketahuan sebelum proyek ditutup | Finance dapat edit sampai proyek completed; PM menahan penutupan. |
| Multiple winners | Ambigu proyek mana yang lanjut | Pemenang hanya menandai pitching yang diterima; tetap satu proyek dan satu Survey. |
| Manager bottleneck assignment | Task menumpuk di Backlog | Requested assignee untuk pitching; P1: PM boleh assign. |
| Excel import tidak cocok | Data gagal import | Template, preview, validasi, pesan error per baris. |
| SIMPRO simulasi | Perilaku bisa berbeda dari sistem nyata | PRD mencatat batas integrasi; validasi sebelum produksi. |
| Visual reference vs scope | Terlalu banyak widget | Prioritaskan layar dan flow inti; Gantt/timeline ditunda. |

---

## 16. Out of scope

- Integrasi API/DB nyata dengan SIMPROv2.
- Auth, SSO, multi-tenant, user management produksi.
- Portal klien.
- Email, WhatsApp, push notification.
- Generate PDF BAST/Invoice, e-signature.
- Tracking pembayaran `paid/unpaid`.
- Custom journey builder, template per klien, skip step.
- Multiple survey visits.
- Excel import RAB.
- Bulk import BAST/Invoice.
- Nested group atau multi-group per proyek.
- Task parking lot (`On Hold`, `Cancelled`).
- Multi-assignee per task.
- Gantt, Sprint, RAP, Discussion, Reports, audit trail formal.
- Mobile app.
- Multi-currency dan otomatisasi pajak.
- Reopen proyek/form/task yang sudah final.

---

## 17. Acceptance criteria (produk)

1. PM dapat membuat proyek dan melihat 6 step tetap.
2. Pitching dapat berisi jumlah bebas, multiple winners, dan riwayat pitching kalah.
3. Role pitching menghasilkan task `Backlog`; Manager meng-assign ke `To Do`; task pemenang selesai sebelum step lanjut.
4. Survey dapat di-assign ke Assignee, diisi di SIMPRO dengan foto, direview PM, dan tercermin di CRM.
5. RAB dapat di-assign ke Finance, diisi di CRM, direview PM, dan totalnya terlihat di SIMPRO read-only.
6. Running menampilkan board 6 kolom untuk step aktif; transisi task mengikuti role; CRM read-only.
7. BAST dan Invoice dapat diisi paralel oleh Finance; PM hanya bisa menutup proyek setelah keduanya `submitted`.
8. Group selesai hanya setelah semua proyek non-cancelled selesai; proyek individual tetap bisa selesai sendiri.
9. Workload menampilkan jumlah task card aktif per assignee, tanpa form dan tanpa task completed.
10. Notification bell dan activity log berfungsi.
11. Semua role hanya melihat data yang diizinkan.
12. Reset data mengembalikan seed awal.
13. Tampilan SIMPRO konsisten dengan `src` dan screenshot di `Docs/References/`; tidak ada shell/design system kedua.
14. `npm run build` dan `npm run lint` lulus di root repo setelah implementasi.

---

## 18. Appendix A — Decision log

| # | Topik | Keputusan |
|---|---|---|
| Q1 | Sumber kebenaran | Prompt terbaru; `CRM-MVP.md`/`BRIEF.md` historis. |
| Q2 | Topologi | Monolith baru di `CRMv2`; visual mengikuti `Docs/References/`. |
| Q3 | Journey | 6 step tetap, tidak bisa ditambah/diubah. |
| Q4 | Pitching | Jumlah bebas; multiple winners; yang kalah menjadi history. |
| Q5 | Survey | Form di SIMPRO. |
| Q6 | RAB | Form di CRM, diisi Finance. |
| Q7 | Finance | BAST dan Invoice paralel; Finance isi; PM cek dan tutup. |
| Q8 | Assign | Hanya Manager/Admin. |
| Q9 | Gate Running | Tidak ada task aktif (Backlog/To Do/In Progress/Awaiting Approval/Need Revision). |
| Q10 | Stepper Finance | 6 node; BAST dan Invoice aktif paralel; masing-masing 50% dari Finance. |
| Q11 | Aturan pitching | Jumlah bebas; min 1 winner; multiple winners; semua decided; losers history; satu Survey. |
| Q12 | Survey | Satu per proyek; field lengkap; minimal 1 foto; review. |
| Q13 | RAB | Manual line items; satu per proyek; review. |
| Q14 | BAST/Invoice | Per proyek; manual atau import satu baris; draft/submitted; edit sampai close. |
| Q15 | Status task | Tepat 6; tanpa On Check/Ready to Deploy/Parking Lot. |
| Q16 | Board | Hanya task step aktif. |
| Q17 | Task flow | PM/Admin buat; Manager/Admin assign; transisi sesuai role; PM review. |
| Q18 | Card | Field lengkap + checklist + attachment. |
| Q19 | Pitching task | Requested assignee; task Backlog; Manager konfirmasi; task pemenang completed; losers archived. |
| Q20 | Form model | StepForm, bukan Task. |
| Q21 | Group | Flat; satu group per proyek; min 2; Manager/Admin; selesai saat semua non-cancelled selesai. |
| Q22 | Workload | Jumlah task aktif; tanpa poin/kapasitas. |
| Q23 | Role | Satu role; matrix Admin/Manager/PM/Finance/Assignee. |
| Q24 | Progress | Dua angka: Journey % dan Work %. |
| Q25 | Notifikasi | In-app bell + activity log. |
| Q26 | Layar & storage | Demo penuh; localStorage + IndexedDB; tanpa backend. |
| Q27 | Step | Semua wajib; tidak ada skip; proyek bisa cancelled. |
| Q28 | Model form | StepForm terpisah; tidak ada task record. |
| Q29 | Journey % | Denominator 5; BAST/Invoice masing-masing 0,5. |
| Q30 | Form % | Draft 0; Submitted 50; Approved 100. |
| Q31 | Workload | Hanya card task aktif; exclude Backlog/Completed/StepForm. |
| Q32 | Cancel & finance | PM cancel miliknya; Manager/Admin cancel semua; PM tidak reject BAST/Invoice. |
| Q33 | Baseline tampilan | SIMPRO memakai `src` yang sudah ada; CRM ditambahkan di `/crm`; auth/API diganti store lokal. |

### Keputusan turunan

| Topik | Keputusan | Alasan |
|---|---|---|
| Form % BAST/Invoice | Draft 0; Submitted 100 | Tidak ada status approved; submitted adalah final. |
| Task delete | PM/Admin soft delete dengan alasan | Tidak ada parking lot; mencegah task salah memblokir gate. |
| Reassign task | Manager/Admin; status menjadi To Do | Assignee baru mulai dari antrean. |
| Step completion | Manual oleh PM setelah gate | Kontrol produk; tidak auto-advance. |
| Form BAST/Invoice edit | Edit setelah submit kembali ke draft | Mencegah data berubah diam-diam. |
| Project cancel | Alasan wajib; tidak ada reopen | Menjaga integritas state. |
| Group all cancelled | Group menjadi cancelled | Tidak ada anak aktif. |

---

## 19. Appendix B — Delta terhadap dokumen lama

| Topik | `CRM-MVP.md` / `BRIEF.md` | PRD ini |
|---|---|---|
| Journey | 6 step, Admin bisa skip | 6 step, tidak ada skip; cancel proyek. |
| Pitching | Jumlah bebas, multiple winners | Sama, ditambah losers history dan requested assignee. |
| Pitching task | Task langsung `To Do` | Task `Backlog`; Manager konfirmasi. |
| Survey | Form di CRM / bukan task | Form di SIMPRO; StepForm. |
| RAB | Form di CRM, import SIMPRO | Form manual di CRM; tanpa import. |
| BAST/Invoice | Upload file, PM approve | Excel/manual, paralel, PM cek, tanpa reject. |
| BAST assignment | Bisa di-assign ke Assignee | Tidak; Finance memiliki data. |
| Workload | Poin, kapasitas 10 | Jumlah task aktif; tanpa kapasitas. |
| Assign | Manager dan PM | Hanya Manager/Admin. |
| Task status | 8 kolom + parking lot | 6 kolom; tanpa parking lot. |
| Topologi | Modul di SIMPROv2 | Monolith prototype baru, berbasis UI root repo yang sudah ada. |
| Notifikasi | In-app | In-app bell + activity log. |
| Group | Manager/Admin | Sama; flat. |

---

## 20. Appendix C — Kandidat P1/P2

- Survey multi-kunjungan.
- Import Excel RAB.
- Bulk import BAST/Invoice.
- PM boleh assign task.
- Poin/kapasitas workload.
- Skip step dengan alasan.
- BAST/Invoice reject/revision loop.
- Nested group.
- Export CSV backlog.
- Gantt/timeline dashboard.
- Integrasi nyata SIMPROv2 (API/DB), auth, audit trail.
- PDF BAST/Invoice, e-signature, payment tracking.
- Email/WhatsApp notification.
