"use client";

import { AlertTriangle, Gauge, Users } from "lucide-react";
import { usePrototypeStore } from "@/lib/prototype/store";
import { userById, workloadRows } from "@/lib/prototype/domain";
import { type TaskStatus } from "@/lib/prototype/types";
import {
  EmptyState,
  PageHeader,
  PriorityBadge,
  ProgressBar,
  SectionCard,
  StatCard,
  TaskStatusBadge,
  UserAvatar,
} from "../ui";

export function CrmWorkload() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const rows = workloadRows(store);

  if (!currentUser) return null;
  if (currentUser.role !== "admin" && currentUser.role !== "manager") {
    return (
      <EmptyState
        icon={Gauge}
        title="Workload hanya untuk Manager/Admin"
        description="Role Anda tidak memiliki akses ke halaman workload."
      />
    );
  }

  const totalActive = rows.reduce((sum, row) => sum + row.activeCount, 0);
  const totalOverdue = rows.reduce((sum, row) => sum + row.overdueCount, 0);
  const busiest = rows[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workload"
        description="Task card aktif dan form aktif per assignee dan Manager dihitung terpisah. Form tidak digabung ke jumlah kartu."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Task aktif" value={totalActive} sub="To Do, In Progress, Awaiting Approval, Need Revision" icon={Users} />
        <StatCard label="Form aktif" value={rows.reduce((sum, row) => sum + row.activeFormCount, 0)} sub="Ditugaskan, Draft, Perlu revisi" icon={Gauge} accent="from-sky-500 to-blue-600" />
        <StatCard label="Overdue" value={totalOverdue} sub="Task melewati due date" icon={AlertTriangle} accent="from-rose-500 to-red-600" />
        <StatCard label="Beban tertinggi" value={busiest?.user.name ?? "—"} sub={busiest ? `${busiest.activeCount} task · ${busiest.activeFormCount} form` : "Belum ada"} icon={Gauge} accent="from-amber-500 to-orange-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => {
          const totalWork = row.activeCount + row.activeFormCount;
          const max = Math.max(
            1,
            ...rows.map((item) => item.activeCount + item.activeFormCount),
          );
          const percent = Math.round((totalWork / max) * 100);
          return (
            <SectionCard
              key={row.user.id}
              title={row.user.name}
              description={`${row.projectNames.length} proyek · ${row.activeCount} task aktif · ${row.activeFormCount} form aktif`}
              actions={<UserAvatar user={row.user} showName />}
            >
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Beban relatif</span>
                    <span className="font-semibold">
                      {row.activeCount} task · {row.activeFormCount} form
                    </span>
                  </div>
                  <ProgressBar
                    value={percent}
                    tone={percent > 80 ? "bg-rose-500" : percent > 50 ? "bg-amber-500" : "bg-emerald-500"}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(row.statusCounts) as TaskStatus[]).map((status) => (
                    <span key={status} className="inline-flex items-center gap-1">
                      <TaskStatusBadge status={status} />
                      <span className="text-[10px] font-semibold">{row.statusCounts[status]}</span>
                    </span>
                  ))}
                  {Object.keys(row.statusCounts).length === 0 ? (
                    <span className="text-muted-foreground text-xs">Tidak ada task aktif.</span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(row.priorityCounts) as [string, number][]).map(([priority, count]) => (
                    <span key={priority} className="inline-flex items-center gap-1">
                      <PriorityBadge priority={priority as "low" | "medium" | "high" | "critical"} />
                      <span className="text-[10px] font-semibold">{count}</span>
                    </span>
                  ))}
                </div>

                <div className="text-muted-foreground flex flex-wrap gap-2 text-[10px]">
                  {row.projectNames.length > 0 ? (
                    row.projectNames.map((name) => (
                      <span key={name} className="rounded-full bg-muted px-2 py-0.5">
                        {name}
                      </span>
                    ))
                  ) : (
                    <span>Belum ada proyek.</span>
                  )}
                </div>

                {row.overdueCount > 0 ? (
                  <p className="text-xs font-medium text-rose-600">
                    {row.overdueCount} task overdue
                  </p>
                ) : null}
              </div>
            </SectionCard>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada assignee" description="Tambahkan user dengan role Assignee." />
      ) : null}
    </div>
  );
}
