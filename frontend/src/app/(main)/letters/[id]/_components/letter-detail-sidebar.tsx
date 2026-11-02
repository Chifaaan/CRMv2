import {
  CalendarDays,
  CheckCircle2,
  History,
  Info,
  Lock,
  Paperclip,
  UserRound,
} from "lucide-react";
import type { LetterDetail } from "../../types";

const quickNav = [
  { id: "informasi-surat", label: "Informasi Surat", icon: Info },
  { id: "dokumen", label: "Dokumen Lampiran", icon: Paperclip },
  { id: "approval", label: "Alur Approval", icon: CheckCircle2 },
  { id: "riwayat", label: "Riwayat Aktivitas", icon: History },
];

export const LetterDetailSidebar = ({ letter }: { letter: LetterDetail }) => {
  const systemItems = [
    {
      id: "created-by",
      label: "Dibuat oleh",
      value: letter.createdBy.name,
      icon: UserRound,
    },
    {
      id: "created-at",
      label: "Tanggal Dibuat",
      value: new Date(letter.createdAt).toLocaleString("id-ID"),
      icon: CalendarDays,
    },
    {
      id: "updated-at",
      label: "Terakhir Diubah",
      value: new Date(letter.updatedAt).toLocaleString("id-ID"),
      icon: History,
    },
  ];

  return (
    <aside className="space-y-5 xl:sticky xl:top-20">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="p-5">
          <h3 className="mb-4 font-semibold">Informasi Sistem</h3>
          <div className="space-y-4">
            {systemItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.id} className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t bg-muted/20 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Detail Finalisasi
          </p>
          <div className="rounded-xl border bg-background p-3">
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold">
                {letter.finalizedAt ? "Dokumen Terkunci" : "Dokumen Draft"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              ID Surat: <span className="font-mono">{letter.id}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Navigasi Cepat
        </p>
        <nav className="space-y-1">
          {quickNav.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
