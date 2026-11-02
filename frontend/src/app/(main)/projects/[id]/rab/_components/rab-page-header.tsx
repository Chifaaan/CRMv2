"use client";

import { Badge } from "@/components/ui/badge";
import { useProjectDetail } from "../../project-detail-context";

export const RabPageHeader = () => {
  const { project } = useProjectDetail();

  return (
    <div>
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
            Manajemen RAB
          </h2>
        </div>
        <p className="text-sm text-zinc-500">
          ID Proyek:{" "}
          <span className="font-semibold text-zinc-800">
            {project.code || project.id}
          </span>
        </p>
      </div>
    </div>
  );
};
