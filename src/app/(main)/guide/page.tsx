import Link from "next/link";

const toc = [
  { href: "#guide-overview", label: "1. Gambaran umum" },
  { href: "#guide-roles", label: "2. Peran & akses" },
  { href: "#guide-getting-started", label: "3. Memulai" },
  { href: "#guide-projects", label: "4. Proyek" },
  { href: "#guide-tasks", label: "5. Tugas & backlog" },
  { href: "#guide-board", label: "6. Papan Kanban" },
  { href: "#guide-sprints", label: "7. Sprint" },
  { href: "#guide-gantt", label: "8. Gantt" },
  { href: "#guide-maintenance", label: "9. Maintenance" },
  { href: "#guide-reports", label: "10. Laporan" },
  { href: "#guide-members", label: "11. Anggota" },
  { href: "#guide-clients", label: "12. Klien" },
  /* { href: "#guide-assets", label: "13. Aset" }, */ // hidden — fitur belum diaktifkan
  { href: "#guide-meetings", label: "14. Meeting" },
  { href: "#guide-discussion", label: "15. Diskusi proyek" },
  { href: "#guide-notifications", label: "16. Notifikasi" },
  { href: "#guide-notes", label: "17. Catatan pribadi" },
  { href: "#guide-settings", label: "18. Pengaturan" },
] as const;

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <header className="space-y-2 border-b border-zinc-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Panduan pengguna
        </h1>
        <p className="text-muted-foreground text-sm">
          SIMPRO mengelola proyek, tugas, sprint, maintenance, meeting, diskusi,
          aset, klien, dan laporan. Navigasi utama ada di sidebar; menu mobile
          menyalin pintasan penting. Peran Anda menentukan halaman dan tindakan
          yang tersedia.
        </p>
        <Link
          href="/dashboard"
          className="text-primary inline-flex text-sm font-medium underline-offset-4 hover:underline"
        >
          Kembali ke dasbor
        </Link>
      </header>

      <nav
        className="bg-card rounded-lg border border-zinc-200 p-4 shadow-sm"
        aria-label="Daftar isi"
      >
        <p className="mb-3 text-sm font-medium">Daftar isi</p>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {toc.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="text-primary hover:underline underline-offset-4"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="prose prose-sm max-w-none space-y-10">
        <section id="guide-overview" className="scroll-mt-20">
          <h2>1. Gambaran umum</h2>
          <p>
            SIMPRO adalah sistem manajemen proyek untuk tim yang membutuhkan
            backlog, papan kerja, perencanaan sprint, jadwal Gantt, tiket
            maintenance, dan komunikasi terstruktur. Data diakses lewat API
            terautentikasi; sesi login mengikuti pengaturan autentikasi aplikasi
            Anda.
          </p>
          <h3>Fitur utama</h3>
          <ul>
            <li>Multi-proyek dengan Kanban, backlog, dan Gantt</li>
            <li>Sprint, velocity, dan status tugas yang dapat disesuaikan</li>
            <li>Maintenance dengan SLA, assignment, dan visibilitas per peran</li>
            <li>Laporan proyek dan ringkasan aset/maintenance</li>
            <li>Kontrol akses berbasis peran (admin, PM, anggota, viewer, klien)</li>
            <li>Notifikasi in-app dengan tab semua / belum dibaca</li>
            <li>Meeting, notulensi, dan action items</li>
            <li>Diskusi per proyek dengan tipe post, lampiran, dan pin</li>
            <li>Catatan pribadi: folder, warna, tag, berbagi, dan audit</li>
          </ul>
        </section>

        <section id="guide-roles" className="scroll-mt-20">
          <h2>2. Peran & akses</h2>
          <p>
            Setiap pengguna punya peran global. Admin dan PM biasanya dapat
            membuat proyek, mengelola anggota proyek, klien, dan aset. Developer
            / anggota menyelesaikan tugas dan berpartisipasi di diskusi.
            Viewer dan klien memiliki akses baca atau terbatas sesuai data
            yang diizinkan (misalnya tiket maintenance dengan PIC klien).
          </p>
          <ul>
            <li>
              <strong>Admin:</strong> akses luas termasuk pengaturan sistem dan
              manajemen pengguna.
            </li>
            <li>
              <strong>PM:</strong> mengelola proyek, sprint, tugas, meeting, dan
              sering kali klien/aset.
            </li>
            <li>
              <strong>Member:</strong> tugas yang ditugaskan, board, diskusi.
            </li>
            <li>
              <strong>Viewer / Client:</strong> tampilan terbatas tanpa mutasi
              sensitif.
            </li>
          </ul>
          <p>
            Pengguna baru dapat ditambahkan dari halaman{" "}
            <Link href="/members">Anggota</Link> (admin/PM), sesuai kebijakan
            organisasi Anda.
          </p>
        </section>

        <section id="guide-getting-started" className="scroll-mt-20">
          <h2>3. Memulai</h2>
          <ol>
            <li>Masuk dengan kredensial yang diberikan administrator.</li>
            <li>
              Daftarkan klien di <Link href="/clients">Klien</Link> bila
              proyek perlu ditautkan ke perusahaan.
            </li>
            <li>
              Buat atau buka proyek dari <Link href="/projects">Proyek</Link>.
            </li>
            <li>Tambah tugas di backlog, lalu rencanakan sprint.</li>
            <li>
              Pantau progres di papan Kanban atau di Gantt untuk jadwal.
            </li>
          </ol>
        </section>

        <section id="guide-projects" className="scroll-mt-20">
          <h2>4. Proyek</h2>
          <p>
            Proyek adalah kontainer untuk tugas, sprint, maintenance, meeting,
            diskusi, dan laporan. Dari kartu atau detail proyek, pilih tab:
            ringkasan, papan, backlog, sprint, Gantt, maintenance (jika fase
            mendukung), meeting, diskusi, dan laporan.
          </p>
        </section>

        <section id="guide-tasks" className="scroll-mt-20">
          <h2>5. Tugas & backlog</h2>
          <p>
            Tugas memiliki judul, tipe, prioritas, status, penanggung jawab,
            poin cerita, tanggal, tag, dan deskripsi. Backlog menampung daftar
            tugas dengan penyaringan; penugasan ke anggota dapat memicu
            notifikasi.
          </p>
        </section>

        <section id="guide-board" className="scroll-mt-20">
          <h2>6. Papan Kanban</h2>
          <p>
            Papan menampilkan tugas menurut status. Seret kartu antar kolom
            untuk memperbarui status sesuai alur kerja tim.
          </p>
        </section>

        <section id="guide-sprints" className="scroll-mt-20">
          <h2>7. Sprint</h2>
          <p>
            Buat sprint dengan rentang tanggal, pindahkan tugas dari backlog,
            dan tutup sprint saat iterasi selesai. Pantau kapasitas dengan
            ringkasan poin di perencanaan.
          </p>
        </section>

        <section id="guide-gantt" className="scroll-mt-20">
          <h2>8. Gantt</h2>
          <p>
            Timeline menampilkan tugas sebagai batang; Anda dapat mengubah zoom
            (hari / minggu / bulan), menyaring menurut sprint, melompat ke
            hari ini, dan menyeret ujung batang atau seluruh batang untuk
            memperbarui tanggal mulai atau selesai (sesuai izin peran).
          </p>
        </section>

        <section id="guide-maintenance" className="scroll-mt-20">
          <h2>9. Maintenance</h2>
          <p>
            Untuk proyek pada fase yang tepat, tiket maintenance melacak
            severity, tanggal, penanggung jawab, dan lampiran. PM dan admin
            dapat menghasilkan laporan atau ekspor sesai fitur yang tersedia di
            modul tersebut.
          </p>
        </section>

        <section id="guide-reports" className="scroll-mt-20">
          <h2>10. Laporan</h2>
          <p>
            Tab laporan proyek menyediakan ringkasan progres, beban tim,
            burndown sprint, maintenance, dan inventaris aset. Gunakan tombol
            cetak atau ekspor di UI jika disediakan untuk menyimpan salinan.
          </p>
        </section>

        <section id="guide-members" className="scroll-mt-20">
          <h2>11. Anggota</h2>
          <p>
            Halaman anggota menampilkan pengguna dengan pencarian dan informasi
            profil. Admin/PM dapat menambah pengguna baru sesuai alur aplikasi.
          </p>
        </section>

        <section id="guide-clients" className="scroll-mt-20">
          <h2>12. Klien</h2>
          <p>
            Kelola perusahaan klien: industri (daftar standar atau kustom),
            status termasuk <em>prospect</em>, kontak, dan catatan. Gunakan
            bilah alat pencarian serta filter status dan industri untuk
            menemukan entri dengan cepat.
          </p>
        </section>

        {/* guide-assets section removed — fitur belum diaktifkan */}

        <section id="guide-meetings" className="scroll-mt-20">
          <h2>14. Meeting</h2>
          <p>
            Jadwalkan meeting per proyek, catat notulensi dan action items;
            hubungkan ke tugas bila alur Anda mendukung konversi dari action
            item.
          </p>
        </section>

        <section id="guide-discussion" className="scroll-mt-20">
          <h2>15. Diskusi proyek</h2>
          <p>
            Buat thread dengan tipe (update, pertanyaan, keputusan, blocker,
            umum), lampirkan beberapa file, balas dengan Markdown, dan sematkan
            thread penting. Moderator dapat mengedit atau menghapus konten
            sesuai kebijakan.
          </p>
        </section>

        <section id="guide-notifications" className="scroll-mt-20">
          <h2>16. Notifikasi</h2>
          <p>
            Lonceng di bilah atas menampilkan pratinjau entri terbaru; klik
            item untuk membuka entitas terkait dan menandai dibaca. Halaman{" "}
            <Link href="/notifications">Notifikasi</Link> mendukung tab semua /
            belum dibaca dan gulir tak berujung.
          </p>
        </section>

        <section id="guide-notes" className="scroll-mt-20">
          <h2>17. Catatan pribadi</h2>
          <p>
            Catatan mendukung folder, editor Markdown, warna kartu, tag,
            pencarian, berbagi ke rekan, dan riwayat perubahan (audit).
          </p>
        </section>

        <section id="guide-settings" className="scroll-mt-20">
          <h2>18. Pengaturan</h2>
          <p>
            Admin mengatur preferensi aplikasi yang tersimpan di server.
            Simpan perubahan dan pastikan UI memuat ulang data terbaru setelah
            edit.
          </p>
        </section>
      </article>
    </div>
  );
}
