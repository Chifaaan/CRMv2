"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  BarChart2,
  Kanban,
  LayoutList,
  MoveRight,
  Plus,
  TrendingDown,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  FormDraftKeys,
  clearFormDraft,
  loadFormDraftEnvelope,
} from "@/lib/form-draft-storage";
import { useDebouncedFormDraftSave } from "@/lib/hooks/use-debounced-form-draft-save";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SprintPlanningBoard } from "@/components/features/sprint/SprintPlanningBoard";
import { SprintBoardTab } from "@/components/features/sprint/SprintBoardTab";
import { TaskDetailSheet } from "@/components/features/tasks/TaskDetailSheet";
import { TASK_STATUS_LABELS } from "@/components/features/board/board-constants";
import {
  SprintBurndownChart,
  SprintVelocityChart,
} from "@/components/features/sprint/sprint-charts";
import { toast } from "sonner";
import {
  canCreateSprintInProject,
  isTaskAndPlanningReadOnlyRole,
} from "@/lib/project-detail-permissions";
import {
  canChangeTaskStatus,
  notifyTaskStatusChangeBlocked,
} from "@/lib/task-status-restrictions";

type SprintRow = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  retroNotes: string | null;
  completedNote: string | null;
  completedAt: string | null;
  onHoldAt: string | null;
  onHoldReason: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  _count: { tasks: number };
};

type TaskRow = {
  id: string;
  taskNumber?: number;
  project?: { id: string; code: string } | null;
  title: string;
  status: string;
  priority: string;
  type: string;
  storyPoints: number | null;
  sprintId: string | null;
  tags?: string[];
  assignees: { user: { id: string; name: string; image: string | null } }[];
};

function SprintRetroEditor({
  initialNotes,
  readOnly,
  isSaving,
  onSave,
}: {
  initialNotes: string;
  readOnly: boolean;
  isSaving: boolean;
  onSave: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(initialNotes);
  return (
    <>
      <Textarea
        rows={5}
        placeholder="Yang berjalan baik? Perbaikan? Action items…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        readOnly={readOnly}
      />
      {!readOnly ? (
        <Button
          type="button"
          onClick={() => onSave(notes)}
          disabled={isSaving}
        >
          Simpan catatan
        </Button>
      ) : null}
    </>
  );
}

export function SprintPageClient() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "developer";
  const readOnly = isTaskAndPlanningReadOnlyRole(role);
  const canCreateSprint = canCreateSprintInProject(role);

  const [tab, setTab] = useState("list");
  const [planningSprintId, setPlanningSprintId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [completeNote, setCompleteNote] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [retroSprintId, setRetroSprintId] = useState<string | null>(null);
  const [detailSprintId, setDetailSprintId] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!newOpen || !projectId) return;
    const env = loadFormDraftEnvelope(FormDraftKeys.sprintCreate(projectId))
      ?.payload;
    if (env && typeof env === "object") {
      const raw = env as {
        name?: string;
        goal?: string;
        start?: string;
        end?: string;
      };
      setNewName(raw.name ?? "");
      setNewGoal(raw.goal ?? "");
      setNewStart(raw.start ?? "");
      setNewEnd(raw.end ?? "");
      return;
    }
    setNewName("");
    setNewGoal("");
    setNewStart("");
    setNewEnd("");
  }, [newOpen, projectId]);

  const sprintDraftKey =
    newOpen && projectId ? FormDraftKeys.sprintCreate(projectId) : null;

  useDebouncedFormDraftSave(Boolean(sprintDraftKey), sprintDraftKey, () => {
    if (
      !newName.trim() &&
      !newGoal.trim() &&
      !newStart.trim() &&
      !newEnd.trim()
    ) {
      return undefined;
    }
    return {
      name: newName,
      goal: newGoal,
      start: newStart,
      end: newEnd,
    };
  }, [newName, newGoal, newStart, newEnd]);

  const sprintsQ = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      const res = await api.get<SprintRow[]>("/api/sprints", {
        params: { projectId },
      });
      return res.data;
    },
  });

  const tasksQ = useQuery({
    queryKey: ["tasks", projectId, "sprint"],
    queryFn: async () => {
      const res = await api.get<{ data: TaskRow[] }>("/api/tasks", {
        params: { projectId, page: "1", take: "2000", kanban: "1" },
      });
      return res.data.data;
    },
  });

  const sprints = sprintsQ.data ?? [];
  const tasks = tasksQ.data ?? [];

  const defaultPlanningId = useMemo(() => {
    if (!sprints.length) return "";
    const active = sprints.find((s) => s.status === "ACTIVE");
    const open = sprints.filter((s) => s.status !== "COMPLETED");
    return active?.id ?? open[0]?.id ?? sprints[0].id;
  }, [sprints]);

  const effectivePlanningId = planningSprintId ?? defaultPlanningId;
  const planningSprint = sprints.find((s) => s.id === effectivePlanningId);
  const planningPool = sprints.filter((s) => s.status !== "COMPLETED");
  const planningSprintSelectItems = useMemo(
    () =>
      planningPool.map((s) => ({
        value: s.id,
        label: `${s.name} (${s.status})`,
      })),
    [planningPool],
  );
  const retroSprintSelectItems = useMemo(
    () =>
      sprints.map((s) => ({
        value: s.id,
        label: `${s.name} (${s.status})`,
      })),
    [sprints],
  );
  const activeSprint = sprints.find((s) => s.status === "ACTIVE");
  const burndownSprint = activeSprint ?? sprints.find((s) => s.status === "COMPLETED");

  const activeBoardTasks = useMemo(
    () => tasks.filter((t) => t.sprintId === activeSprint?.id),
    [tasks, activeSprint?.id],
  );

  const chartTasks = useMemo(
    () =>
      tasks.map((t) => ({
        sprintId: t.sprintId,
        storyPoints: t.storyPoints,
        status: t.status,
      })),
    [tasks],
  );

  const patchTask = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => api.patch(`/api/tasks/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
    onError: () => toast.error("Gagal memperbarui tugas"),
  });

  const createSprint = useMutation({
    mutationFn: () =>
      api.post("/api/sprints", {
        projectId,
        name: newName.trim(),
        goal: newGoal.trim() || undefined,
        startDate: newStart || undefined,
        endDate: newEnd || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sprints", projectId] });
      toast.success("Sprint dibuat");
      clearFormDraft(FormDraftKeys.sprintCreate(projectId));
      setNewOpen(false);
      setNewName("");
      setNewGoal("");
      setNewStart("");
      setNewEnd("");
    },
    onError: () => toast.error("Gagal membuat sprint"),
  });

  const activate = useMutation({
    mutationFn: (sprintId: string) =>
      api.post(`/api/sprints/${sprintId}/activate`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sprints", projectId] });
      void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("Sprint diaktifkan");
    },
    onError: () => toast.error("Gagal mengaktifkan sprint"),
  });

  const hold = useMutation({
    mutationFn: (sprintId: string) =>
      api.post(`/api/sprints/${sprintId}/hold`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sprints", projectId] });
      void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("Sprint di-pause");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal mem-pause sprint";
      toast.error(msg);
    },
  });

  const complete = useMutation({
    mutationFn: ({
      sprintId,
      completionNote,
    }: {
      sprintId: string;
      completionNote?: string;
    }) =>
      api.post(`/api/sprints/${sprintId}/complete`, {
        unfinishedTaskAction: "carry",
        ...(completionNote ? { completionNote } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sprints", projectId] });
      void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("Sprint diselesaikan");
      setCompleteId(null);
      setCompleteNote("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal menyelesaikan sprint";
      toast.error(msg);
    },
  });

  const reopen = useMutation({
    mutationFn: (sprintId: string) =>
      api.patch(`/api/sprints/${sprintId}`, { status: "PLANNING" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sprints", projectId] });
      toast.success("Sprint dibuka kembali");
    },
    onError: () => toast.error("Gagal reopen sprint"),
  });

  const cancelSprint = useMutation({
    mutationFn: (sprintId: string) =>
      api.post(`/api/sprints/${sprintId}/cancel`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sprints", projectId] });
      void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success("Sprint dibatalkan, semua task dikembalikan ke backlog");
      setCancelId(null);
    },
    onError: () => toast.error("Gagal membatalkan sprint"),
  });

  const removeSprint = useMutation({
    mutationFn: (sprintId: string) => api.delete(`/api/sprints/${sprintId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sprints", projectId] });
      toast.success("Sprint dihapus");
      setDeleteId(null);
    },
    onError: () => toast.error("Gagal menghapus sprint"),
  });

  const saveRetro = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.patch(`/api/sprints/${id}`, { retroNotes: notes }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sprints", projectId] });
      toast.success("Catatan retro disimpan");
    },
    onError: () => toast.error("Gagal menyimpan"),
  });

  const lastSprintId = sprints[0]?.id;
  const retroTargetId = retroSprintId ?? lastSprintId;

  function openPlanningFor(sprintId: string) {
    setPlanningSprintId(sprintId);
    setTab("planning");
  }

  if (sprintsQ.isPending || tasksQ.isPending) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sprint management</h2>
          <p className="text-sm text-zinc-600">
            {sprints.length} sprint{sprints.length !== 1 ? "s" : ""} — alur Trackly
          </p>
        </div>
        {canCreateSprint ? (
          <Button type="button" onClick={() => setNewOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Sprint baru
          </Button>
        ) : null}
      </div>

      {activeSprint ? (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 text-emerald-700" />
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-800">
                Active sprint
              </p>
              <p className="font-semibold text-emerald-950">{activeSprint.name}</p>
              <p className="text-sm text-emerald-900/80">
                {activeSprint.endDate
                  ? `Berakhir ${format(new Date(activeSprint.endDate), "d MMM yyyy")}`
                  : "Tanpa tanggal selesai"}
                {" · "}
                {
                  activeBoardTasks.filter((t) =>
                    ["done", "completed"].includes(t.status),
                  ).length
                }
                /{activeBoardTasks.length} tugas selesai
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setTab("board")}
            >
              <Kanban className="mr-1 h-4 w-4" />
              Board
            </Button>
            {!readOnly ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setCompleteId(activeSprint.id)}
              >
                Selesaikan sprint
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="flex h-auto w-full flex-wrap gap-1">
          <TabsTrigger value="list" className="gap-1">
            <LayoutList className="h-4 w-4" />
            Sprints
          </TabsTrigger>
          <TabsTrigger value="planning" className="gap-1">
            <MoveRight className="h-4 w-4" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-1">
            <Kanban className="h-4 w-4" />
            Sprint board
          </TabsTrigger>
          <TabsTrigger value="burndown" className="gap-1">
            <TrendingDown className="h-4 w-4" />
            Burndown
          </TabsTrigger>
          <TabsTrigger value="velocity" className="gap-1">
            <BarChart2 className="h-4 w-4" />
            Velocity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          {sprints.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <Zap className="h-10 w-10 text-zinc-400" />
                <p className="font-medium">Belum ada sprint</p>
                <p className="text-center text-sm text-zinc-600">
                  Buat sprint pertama untuk planning dan board.
                </p>
                {canCreateSprint ? (
                  <Button type="button" onClick={() => setNewOpen(true)}>
                    Buat sprint
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sprints.map((s) => {
                const st = tasks.filter((t) => t.sprintId === s.id);
                const done = st.filter((t) =>
                  ["done", "completed"].includes(t.status),
                ).length;
                const pct =
                  st.length > 0 ? Math.round((done / st.length) * 100) : 0;
                // Sprint PLANNING atau ON_HOLD bisa diaktifkan; sprint aktif
                // lama otomatis di-pause oleh backend (tukeran status).
                const canActivate =
                  s.status === "PLANNING" || s.status === "ON_HOLD";
                const canHold = s.status === "ACTIVE";
                const canComplete = s.status === "ACTIVE";
                const canCancel =
                  s.status === "PLANNING" ||
                  s.status === "ACTIVE" ||
                  s.status === "ON_HOLD";
                const canReopen = s.status === "COMPLETED" || s.status === "CANCELLED";
                const activateLabel =
                  s.status === "ON_HOLD" ? "Resume" : "Start";
                const statusLabel =
                  s.status === "PLANNING"
                    ? "Planning"
                    : s.status === "ACTIVE"
                      ? "Active"
                      : s.status === "ON_HOLD"
                        ? "On Hold"
                        : s.status === "CANCELLED"
                          ? "Cancelled"
                          : "Completed";

                return (
                  <Card
                    key={s.id}
                    className="cursor-pointer hover:border-zinc-300 hover:shadow-sm transition-[border-color,box-shadow]"
                    onClick={() => setDetailSprintId(s.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "mb-1",
                              s.status === "ACTIVE" && "bg-emerald-100 text-emerald-800",
                              s.status === "ON_HOLD" && "bg-amber-100 text-amber-800",
                              s.status === "CANCELLED" && "bg-orange-100 text-orange-800",
                              s.status === "COMPLETED" && "bg-blue-100 text-blue-800",
                            )}
                          >
                            {statusLabel}
                          </Badge>
                          <CardTitle className="text-base">{s.name}</CardTitle>
                          <p className="text-xs text-zinc-500">
                            {s.startDate
                              ? format(new Date(s.startDate), "d MMM yyyy")
                              : "—"}
                            {s.endDate
                              ? ` → ${format(new Date(s.endDate), "d MMM yyyy")}`
                              : ""}
                            {" · "}
                            {st.length} tugas
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                          {!readOnly && canActivate ? (
                            <Button
                              size="sm"
                              variant="default"
                              type="button"
                              onClick={() => activate.mutate(s.id)}
                            >
                              {activateLabel}
                            </Button>
                          ) : null}
                          {!readOnly && canHold ? (
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              className="border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={() => hold.mutate(s.id)}
                            >
                              Pause
                            </Button>
                          ) : null}
                          {!readOnly && canComplete ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              type="button"
                              onClick={() => setCompleteId(s.id)}
                            >
                              Complete
                            </Button>
                          ) : null}
                          {!readOnly && canCancel ? (
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              className="border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() => setCancelId(s.id)}
                            >
                              Cancel
                            </Button>
                          ) : null}
                          {!readOnly && canReopen ? (
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => reopen.mutate(s.id)}
                            >
                              Reopen
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() => openPlanningFor(s.id)}
                          >
                            Planning
                          </Button>
                          {!readOnly ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => setDeleteId(s.id)}
                            >
                              Hapus
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {s.goal ? (
                        <p className="text-sm text-zinc-700">&ldquo;{s.goal}&rdquo;</p>
                      ) : null}
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500">{pct}% selesai</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="planning" className="mt-4">
          {planningPool.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-zinc-600">
                Tidak ada sprint planning/active. Buat sprint dari tab Sprints.
              </CardContent>
            </Card>
          ) : planningSprint ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Label className="shrink-0">Planning sprint</Label>
                <Select
                  value={effectivePlanningId}
                  onValueChange={(v) => setPlanningSprintId(v ? v : null)}
                  items={planningSprintSelectItems}
                >
                  <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {planningSprintSelectItems.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-zinc-600">
                  {tasks.filter((t) => t.sprintId === effectivePlanningId).length}{" "}
                  tugas
                </span>
              </div>
              <SprintPlanningBoard
                planningSprintId={effectivePlanningId}
                planningSprintName={planningSprint.name}
                tasks={tasks}
                readOnly={readOnly}
                onAssignToSprint={(taskId, sid) => {
                  patchTask.mutate(
                    { id: taskId, body: { sprintId: sid } },
                    {
                      onSuccess: () => toast.success("Tugas masuk sprint"),
                    },
                  );
                }}
                onRemoveFromSprint={(taskId) => {
                  patchTask.mutate(
                    { id: taskId, body: { sprintId: null } },
                    {
                      onSuccess: () => toast.success("Tugas dikembalikan ke backlog"),
                    },
                  );
                }}
              />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          {!activeSprint ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Kanban className="mx-auto mb-2 h-10 w-10 text-zinc-400" />
                <p className="font-medium">Tidak ada sprint aktif</p>
                <p className="text-sm text-zinc-600">
                  Aktifkan sprint dari tab Sprints untuk membuka board.
                </p>
              </CardContent>
            </Card>
          ) : (
            <SprintBoardTab
              activeSprintName={activeSprint.name}
              endDate={activeSprint.endDate}
              tasks={activeBoardTasks}
              readOnly={readOnly}
              projectId={projectId}
              onMove={(taskId, newStatus) => {
                const currentStatus = activeBoardTasks.find(
                  (t) => t.id === taskId,
                )?.status;
                if (
                  currentStatus &&
                  !canChangeTaskStatus(role, currentStatus, newStatus)
                ) {
                  notifyTaskStatusChangeBlocked(
                    role,
                    currentStatus,
                    newStatus,
                  );
                  return;
                }
                patchTask.mutate(
                  { id: taskId, body: { status: newStatus } },
                  { onSuccess: () => toast.success("Status diperbarui") },
                );
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="burndown" className="mt-4">
          {!burndownSprint ? (
            <p className="text-sm text-zinc-600">Belum ada data sprint.</p>
          ) : (
            <SprintBurndownChart
              sprint={{
                id: burndownSprint.id,
                name: burndownSprint.name,
                status: burndownSprint.status,
                startDate: burndownSprint.startDate,
                endDate: burndownSprint.endDate,
              }}
              tasks={chartTasks}
            />
          )}
        </TabsContent>

        <TabsContent value="velocity" className="mt-4 space-y-6">
          <SprintVelocityChart
            sprints={sprints.map((s) => ({
              id: s.id,
              name: s.name,
              status: s.status,
              startDate: s.startDate,
              endDate: s.endDate,
            }))}
            tasks={chartTasks}
          />
          {sprints.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Retrospective</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Sprint</Label>
                  <Select
                    value={retroTargetId ?? ""}
                    onValueChange={(v) => {
                      setRetroSprintId(v ?? null);
                    }}
                    items={retroSprintSelectItems}
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Pilih sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      {retroSprintSelectItems.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {retroTargetId ? (
                  <SprintRetroEditor
                    key={retroTargetId}
                    initialNotes={
                      sprints.find((x) => x.id === retroTargetId)?.retroNotes ??
                      ""
                    }
                    readOnly={readOnly}
                    isSaving={saveRetro.isPending}
                    onSave={(notes) =>
                      saveRetro.mutate({ id: retroTargetId, notes })
                    }
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sprint baru</DialogTitle>
            <DialogDescription>Nama wajib; tanggal opsional.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="sp-name">Nama</Label>
              <Input
                id="sp-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-goal">Goal</Label>
              <Input
                id="sp-goal"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="sp-start">Mulai</Label>
                <Input
                  id="sp-start"
                  type="date"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-end">Selesai</Label>
                <Input
                  id="sp-end"
                  type="date"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              disabled={!newName.trim() || createSprint.isPending}
              onClick={() => createSprint.mutate()}
            >
              Buat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!completeId}
        onOpenChange={(o) => {
          if (!o) {
            setCompleteId(null);
            setCompleteNote("");
          }
        }}
      >
        <AlertDialogContent>
          {(() => {
            const unfinishedCount = completeId
              ? tasks.filter(
                  (t) =>
                    t.sprintId === completeId &&
                    !["done", "completed"].includes(t.status),
                ).length
              : 0;
            const noteRequired = unfinishedCount > 0;
            const noteMissing = noteRequired && !completeNote.trim();
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Selesaikan sprint?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tugas yang belum selesai akan TETAP berada di sprint ini pada
                    posisinya dan ditandai belum selesai.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {noteRequired ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-amber-700">
                      Masih ada {unfinishedCount} tugas yang belum selesai.
                      Mohon isi alasan menyelesaikan sprint.
                    </p>
                    <Textarea
                      value={completeNote}
                      onChange={(e) => setCompleteNote(e.target.value)}
                      placeholder="Alasan menyelesaikan sprint meski masih ada tugas yang belum selesai…"
                      rows={3}
                    />
                  </div>
                ) : null}
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={noteMissing || complete.isPending}
                    onClick={(e) => {
                      if (!completeId) return;
                      if (noteMissing) {
                        e.preventDefault();
                        return;
                      }
                      complete.mutate({
                        sprintId: completeId,
                        completionNote: completeNote.trim() || undefined,
                      });
                    }}
                  >
                    Selesaikan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!cancelId}
        onOpenChange={(o) => !o && setCancelId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan sprint?</AlertDialogTitle>
            <AlertDialogDescription>
              Sprint akan ditandai sebagai Cancelled. Semua task dikembalikan ke backlog. Sprint tetap tercatat di riwayat dan bisa dibuka kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 text-white hover:bg-orange-700"
              onClick={() => cancelId && cancelSprint.mutate(cancelId)}
            >
              Ya, batalkan sprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus sprint?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak bisa dibatalkan. Pastikan tidak ada ketergantungan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && removeSprint.mutate(deleteId)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sprint detail modal */}
      {(() => {
        const sprint = sprints.find((s) => s.id === detailSprintId);
        if (!sprint) return null;
        const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
        const done = sprintTasks.filter((t) =>
          ["done", "completed"].includes(t.status),
        ).length;
        const pct = sprintTasks.length > 0 ? Math.round((done / sprintTasks.length) * 100) : 0;

        const grouped: Record<string, TaskRow[]> = {};
        for (const t of sprintTasks) {
          const col = t.status;
          if (!grouped[col]) grouped[col] = [];
          grouped[col].push(t);
        }
        const orderedStatuses = [
          "backlog","todo","in_progress","awaiting_approval","on_check",
          "need_revision","completed","on_hold","cancelled","done","review","in_review",
        ];
        const sortedGroups = Object.entries(grouped).sort(
          ([a], [b]) =>
            (orderedStatuses.indexOf(a) === -1 ? 99 : orderedStatuses.indexOf(a)) -
            (orderedStatuses.indexOf(b) === -1 ? 99 : orderedStatuses.indexOf(b)),
        );

        return (
          <Dialog
            open={!!detailSprintId}
            onOpenChange={(o) => !o && setDetailSprintId(null)}
          >
            <DialogContent showCloseButton className="w-[92vw] max-w-[92vw] sm:w-[60vw] sm:max-w-[60vw] h-[85vh] max-h-[85vh] sm:h-[70vh] sm:max-h-[70vh] flex flex-col gap-0 p-0">
              <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {sprint.status === "PLANNING"
                      ? "Planning"
                      : sprint.status === "ACTIVE"
                        ? "Active"
                        : sprint.status === "ON_HOLD"
                          ? "On Hold"
                          : sprint.status === "CANCELLED"
                            ? "Cancelled"
                            : "Completed"}
                  </Badge>
                  <DialogTitle className="text-lg">{sprint.name}</DialogTitle>
                </div>
                {sprint.goal && (
                  <DialogDescription className="mt-1 italic">
                    &ldquo;{sprint.goal}&rdquo;
                  </DialogDescription>
                )}
                <div className="mt-2 text-xs text-zinc-500 flex flex-wrap gap-3">
                  {sprint.startDate && (
                    <span>Mulai: {format(new Date(sprint.startDate), "d MMM yyyy")}</span>
                  )}
                  {sprint.endDate && (
                    <span>Selesai: {format(new Date(sprint.endDate), "d MMM yyyy")}</span>
                  )}
                  <span>{sprintTasks.length} tugas · {done} selesai ({pct}%)</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {sprintTasks.length === 0 ? (
                  <p className="text-center text-sm text-zinc-500 py-8">
                    Belum ada tugas di sprint ini.
                  </p>
                ) : (
                  sortedGroups.map(([status, groupTasks]) => (
                    <div key={status}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          {TASK_STATUS_LABELS[status] ?? status}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {groupTasks.length}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {groupTasks.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="w-full text-left rounded-lg border border-zinc-200 bg-white px-3 py-2.5 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                            onClick={() => {
                              setDetailTaskId(t.id);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                                {t.project && t.taskNumber
                                  ? `${t.project.code}-${t.taskNumber}`
                                  : t.id.slice(0, 8)}
                              </span>
                              <span className="text-sm font-medium group-hover:text-blue-600 truncate flex-1">
                                {t.title}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {t.priority && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] capitalize"
                                  >
                                    {t.priority}
                                  </Badge>
                                )}
                                {t.type && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] capitalize"
                                  >
                                    {t.type.replace(/_/g, " ")}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {t.assignees.length > 0 && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-[10px] text-zinc-400">
                                  {t.assignees
                                    .map((a) => a.user.name)
                                    .join(", ")}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <DialogFooter className="mx-0 mb-0 px-6 py-3 gap-2 shrink-0" showCloseButton={false}>
                {!readOnly &&
                  (sprint.status === "PLANNING" || sprint.status === "ON_HOLD") && (
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                      activate.mutate(sprint.id);
                      setDetailSprintId(null);
                    }}
                  >
                    {sprint.status === "ON_HOLD" ? "Resume sprint" : "Start sprint"}
                  </Button>
                )}
                {!readOnly && sprint.status === "ACTIVE" && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => {
                      hold.mutate(sprint.id);
                      setDetailSprintId(null);
                    }}
                  >
                    Pause sprint
                  </Button>
                )}
                {!readOnly && sprint.status === "ACTIVE" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    type="button"
                    onClick={() => {
                      setCompleteId(sprint.id);
                      setDetailSprintId(null);
                    }}
                  >
                    Complete sprint
                  </Button>
                )}
                {!readOnly &&
                  (sprint.status === "PLANNING" ||
                    sprint.status === "ACTIVE" ||
                    sprint.status === "ON_HOLD") && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() => {
                      setCancelId(sprint.id);
                      setDetailSprintId(null);
                    }}
                  >
                    Cancel sprint
                  </Button>
                )}
                {!readOnly && (sprint.status === "COMPLETED" || sprint.status === "CANCELLED") && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      reopen.mutate(sprint.id);
                      setDetailSprintId(null);
                    }}
                  >
                    Reopen
                  </Button>
                )}
                {sprint.status !== "CANCELLED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      openPlanningFor(sprint.id);
                      setDetailSprintId(null);
                    }}
                  >
                    Planning
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setDetailSprintId(null)}
                >
                  Tutup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Task detail sheet (from sprint detail modal) */}
      <TaskDetailSheet
        taskId={detailTaskId}
        projectId={projectId}
        open={!!detailTaskId}
        onOpenChange={(o) => { if (!o) setDetailTaskId(null); }}
      />
    </div>
  );
}
