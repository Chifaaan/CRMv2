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

## Manager proyek dan assignment operasional

- Proyek memiliki satu Manager penanggung jawab opsional (`managerId`) yang dipilih PM pemilik atau Admin saat membuat/mengedit proyek.
- Penunjukan Manager tidak mengubah visibilitas proyek; Manager tetap melihat semua proyek.
- Manager dan Assignee dapat menjadi assignee task SIMPRO dan entri Form; Media setara Assignee untuk pekerjaan operasional, termasuk task proyek dan pekerjaan Prospek.
- PM pemilik hanya boleh assign ke Manager proyeknya. Manager/Admin boleh assign ke Assignee, Media, atau Manager.
- Manager assignee dapat mengerjakan task/Form miliknya, tetapi tidak mendapat hak review.
- Task/Form Manager muncul di My Tasks/Forms dan workload Manager.
- Manager/Admin dapat meng-assign kartu atau entri Form pada step pending. Item tersebut berlabel terjadwal, belum dapat dikerjakan, dan tidak dihitung pada badge/Workload sampai step aktif.

## Prospek dan Termine

- Prospek adalah umbrella project di CRM dengan alur tetap: Detail → Pitching → RAB → Quotation → Decision → Kontrak.
- Setiap Pitching punya RAB, Quotation, tugas Form, dan kontrak sendiri. Pitching kalah menjadi riwayat read-only.
- Pitching menang yang kontraknya lengkap dikonversi menjadi anak proyek. Anak proyek memakai template Pitching, menyimpan `prospekId`/`pitchingId`, dan memulai pekerjaan setelah fase Prospek selesai.
- Termine kontrak tampil sebagai acuan pembayaran pada fase Closing anak proyek dan tidak membuat form Invoice/Pembayaran otomatis.
- Proyek lama dengan step Pitching dan `ProjectGroup` lama tidak dimigrasikan. Lihat `Docs/Prospek.md`.

## Siklus proyek baru

- Proyek baru yang dibuat langsung memakai tiga fase: Planning → Running → Finance. Proyek hasil konversi Prospek memakai template Pitching. Fase Prospek hanya untuk proyek legacy.
- Detail proyek siklus baru selalu menampilkan tab Planning, Running, dan Finance; fase tanpa step menampilkan `0 Step`.
- Proyek baru dibuat belum aktif (NEW Project). PM/Admin memulai dari Planning atau langsung Running; Finance tidak bisa menjadi fase awal.
- Step Planning/Running memakai Kanban SIMPRO di tab Board CRM; step Finance memakai Form Keuangan (BAST, Invoice, Pembayaran).
- Saat Running selesai, step BAST dan Invoice dibuat otomatis pada fase Finance. Step Finance lain tetap dapat ditambahkan.
- PM/Admin mengelola step yang belum dimulai; step aktif/selesai bersifat read-only.
- Link Pekerjaan HTTP/HTTPS wajib sebelum card masuk In Progress.
- Finance selesai hanya setelah minimal satu step Finance selesai; proyek menjadi completed.

## Workspace proyek

- Detail proyek CRM memiliki lima tab: Overview, Journey Management, Board, Backlog, dan Forms.
- Overview berisi Asal Prospek, Penyelesaian Tahap, Distribusi task, Progress overview, lalu Riwayat Aktivitas. Distribusi dan progress hanya menghitung task proyek tersebut.
- Journey Management sepenuhnya manual untuk proyek langsung; proyek hasil Prospek memakai template Pitching. PM/Admin membuat step bebas pada fase aktif atau fase berikutnya.
- Journey Management hanya mengatur struktur step/fase dan menampilkan ringkasan read-only setiap step beserta tautan ke Board/Forms. Panel isian, assign, dan review tidak lagi berada di Journey.
- Journey Management tidak lagi memilih step untuk menampilkan card; card SIMPRO dikerjakan di tab Board, form dikerjakan di tab Forms.
- Tab Forms menampung seluruh Form Keuangan dan entri Form stage, termasuk assign dan review, dengan banner jumlah pekerjaan yang belum di-assign/perlu diisi/menunggu review/perlu revisi.
- Keputusan Gerbang dicatat dari tab Overview; Journey hanya menampilkan ringkasan dan tautan ke Overview.
- Board, Backlog, dan Forms memindahkan fungsi Detail Proyek SIMPRO ke dalam CRM. Route SIMPRO lama diarahkan ke tab CRM yang setara.
- Memilih Planning tidak membuat step Running; Running kosong sampai ditambahkan.
- Link Pekerjaan wajib non-empty, tanpa validasi URL, dan memiliki tombol Simpan.

## Projects dan Prospek

- Halaman CRM Projects menampilkan daftar proyek datar tanpa section Groups dan tanpa accordion Group.
- Proyek dengan `prospekId` diberi label `Prospek · <nama>` pada card; proyek dengan Group diberi label Umbrella.
- CRM Projects dan Prospek memiliki pagination dengan pilihan ukuran halaman.
- Prospek memiliki toggle Card/Table; Card tetap menjadi tampilan awal.

## Pitching

- Tahap Pitching berurutan: RAB → Quotation → Form Pitching → Decision → Kontrak.
- RAB dan Quotation di-assign oleh Manager/Admin kepada Finance atau Media; Finance/Media mengisi dan submit, PM mereview.
- Form Pitching dikerjakan sebagai kartu SIMPRO pada board di dalam detail Pitching: satu kartu per form stage template (dibuat on demand) + kartu custom, enam kolom status, assign Manager/Admin, dan review PM pemilik/Admin. Kartu tidak tampil di inbox Forms.
- Form Pitching harus selesai sebelum Decision; Kontrak hanya terbuka setelah Pitching menang.
- Tahap selesai, aktif, dan terkunci dibedakan dengan warna.
- Pitching menang dengan kontrak lengkap otomatis menjadi anak proyek dengan step dari template Pitching.

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
- Board berada di tab Board pada Detail Proyek CRM dan hanya menampilkan tahap yang sedang berjalan dan tahap yang sudah selesai untuk semua role. Tahap pending tidak ditampilkan atau dapat diakses lewat pilihan tahap maupun tautan langsung.
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

Forms adalah inbox seluruh penugasan Form dari Prospek, Project, dan Finance. Penerima assignment selalu melihat Form miliknya, termasuk entri Form proyek yang membuat proyek terkait ikut terlihat; penugasan user lain tidak ditampilkan. Manager/Admin dapat meng-assign entri Form yang belum di-assign langsung dari halaman Forms, dan hasilnya sama dengan penugasan dari Detail Proyek CRM.

## Asumsi

- Tahap Form/SIMPRO boleh ditutup tanpa entri/task hanya lewat konfirmasi eksplisit yang tercatat di audit trail.
- Badge Forms hanya untuk antrian isi, bukan antrian review.
- Kelengkapan Pembayaran mengikuti validasi tanggal, nominal, metode, dan bukti wajib saat status lunas.
