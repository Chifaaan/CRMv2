import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-session";
import { isAdminOrPmRole } from "@/lib/role-constants";

export default async function ProjectGuidePage() {
  const { data: session } = await getServerSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdminOrPmRole(role)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <header className="space-y-2 border-b border-zinc-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Panduan metodologi proyek
        </h1>
        <p className="text-muted-foreground text-sm">
          Untuk PM dan admin: alur dari inisiasi proyek hingga stabilisasi
          pasca-rilis, dengan penekanan pada backlog, sprint, komunikasi, dan
          maintenance.
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
          <li>
            <a
              href="#pm-backlog"
              className="text-primary hover:underline underline-offset-4"
            >
              Backlog & prioritas
            </a>
          </li>
          <li>
            <a
              href="#pm-sprint"
              className="text-primary hover:underline underline-offset-4"
            >
              Perencanaan sprint
            </a>
          </li>
          <li>
            <a
              href="#pm-gantt"
              className="text-primary hover:underline underline-offset-4"
            >
              Jadwal & Gantt
            </a>
          </li>
          <li>
            <a
              href="#pm-maintenance"
              className="text-primary hover:underline underline-offset-4"
            >
              Maintenance & SLA
            </a>
          </li>
          <li>
            <a
              href="#pm-comms"
              className="text-primary hover:underline underline-offset-4"
            >
              Komunikasi & stakeholder
            </a>
          </li>
          <li>
            <a
              href="#pm-reports"
              className="text-primary hover:underline underline-offset-4"
            >
              Laporan & keputusan
            </a>
          </li>
        </ul>
      </nav>

      <article className="prose prose-sm max-w-none space-y-10">
        <section id="pm-backlog" className="scroll-mt-20">
          <h2>Backlog & prioritas</h2>
          <p>
            Jaga backlog tetap dapat ditindak: setiap item punya pemilik
            konteks, prioritas, dan estimasi yang konsisten. Rapikan secara
            berkala; pecah pekerjaan besar agar masuk sprint tanpa ambiguitas.
          </p>
          <ul>
            <li>
              Gunakan tag dan tipe tugas agar laporan dan filter tim tetap
              bermakna.
            </li>
            <li>
              Samakan definisi &quot;selesai&quot; dengan tim sebelum commit
              sprint.
            </li>
          </ul>
        </section>

        <section id="pm-sprint" className="scroll-mt-20">
          <h2>Perencanaan sprint</h2>
          <p>
            Pilih kapasitas berdasarkan velocity dan ketersediaan. Satu sprint
            aktif mengurangi konflik prioritas; saat menutup sprint, putuskan
            nasib tugas yang belum selesai (backlog berikutnya atau carry-over
            eksplisit).
          </p>
          <p>
            Catat hambatan dan temuan retrospektif di catatan sprint agar
            iterasi berikutnya terukur.
          </p>
        </section>

        <section id="pm-gantt" className="scroll-mt-20">
          <h2>Jadwal & Gantt</h2>
          <p>
            Sinkronkan tanggal mulai dan selesai tugas dengan komitmen klien.
            Filter sprint di Gantt membantu fokus iterasi; tombol &quot;Hari
            ini&quot; mempermudah review status relatif terhadap tenggat.
          </p>
        </section>

        <section id="pm-maintenance" className="scroll-mt-20">
          <h2>Maintenance & SLA</h2>
          <p>
            Setelah go-live, aktifkan fase yang memunculkan modul maintenance.
            Isi severity, PIC developer dan klien sesuai kebutuhan visibilitas;
            lampiran membantu eskalasi cepat.
          </p>
          <p>
            Gunakan rentang tanggal pada laporan maintenance untuk invoice atau
            review bulanan.
          </p>
        </section>

        <section id="pm-comms" className="scroll-mt-20">
          <h2>Komunikasi & stakeholder</h2>
          <p>
            Meeting untuk keputusan dan notulensi; diskusi proyek untuk konteks
            yang harus tertulis dan dapat dicari. Sematkan thread keputusan atau
            blocker agar onboarding anggota baru lebih cepat.
          </p>
        </section>

        <section id="pm-reports" className="scroll-mt-20">
          <h2>Laporan & keputusan</h2>
          <p>
            Progres, beban tim, burndown, ringkasan maintenance, dan aset
            mendukung review dengan manajemen. Ekspor atau cetak bila perlu
            arsip formal.
          </p>
        </section>
      </article>
    </div>
  );
}
