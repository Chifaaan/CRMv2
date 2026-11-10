# Tipe Tahap Template CRM × SIMPRO

Dokumen ini adalah addendum untuk `Docs/PRD-Alur-CRM-Baru.md`. Fokusnya empat tipe tahap: **Form Keuangan, Form, Gerbang, SIMPRO**, pada siklus eksekusi **Planning → Running → Finance**.

## Fase proyek

- Proyek baru memakai fase tetap Planning → Running → Finance. Prospek bukan fase proyek baru; proyek dibuat langsung (template atau manual) dan tidak dikonversi dari peluang.
- Proyek legacy yang sudah memiliki step fase Prospek tetap menyimpan step tersebut sebagai riwayat dan tidak menghalangi alur tiga fase untuk proyek baru.
- Proyek belum berjalan sampai PM/Admin memilih fase awal (Planning atau Running) dan menetapkan Manager PIC.
- Finance tidak dapat dijadikan fase awal. Saat Running selesai, step BAST dan Invoice dibuat otomatis bila belum ada.
- Setiap step memiliki Manager PIC; aktivasi step membutuhkan Manager PIC.
- Hanya PM pemilik atau Admin yang mengelola step. Step pending dapat ditambah, diubah, dihapus, atau diurutkan selama proyek aktif; step yang sudah berjalan hanya boleh mengubah nama, Manager PIC, dan deskripsi.

## Tipe tahap

| Tipe | Pelaksana | Tempat | Selesai bila |
| --- | --- | --- | --- |
| Form Keuangan | Finance (BAST juga Media) | CRM | RAB/BAST/Invoice/Pembayaran memenuhi aturan form keuangan |
| Form | Assignee/Manager/Media yang di-assign Manager/Admin | Menu Forms | Semua entri non-batal disetujui, minimal satu entri atau konfirmasi tidak ada pekerjaan |
| Gerbang | PM/Admin | CRM | Keputusan disetujui atau ditolak; hanya untuk proyek legacy |
| SIMPRO | Assignee/Manager/Media lewat Kanban | Board SIMPRO | Semua kartu non-batal Completed, minimal satu kartu atau konfirmasi tidak ada pekerjaan (legacy) |

Checklist dihapus. Data checklist lama dimigrasikan menjadi template Form dengan isian daftar centang.

## Mesin Form

- Satu tahap Form punya satu template form dan banyak entri.
- Entri dibuat PM (Belum ditugaskan), di-assign Manager/Admin, diisi Assignee/Manager/Media, lalu direview PM.
- Status entri: Belum ditugaskan, Ditugaskan, Draft, Submitted, Disetujui, Perlu revisi, Dibatalkan.
- Isian default: tanggal pelaksanaan, lokasi, keterangan, foto. Setiap isian bisa disembunyikan/diwajibkan per template.
- Isian tambahan: teks, angka, tanggal, pilihan, daftar centang, unggah file. Maksimal 20 isian.
- Setiap submit membuat versi immutable. Entri batal tidak dihitung pada penyelesaian tahap.
- Survey template Umum tetap memakai layar Survey lama (dibungkus sebagai tipe Form).

## SIMPRO

- Task punya `stageId` dan terhubung ke tahap SIMPRO.
- Board hanya menampilkan tahap `active` dan `completed`; tahap `pending` tidak dapat dipilih atau dibuka lewat URL. Board default membuka tahap aktif, dan tahap selesai read-only.
- Status kartu tetap enam: Backlog, To Do, In Progress, Awaiting Approval, Need Revision, Completed.
- Assignee/Manager/Media yang terikat proyek hanya melihat kartu miliknya.
- Kartu hanya dibuat PM pada step SIMPRO aktif; kartu selalu mulai di Backlog dan di-assign Manager/Admin.
- PM pemilik proyek hanya boleh meng-assign pekerjaan operasional kepada Manager proyeknya (bila ada); Manager/Admin boleh assign ke Assignee, Manager, atau Media.
- Memindahkan kartu ke In Progress wajib memiliki Link Pekerjaan non-kosong. Link bersifat teks bebas (tanpa validasi URL), disimpan dengan tombol `Simpan`, dan perubahan link tercatat di riwayat proyek.
- Manager yang menjadi assignee boleh memulai/menyimpan/mengajukan kartu, tetapi tidak berhak menyetujui atau menolak review.

## Badge, My Tasks, Workload

- Badge Forms menghitung form yang perlu diisi user saat ini (Ditugaskan, Draft, Perlu revisi) dari entri Form dan form keuangan. Antrian review PM tidak masuk badge.
- My Tasks hanya menampilkan task Kanban, tidak menampilkan form.
- Workload memisahkan jumlah kartu aktif dan jumlah form aktif, dan menampilkan Assignee, Manager, serta Media yang punya pekerjaan aktif.
