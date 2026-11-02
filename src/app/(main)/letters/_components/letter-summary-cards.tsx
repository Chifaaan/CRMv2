import { CalendarDays, Clock3, FileArchive, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LetterSummary } from "../types";

export const LetterSummaryCards = ({ summary }: { summary: LetterSummary }) => {
  const items = [
    {
      id: "total",
      label: "TOTAL SURAT",
      value: summary.total,
      icon: FileArchive,
      className: "bg-primary/10 text-primary",
    },
    {
      id: "draft",
      label: "DRAFT",
      value: summary.draft,
      icon: FileText,
      className: "bg-sky-100 text-sky-700",
    },
    {
      id: "waiting",
      label: "MENUNGGU APPROVAL",
      value: summary.waiting,
      icon: Clock3,
      className: "bg-orange-100 text-orange-700",
    },
    {
      id: "monthly",
      label: "BULAN INI",
      value: summary.monthly,
      icon: CalendarDays,
      className: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm"
          >
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                item.className,
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {item.value.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
