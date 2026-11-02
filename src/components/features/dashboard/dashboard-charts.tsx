"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PriorityRow = { priority: string; _count: { id: number } };
type StatusRow = { status: string; _count: { id: number } };

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#0284c7",
  low: "#64748b",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "#6366f1",
  active: "#0ea5e9",
  in_progress: "#8b5cf6",
  on_hold: "#f59e0b",
  completed: "#10b981",
  cancelled: "#94a3b8",
  archived: "#475569",
};

function priorityColor(p: string) {
  return PRIORITY_COLORS[p.toLowerCase()] ?? "#3b82f6";
}

function statusColor(s: string) {
  const k = s.toLowerCase().replace(/\s+/g, "_");
  return STATUS_COLORS[k] ?? "#6366f1";
}

export function DashboardCharts({
  tasksByPriority,
  projectsByStatus,
}: {
  tasksByPriority: PriorityRow[];
  projectsByStatus: StatusRow[];
}) {
  const priData = tasksByPriority.map((r) => ({
    name: r.priority,
    count: r._count.id,
  }));
  const projData = projectsByStatus.map((r) => ({
    name: r.status.replace(/_/g, " "),
    raw: r.status,
    count: r._count.id,
  }));

  const priTotal = priData.reduce((s, r) => s + r.count, 0);
  const projTotal = projData.reduce((s, r) => s + r.count, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2 print:hidden">
      <Card className="border-zinc-200/90 shadow-sm">
        <CardHeader className="border-b border-zinc-100 bg-zinc-50/40 pb-3">
          <CardTitle className="text-base font-semibold">
            Task by prioritas
          </CardTitle>
          <p className="text-xs text-zinc-500">
            {priTotal > 0
              ? `${priTotal} task terbuka di seluruh proyek`
              : "Belum ada task terbuka"}
          </p>
        </CardHeader>
        <CardContent className="h-72 pt-4">
          {priData.length === 0 ? (
            <p className="text-sm text-zinc-500">Tidak ada data.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priData} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-zinc-200"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => String(v).replace(/_/g, " ")}
                />
                <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {priData.map((e) => (
                    <Cell key={e.name} fill={priorityColor(e.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card className="border-zinc-200/90 shadow-sm">
        <CardHeader className="border-b border-zinc-100 bg-zinc-50/40 pb-3">
          <CardTitle className="text-base font-semibold">
            Proyek by status
          </CardTitle>
          <p className="text-xs text-zinc-500">
            {projTotal > 0
              ? `${projTotal} proyek terdaftar`
              : "Belum ada proyek"}
          </p>
        </CardHeader>
        <CardContent className="h-72 pt-4">
          {projData.length === 0 ? (
            <p className="text-sm text-zinc-500">Tidak ada data.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projData} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-zinc-200"
                  vertical={false}
                />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {projData.map((e) => (
                    <Cell key={e.raw} fill={statusColor(e.raw)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
