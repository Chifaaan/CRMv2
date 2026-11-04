# Tipe Tahap Template CRM × SIMPRO

Dokumen ini adalah addendum untuk `Docs/PRD-Alur-CRM-Baru.md`. Fokusnya empat tipe tahap: **Form Keuangan, Form, Gerbang, SIMPRO**.

## Tipe tahap

| Tipe | Pelaksana | Tempat | Selesai bila |
| --- | --- | --- | --- |
| Form Keuangan | Finance | CRM | RAB/BAST/Invoice/Pembayaran memenuhi aturan form keuangan |
| Form | Assignee yang di-assign Manager/Admin | Menu Forms | Semua entri non-batal disetujui, minimal satu entri atau konfirmasi tidak ada pekerjaan |
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

RAB, BAST, Invoice, dan Pembayaran dibuka sebagai halaman penuh di `/crm/projects/[id]/forms/[type]`. Detail Proyek menampilkan ringkasan (status, assignee, terakhir diubah, total RAB, komentar review) dengan tombol Buka/Lihat form, Review, dan History. Review/History tetap inline. Finance yang di-assign dan Admin dapat mengisi; PM/Manager membuka read-only. Isian tiap jenis tetap spesifik (RAB item, BAST PIC/dokumen, Invoice nilai/PPN/import Excel, Pembayaran bukti/status).

RAB, BAST, dan Invoice juga muncul di menu Forms SIMPRO sebagai jenis form masing-masing. Hanya Finance yang di-assign, PM pemilik proyek, dan Admin yang melihatnya; Manager dan Assignee tidak melihat form keuangan di menu tersebut.

## Asumsi

- Tahap Form/SIMPRO boleh ditutup tanpa entri/task hanya lewat konfirmasi eksplisit yang tercatat di audit trail.
- Badge Forms hanya untuk antrian isi, bukan antrian review.
- Kelengkapan Pembayaran mengikuti validasi tanggal, nominal, metode, dan bukti wajib saat status lunas.
