"use client";

import { useLayoutEffect, useRef } from "react";

type SprintMini = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

type TaskMini = {
  sprintId: string | null;
  storyPoints: number | null;
  status: string;
};

export function SprintBurndownChart({
  sprint,
  tasks,
}: {
  sprint: SprintMini;
  tasks: TaskMini[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
    const totalSP = sprintTasks.reduce(
      (s, t) => s + (t.storyPoints ?? 0),
      0,
    );
    const startDate = sprint.startDate ? new Date(sprint.startDate) : null;
    const endDate = sprint.endDate ? new Date(sprint.endDate) : null;

    const W = canvas.parentElement?.clientWidth ?? 700;
    const H = 280;
    canvas.width = W;
    canvas.height = H;

    ctx.clearRect(0, 0, W, H);

    if (!startDate || !endDate || totalSP === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "13px system-ui";
      ctx.fillText(
        !startDate || !endDate
          ? "Set tanggal mulai & selesai sprint untuk grafik burndown."
          : "Belum ada story point pada tugas sprint.",
        24,
        H / 2,
      );
      return;
    }

    const daysTotal =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / 86400000,
      ) + 1;
    const today = new Date();
    const daysElapsed = Math.min(
      daysTotal,
      Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / 86400000) + 1),
    );

    const idealPoints = Array.from(
      { length: daysTotal + 1 },
      (_, i) => totalSP - (totalSP * i) / daysTotal,
    );
    const doneSP = sprintTasks
      .filter((t) => t.status === "done" || t.status === "completed")
      .reduce((s, t) => s + (t.storyPoints ?? 0), 0);
    const remainSP = totalSP - doneSP;
    const actualPoints: number[] = [];
    for (let i = 0; i <= daysElapsed - 1; i++) {
      actualPoints.push(
        totalSP - (doneSP * i) / Math.max(1, daysElapsed - 1),
      );
    }
    actualPoints.push(remainSP);

    const PAD = { top: 30, right: 20, bottom: 55, left: 50 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const yMax = totalSP;
    const xSteps = daysTotal;

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = PAD.top + chartH - (i / 5) * chartH;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + chartW, y);
      ctx.stroke();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round((i / 5) * yMax)), PAD.left - 6, y + 4);
    }

    const labelStep = Math.max(1, Math.floor(xSteps / 8));
    ctx.textAlign = "center";
    for (let i = 0; i <= xSteps; i += labelStep) {
      const x = PAD.left + (i / xSteps) * chartW;
      const d = new Date(startDate.getTime() + i * 86400000);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px system-ui";
      ctx.fillText(
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        x,
        PAD.top + chartH + 18,
      );
    }

    ctx.beginPath();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    idealPoints.forEach((sp, i) => {
      const x = PAD.left + (i / xSteps) * chartW;
      const y = PAD.top + chartH - (sp / yMax) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2.5;
    actualPoints.forEach((sp, i) => {
      const x = PAD.left + (i / xSteps) * chartW;
      const y = PAD.top + chartH - (Math.max(0, sp) / yMax) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    if (daysElapsed > 0 && daysElapsed <= daysTotal) {
      const todayX = PAD.left + ((daysElapsed - 1) / xSteps) * chartW;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(todayX, PAD.top);
      ctx.lineTo(todayX, PAD.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ef4444";
      ctx.font = "600 9px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("TODAY", todayX, PAD.top - 6);
    }

    const lastX =
      PAD.left + ((actualPoints.length - 1) / xSteps) * chartW;
    const lastY =
      PAD.top + chartH - (Math.max(0, remainSP) / yMax) * chartH;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.fillStyle = "#1d4ed8";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`${remainSP} SP`, lastX + 8, lastY + 4);
  }, [sprint, tasks]);

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4">
      <p className="mb-2 text-sm font-semibold">Burndown — {sprint.name}</p>
      <canvas ref={ref} className="mx-auto block h-[280px] w-full max-w-[760px]" />
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3.5 bg-zinc-300" />
          Ideal burndown
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3.5 bg-blue-600" />
          Sisa SP (aktual)
        </span>
      </div>
    </div>
  );
}

export function SprintVelocityChart({
  sprints,
  tasks,
}: {
  sprints: SprintMini[];
  tasks: TaskMini[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displaySprints = sprints
      .filter((s) => s.status !== "PLANNING")
      .slice(-8);

    const W = canvas.parentElement?.clientWidth ?? 700;
    const H = 260;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    if (displaySprints.length === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "13px system-ui";
      ctx.fillText("Belum ada data velocity (selesaikan sprint).", 24, H / 2);
      return;
    }

    const data = displaySprints.map((sp) => {
      const st = tasks.filter((t) => t.sprintId === sp.id);
      return {
        name: sp.name,
        committed: st.reduce((s, t) => s + (t.storyPoints ?? 0), 0),
        completed: st
          .filter((t) => t.status === "done" || t.status === "completed")
          .reduce((s, t) => s + (t.storyPoints ?? 0), 0),
      };
    });

    const PAD = { top: 30, right: 20, bottom: 55, left: 45 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const maxVal = Math.max(
      ...data.flatMap((d) => [d.committed, d.completed]),
      1,
    );
    const yMax = Math.ceil(maxVal * 1.2) || 10;
    const barGroupW = chartW / data.length;
    const barW = Math.min(barGroupW * 0.32, 32);

    ctx.strokeStyle = "#e2e8f0";
    for (let i = 0; i <= 5; i++) {
      const y = PAD.top + chartH - (i / 5) * chartH;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + chartW, y);
      ctx.stroke();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round((i / 5) * yMax)), PAD.left - 6, y + 4);
    }

    data.forEach((d, i) => {
      const cx = PAD.left + i * barGroupW + barGroupW / 2;
      const committedH = (d.committed / yMax) * chartH;
      const completedH = (d.completed / yMax) * chartH;
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(
        cx - barW - 2,
        PAD.top + chartH - committedH,
        barW,
        committedH,
      );
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(
        cx + 2,
        PAD.top + chartH - completedH,
        barW,
        completedH,
      );
      if (d.completed > 0) {
        ctx.fillStyle = "#1d4ed8";
        ctx.font = "bold 10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(
          String(d.completed),
          cx + 2 + barW / 2,
          PAD.top + chartH - completedH - 5,
        );
      }
      ctx.fillStyle = "#64748b";
      ctx.font = "10px system-ui";
      const lbl =
        d.name.length > 11 ? `${d.name.slice(0, 11)}…` : d.name;
      ctx.fillText(lbl, cx, PAD.top + chartH + 18);
    });
  }, [sprints, tasks]);

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4">
      <p className="mb-2 text-sm font-semibold">Velocity (story points)</p>
      <canvas ref={ref} className="mx-auto block h-[260px] w-full max-w-[760px]" />
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-3.5 rounded-sm bg-zinc-300" />
          Committed SP
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-3.5 rounded-sm bg-blue-600" />
          Completed SP
        </span>
      </div>
    </div>
  );
}
