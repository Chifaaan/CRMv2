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
- Assignee/Media yang terikat proyek hanya melihat tahap board yang `active` atau `completed`; tahap `pending` disembunyikan dan tidak bisa dibuka lewat URL. Tahap selesai tetap bisa dibuka read-only.
- Kartu punya Manager opsional di samping Assignee. Manager yang terpasang bisa memulai/mengajukan kartu dengan aturan link, bisa assign/reassign, dan mendapat notifikasi; Manager tetap tidak bisa review.
- PM pemilik proyek bisa memindahkan kartu yang punya Assignee atau Manager ke status mana pun. PM tetap tidak bisa meng-assign.

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
- `canEditPhaseStructure(project, phase)` adalah otoritas untuk mengubah urutan/nama tahap sebelum fase dimulai. Fase hanya bisa disusun sebelum `startedAt`; proyek legacy dengan `structureLocked` tetap beku. Closing selalu read-only.
- Fase yang sudah dimulai boleh menerima tahap baru atau menghapus tahap selama tahap itu belum punya pekerjaan: tidak ada entri form draft/submitted/review, tidak ada form keuangan yang berjalan, dan tidak ada task yang keluar dari Backlog. Tahap baru masuk `pending`; reorder/edit tetap ditolak setelah fase dimulai.
- PM boleh menyiapkan tahap dan task default pada fase yang sudah dibuka tetapi belum dimulai. Task tetap `Backlog` tanpa assignee dan tidak bisa di-assign sampai tahapnya `active`.
- Template bersifat rekomendasi. Proyek baru boleh dibuat dengan Prospek kosong; template hanya mengisi tahap Prospek. Semua tahap Prospek baru `pending`, dan PM/Admin memulai journey secara eksplisit lewat Journey Management. Setelah dimulai, Prospek terkunci.
- Detail Proyek punya tab `Overview` dan `Journey Management`. Overview khusus proyek yang sedang dibuka: penyelesaian tahap, distribusi task enam status, progress completed/open/overdue, dan riwayat aktivitas. Journey Management menampilkan keempat fase (termasuk `0 Tahap`), pemilihan fase/step, dan aksi `Selesaikan fase`.
- Penambahan tahap memakai dialog `Nama Tahap`, `Format` (Form, Form Keuangan, Gerbang, SIMPRO), dan preview baris tabel (urutan, nama, format, status).
- Setelah gerbang menang, PM menyusun Planning dan Running. Journey non-legacy wajib punya tepat satu Gerbang persetujuan klien sebagai tahap terakhir Prospek; Umum `legacy` dikecualikan.
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

## Link Pekerjaan

- Kartu menampilkan input `Link Pekerjaan` dan tombol `Simpan Link`.
- `validateWorkingLink(input)` hanya menolak nilai kosong/spasi. Tidak ada validasi URL; teks apa pun diterima dan disimpan apa adanya.
- `taskTransition(..., workingLink?)` menolak `To Do → In Progress` dan `Need Revision → In Progress` tanpa link non-kosong. Link yang sudah tersimpan dipakai ulang tanpa perlu input ulang.
- Link disimpan pada task (`workingLink`) dan riwayatnya (`workingLinkHistory`), serta tercatat sebagai event `task.working_link_set`. Teks non-URL ditampilkan sebagai teks biasa, bukan anchor.

## Media Order

- `mediaOrderLine(item)` menghitung revenue (qty × harga klien), cost (qty × biaya vendor), margin, dan margin %.
- `mediaOrderTotals(order)` menjumlahkan seluruh item dan menghitung margin % pesanan; margin % bernilai 0 bila revenue 0.
- Setiap item RAB/MO memakai `businessUnitId` dari katalog `BUSINESS_UNITS` (Makerspace, Makerspace Video, Spektrum).
