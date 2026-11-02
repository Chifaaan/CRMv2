/**
 * Persentase progress untuk UI: pipelineCompleted / pipelineTotal
 * (Run-in Pipeline saja; Parking Lot dikecualikan).
 * Jika belum ada task pipeline, pakai nilai `progress` di proyek.
 */
export function projectDisplayProgressPercent(project: {
  progress?: number | null;
  pipelineCompleted?: number;
  pipelineTotal?: number;
  /** @deprecated gunakan pipelineCompleted */
  taskDone?: number;
  /** @deprecated gunakan pipelineTotal */
  taskTotal?: number;
}): number {
  const total = project.pipelineTotal ?? project.taskTotal ?? 0;
  const done = project.pipelineCompleted ?? project.taskDone ?? 0;
  if (total > 0) {
    return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
  }
  const p = project.progress;
  if (p != null && Number.isFinite(Number(p))) {
    return Math.min(100, Math.max(0, Math.round(Number(p))));
  }
  return 0;
}

export function projectPipelineCounts(project: {
  pipelineCompleted?: number;
  pipelineTotal?: number;
  taskDone?: number;
  taskTotal?: number;
}) {
  return {
    completed: project.pipelineCompleted ?? project.taskDone ?? 0,
    total: project.pipelineTotal ?? project.taskTotal ?? 0,
  };
}

export function projectAllTaskTotal(project: {
  allTotal?: number;
  taskTotal?: number;
  pipelineTotal?: number;
}) {
  return project.allTotal ?? project.taskTotal ?? project.pipelineTotal ?? 0;
}
