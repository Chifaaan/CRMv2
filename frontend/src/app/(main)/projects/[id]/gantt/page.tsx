"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

const ProjectGanttChart = dynamic(
  () => import("@/components/features/gantt/ProjectGanttChart"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[480px] w-full rounded-lg" />,
  },
);

export default function GanttPage() {
  const { id: projectId } = useParams<{ id: string }>();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Gantt</h2>
      <p className="text-sm text-zinc-600">
        Timeline tugas proyek. Peran Admin/PM dapat menggunakan mode Edit untuk
        menggeser jadwal dan mengekspor Excel/PDF dari toolbar chart; peran lain
        hanya melihat.
      </p>
      <ProjectGanttChart projectId={projectId} />
    </div>
  );
}
