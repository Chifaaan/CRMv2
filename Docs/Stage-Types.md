# Tipe Tahap Template CRM × SIMPRO

Dokumen ini adalah addendum untuk `Docs/PRD-Alur-CRM-Baru.md`. Fokusnya empat tipe tahap: **Form Keuangan, Form, Gerbang, SIMPRO**.

## Tipe tahap

| Tipe | Pelaksana | Tempat | Selesai bila |
| --- | --- | --- | --- |
| Form Keuangan | Finance | CRM | RAB/BAST/Invoice/Pembayaran memenuhi aturan form keuangan |
| Form | Assignee/Media yang di-assign Manager/Admin | Menu Forms | Semua entri non-batal disetujui, minimal satu entri atau konfirmasi tidak ada pekerjaan |
| Gerbang | PM/Admin | CRM | Keputusan Menang atau Kalah |
| SIMPRO | Assignee lewat Kanban | Board SIMPRO | Tidak ada task tersisa, minimal satu task atau konfirmasi tidak ada pekerjaan |

Checklist dihapus. Data checklist lama dimigrasikan menjadi template Form dengan isian daftar centang.

## Mesin Form

- Satu tahap Form punya satu template form dan banyak entri.
- Entri dibuat PM (Belum ditugaskan), di-assign Manager/Admin, diisi Assignee, lalu direview PM.
- Status entri: Belum ditugaskan, Ditugaskan, Draft, Submitted, Disetujui, Perlu revisi, Dibatalkan.
- Isian default: tanggal pelaksanaan, lokasi, keterangan, foto. Setiap isian bisa disembunyikan/diwajibkan per template.
- Isian tambahan: teks, angka, tanggal, pilihan, daftar centang, unggah file. Maksimal 20 isian.
- Setiap submit membuat versi immutable. Entri batal tidak dihitung pada penyelesaian tahap.
- Survey template Umum tetap memakai layar Survey lama (dibungkus sebagai tipe Form).

## SIMPRO

- Task punya `stageId` dan terhubung ke tahap SIMPRO.
- Board punya filter tahap (default tahap aktif), label tahap pada kartu, dan tahap selesai read-only.
- Task default template SIMPRO adalah usulan; PM memilih lewat "Buat dari template".

## Badge, My Tasks, Workload

- Badge Forms menghitung entri yang perlu diisi user saat ini (Ditugaskan, Draft, Perlu revisi). Antrian review PM tidak masuk badge.
- My Tasks hanya menampilkan task Kanban, tidak menampilkan form.
- Workload memisahkan jumlah kartu aktif dan jumlah form aktif.

## Pembayaran

Pembayaran adalah form keuangan baru (Closing) dengan tanggal bayar, nominal, metode, bukti file, status (belum/sebagian/lunas), dan tautan ke Invoice. Hanya ada pada template baru sehingga rumus progress Umum tidak berubah.

## Halaman Form Keuangan

RAB, BAST, Invoice, dan Pembayaran dibuka sebagai halaman penuh di `/crm/projects/[id]/forms/[type]` untuk CRM dan `/forms/finance/[projectId]/[type]` untuk SIMPRO. Detail Proyek menampilkan ringkasan (status, assignee, terakhir diubah, total RAB, komentar review) dengan tombol Buka/Lihat form, Review, dan History. Review/History tetap inline. Finance yang di-assign dapat mengisi RAB/BAST/Invoice/Pembayaran; Media yang di-assign dapat mengisi BAST; Admin dapat mengisi; PM/Manager membuka read-only dan Manager/Admin tetap bisa assign dari form terbuka. Isian tiap jenis tetap spesifik (RAB item, BAST PIC/dokumen, Invoice nilai/PPN/import Excel, Pembayaran bukti/status).

Semua form keuangan juga muncul di menu Forms SIMPRO sesuai assignee: Finance melihat RAB/BAST/Invoice/Pembayaran yang di-assign, Media melihat BAST yang di-assign, dan PM pemilik/Admin tetap melihat untuk oversight. Manager dan Assignee tidak melihat form keuangan di menu tersebut. Assignment dari CRM atau form terbuka mengirim notifikasi in-app ke assignee.

## Asumsi

- Tahap Form/SIMPRO boleh ditutup tanpa entri/task hanya lewat konfirmasi eksplisit yang tercatat di audit trail.
- Badge Forms hanya untuk antrian isi, bukan antrian review.
- Kelengkapan Pembayaran mengikuti validasi tanggal, nominal, metode, dan bukti wajib saat status lunas.

## Struktur per fase

- `Project.phaseStates` menyimpan `authoredAt`, `startedAt`, `lockedAt`, `closingMaterialized`, dan `sourceTemplateVersion` per fase.
- `canEditPhaseStructure(project, phase)` adalah otoritas untuk menambah, menghapus, atau mengurutkan tahap. Fase hanya bisa disusun sebelum `startedAt`; proyek legacy dengan `structureLocked` tetap beku. Closing selalu read-only.
- Template bersifat rekomendasi. Proyek baru boleh dibuat dengan Prospek kosong; template hanya mengisi tahap Prospek. Semua tahap Prospek baru `pending`, dan PM/Admin memulai journey secara eksplisit lewat Journey Management. Setelah dimulai, Prospek terkunci.
- Journey Management di Detail Proyek memilih fase dan mengelola tahap yang belum dimulai. Setelah gerbang menang, PM menyusun Planning dan Running. Journey non-legacy wajib punya tepat satu Gerbang persetujuan klien sebagai tahap terakhir Prospek; Umum `legacy` dikecualikan.
- Saat Running dimulai, tahap Closing ditambahkan otomatis dan selalu berisi tepat satu BAST dan satu Invoice paralel (0,5/0,5). Template boleh menambah tahap Closing lain; tanpa template, default BAST/Invoice/Pembayaran dipakai.

## Role dan akses

| Role | CRM | SIMPRO | Business Dashboard | Landing |
| --- | --- | --- | --- | --- |
| Admin | Ya | Ya | Ya | `/crm` |
| Manager | Ya | Ya | Tidak | `/crm` |
| PM | Ya (proyek sendiri) | Ya | Tidak | `/crm` |
| Finance | Ya | Tidak | Tidak | `/crm` |
| Assignee | Tidak | Ya (yang di-assign) | Tidak | `/my-tasks` |
| Media | Tidak | Ya (yang di-assign) | Tidak | `/my-tasks` |
| BOD | Tidak | Tidak | Ya (read-only) | `/business` |

Fungsi otoritas: `roleCanAccessCrm`, `roleCanAccessSimpro`, `roleCanAccessBusiness`, dan `landingForRole`.

## Link kerja wajib

- `validateWorkingLink(input)` menerima hanya URL absolut `http`/`https`.
- `taskTransition(..., workingLink?)` menolak `To Do → In Progress` dan `Need Revision → In Progress` tanpa link valid.
- Link disimpan pada task (`workingLink`) dan riwayatnya (`workingLinkHistory`), serta tercatat sebagai event `task.working_link_set`.

## Media Order

- `mediaOrderLine(item)` menghitung revenue (qty × harga klien), cost (qty × biaya vendor), margin, dan margin %.
- `mediaOrderTotals(order)` menjumlahkan seluruh item dan menghitung margin % pesanan; margin % bernilai 0 bila revenue 0.
- Setiap item RAB/MO memakai `businessUnitId` dari katalog `BUSINESS_UNITS` (Makerspace, Makerspace Video, Spektrum).
