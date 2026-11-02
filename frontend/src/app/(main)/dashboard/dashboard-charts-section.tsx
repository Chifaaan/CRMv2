"use client";

import { DashboardCharts } from "@/components/features/dashboard/dashboard-charts";

export function DashboardChartsSection({
  tasksByPriority,
  projectsByStatus,
}: {
  tasksByPriority: { priority: string; _count: { id: number } }[];
  projectsByStatus: { status: string; _count: { id: number } }[];
}) {
  return (
    <DashboardCharts
      tasksByPriority={tasksByPriority}
      projectsByStatus={projectsByStatus}
    />
  );
}
