"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  FolderKanban,
  History,
  Pencil,
  Plus,
  ShieldCheck,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  activeSteps,
  calculateJourneyProgress,
  canCancelProject,
  canEditForm,
  canManageProject,
  canReviewForm,
  evaluateGate,
  formatCurrency,
  formatDate,
  formatDateTime,
  formFor,
  formsFor,
  pitchingsFor,
  rolesForPitching,
  tasksForStep,
  userById,
  workProgressForProject,
} from "@/lib/prototype/domain";
import {
  FORM_STATUS_LABEL,
  type Project,
  type StepKey,
  type StepForm,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  DataRow,
  EmptyState,
  FormStatusBadge,
  NativeSelect,
  PriorityBadge,
  ProgressBar,
  SectionCard,
  TaskStatusBadge,
  UserAvatar,
} from "../ui";
import { PitchingDialog, ProjectDialog } from "../dialogs";
import { FinanceFormDialog, RabFormDialog } from "../forms";

type StepTone = "done" | "active" | "attention" | "empty";

const STEP_LABEL: Record<StepKey, string> = {
  pitching: "Pitching",
  survey: "Survey",
  rab: "RAB",
  running: "Running",
  bast: "BAST",
  invoice: "Invoice",
};

const PHASE_GROUPS: {
  label: string;
  phase: "planning" | "running" | "finance";
  span: number;
}[] = [
  { label: "Planning", phase: "planning", span: 3 },
  { label: "Running", phase: "running", span: 1 },
  { label: "Finishing", phase: "finance", span: 2 },
];

const STEP_TONE_CLASS: Record<
  StepTone,
  { dot: string; text: string; pill: string }
> = {
  done: {
    dot: "bg-emerald-300",
    text: "text-emerald-100/90",
    pill: "",
  },
  active: {
    dot: "bg-sky-300",
    text: "text-white",
    pill: "bg-white/10 px-1.5 py-0.5 ring-1 ring-white/15",
  },
  attention: {
    dot: "bg-amber-300",
    text: "text-amber-100",
    pill: "bg-amber-300/15 px-1.5 py-0.5 ring-1 ring-amber-200/30",
  },
  empty: {
    dot: "bg-white/30",
    text: "text-white/50",
    pill: "",
  },
};

function getStepStatus(
  step: { key: StepKey; status: string },
  data: { completedData: boolean; needsAttention: boolean },
): StepTone {
  if (step.status === "completed" || data.completedData) return "done";
  if (step.status === "active") {
    return data.needsAttention ? "attention" : "active";
  }
  return "empty";
}

function ProjectStepper({
  projectId,
  onStepClick,
}: {
  projectId: string;
  onStepClick?: (stepKey: StepKey) => void;
}) {
  const store = usePrototypeStore();
  const steps = store.steps
    .filter((step) => step.projectId === projectId)
    .sort((a, b) => a.order - b.order);
  const pitchings = pitchingsFor(store, projectId);
  const winners = pitchings.filter((pitching) => pitching.status === "won").length;
  const runningTasks = tasksForStep(store, projectId, "running");
  const runningActive = runningTasks.filter(
    (task) => task.status !== "completed",
  ).length;
  const rabForm = formFor(store, projectId, "rab");
  const rabPayload = rabForm?.payload as
    | { items?: { qty: number; unitPrice: number }[] }
    | undefined;
  const rabTotal = (rabPayload?.items ?? []).reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );

  const formForStep = (key: StepKey): StepForm | undefined => {
    if (key === "survey" || key === "rab" || key === "bast" || key === "invoice") {
      return formFor(store, projectId, key);
    }
    return undefined;
  };

  const formText = (form: StepForm | undefined) =>
    form && form.status !== "unassigned"
      ? FORM_STATUS_LABEL[form.status]
      : "Belum ada PIC";

  const summaryFor = (stepKey: StepKey) => {
    const form = formForStep(stepKey);
    if (stepKey === "pitching") {
      return {
        full: `${winners} winner`,
        emptyValue: winners === 0,
        completedData: false,
        needsAttention: false,
      };
    }
    if (stepKey === "survey") {
      return {
        full: formText(form),
        emptyValue: !form || form.status === "unassigned",
        completedData: form?.status === "approved",
        needsAttention: !form?.assigneeId,
      };
    }
    if (stepKey === "rab") {
      return {
        full: formatCurrency(rabTotal),
        emptyValue: rabTotal <= 0,
        completedData: form?.status === "approved",
        needsAttention: rabTotal <= 0,
      };
    }
    if (stepKey === "running") {
      return {
        full: `${runningActive} aktif`,
        emptyValue: runningActive === 0,
        completedData: false,
        needsAttention: false,
      };
    }
    return {
      full: formText(form),
      emptyValue: !form?.assigneeId,
      completedData: form?.status === "submitted",
      needsAttention: !form?.assigneeId,
    };
  };

  const activePhase = steps.find((step) => step.status === "active")?.phase;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[760px]">
        <div className="mb-2 grid grid-cols-6">
          {PHASE_GROUPS.map((group) => {
            const isActive = activePhase === group.phase;
            return (
              <div
                key={group.label}
                className="px-1"
                style={{ gridColumn: `span ${group.span}` }}
              >
                <div
                  className={cn(
                    "pb-1 text-center text-[10px] font-semibold tracking-[0.08em] uppercase",
                    isActive ? "text-white" : "text-white/55",
                  )}
                >
                  {group.label}
                </div>
                <div
                  className={cn(
                    "h-px",
                    isActive ? "bg-white/40" : "bg-white/20",
                  )}
                />
              </div>
            );
          })}
        </div>

        <div className="relative grid grid-cols-6">
          {steps.slice(0, -1).map((step, index) => (
            <span
              key={`connector-${step.id}`}
              aria-hidden
              className={cn(
                "absolute top-[13px] h-0.5",
                step.status === "completed" ? "bg-white" : "bg-white/25",
              )}
              style={{
                left: `calc(${((index + 0.5) / steps.length) * 100}% + 14px)`,
                width: `calc(${(1 / steps.length) * 100}% - 28px)`,
              }}
            />
          ))}

          {steps.map((step) => {
            const summary = summaryFor(step.key);
            const done = step.status === "completed";
            const active = step.status === "active";
            const tone = getStepStatus(step, {
              completedData: summary.completedData,
              needsAttention:
                active && summary.needsAttention,
            });
            const toneClass = STEP_TONE_CLASS[tone];
            const textClass =
              summary.emptyValue && tone !== "attention"
                ? "text-white/50"
                : toneClass.text;
            const pillClass =
              tone === "active" || tone === "attention"
                ? toneClass.pill
                : "";

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepClick?.(step.key)}
                aria-current={active ? "step" : undefined}
                aria-label={`${STEP_LABEL[step.key]} — ${summary.full}`}
                title={summary.full}
                className="group relative z-10 flex w-full min-w-0 cursor-pointer flex-col items-center gap-1 rounded-lg px-1 pb-1 text-center transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-[11px] font-semibold",
                    done
                      ? "bg-white text-primary"
                      : active
                        ? "bg-white text-primary ring-4 ring-white/25"
                        : "border border-white/40 bg-white/10 text-white/70",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : step.order}
                </span>

                <span
                  className={cn(
                    "w-full truncate text-[11px] leading-tight",
                    active
                      ? "font-semibold text-white"
                      : done
                        ? "text-white/85"
                        : "text-white/65",
                  )}
                >
                  {STEP_LABEL[step.key]}
                </span>

                <span
                  className={cn(
                    "flex max-w-full min-w-0 items-center justify-center gap-1 text-[10px] leading-tight",
                    textClass,
                    pillClass,
                  )}
                  title={summary.full}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      toneClass.dot,
                    )}
                  />
                  <span className="truncate">{summary.full}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GatePanel({
  projectId,
  stepKey,
  onComplete,
}: {
  projectId: string;
  stepKey: StepKey;
  onComplete: () => void;
}) {
  const store = usePrototypeStore();
  const gate = evaluateGate(store, projectId, stepKey);
  const user = userById(store, store.currentUserId);
  const project = store.projects.find((item) => item.id === projectId);
  const canComplete = Boolean(
    user &&
      project &&
      (user.role === "admin" ||
        (user.role === "pm" && project.createdById === user.id)),
  );
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
        <ShieldCheck className="size-4" /> Syarat menyelesaikan step
      </div>
      <div className="space-y-1.5">
        {gate.requirements.map((requirement) => (
          <div key={requirement.label} className="flex items-center gap-2 text-xs">
            {requirement.met ? (
              <CheckCircle2 className="size-3.5 text-emerald-600" />
            ) : (
              <XCircle className="text-muted-foreground size-3.5" />
            )}
            <span className={requirement.met ? "text-foreground" : "text-muted-foreground"}>
              {requirement.label}
            </span>
          </div>
        ))}
      </div>
      {canComplete ? (
        <Button
          className="mt-3"
          size="sm"
          disabled={!gate.ready}
          onClick={() => {
            onComplete();
            toast.success("Step diselesaikan.");
          }}
        >
          Selesaikan step
        </Button>
      ) : (
        <p className="text-muted-foreground mt-3 text-xs">
          Hanya PM pemilik proyek atau Admin yang dapat menyelesaikan step.
        </p>
      )}
    </div>
  );
}

function AssignControl({
  form,
  label,
}: {
  form: StepForm;
  label: string;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [userId, setUserId] = useState(form.assigneeId ?? "");
  if (!currentUser) return null;
  const canAssign = currentUser.role === "admin" || currentUser.role === "manager";
  const candidates = store.users.filter((user) =>
    form.type === "survey" ? user.role === "assignee" : user.role === "finance",
  );
  if (form.assigneeId) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{label}:</span>
        <UserAvatar user={userById(store, form.assigneeId)} showName />
      </div>
    );
  }
  if (!canAssign) {
    return (
      <p className="text-muted-foreground text-xs">{label}: belum di-assign</p>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <NativeSelect value={userId} onChange={setUserId} className="h-8 w-[180px] text-xs">
        <option value="">Pilih {label.toLowerCase()}</option>
        {candidates.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </NativeSelect>
      <Button
        size="sm"
        variant="outline"
        disabled={!userId}
        onClick={() => {
          if (!userId) return;
          store.assignForm(form.id, userId);
          toast.success("Form di-assign.");
        }}
      >
        Assign
      </Button>
    </div>
  );
}

function PitchingStep({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const router = useRouter();
  const currentUser = userById(store, store.currentUserId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const pitchings = pitchingsFor(store, project.id);
  const canManage = currentUser && canManageProject(currentUser, project);
  const activePitchings = pitchings.filter((pitching) => pitching.status !== "lost");
  const history = pitchings.filter((pitching) => pitching.status === "lost");
  const canEditPitching = (pitchingId: string) =>
    rolesForPitching(store, pitchingId).every((role) => {
      const task = role.taskId
        ? store.tasks.find((item) => item.id === role.taskId)
        : undefined;
      return !task || task.archivedAt || task.status === "backlog";
    });

  const openPitchingInSimpro = (pitchingId: string) => {
    if (currentUser?.role === "finance") return;
    const pitchingTasks = store.tasks.filter(
      (task) => task.pitchingId === pitchingId && !task.archivedAt,
    );
    const task =
      pitchingTasks.find((item) => item.status !== "completed") ?? pitchingTasks[0];
    if (task) {
      router.push(`/projects/${project.id}/board?task=${task.id}`);
      return;
    }
    setEditingId(pitchingId);
    setDialogOpen(true);
  };

  if (!currentUser) return null;
  const canOpenSimpro = currentUser.role !== "finance";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Pitching</h3>
          <p className="text-muted-foreground text-xs">
            Jumlah bebas, multiple winners. Yang kalah masuk riwayat.
          </p>
        </div>
        <div className="flex gap-2">
          {canManage ? (
            <Button
              size="sm"
              onClick={() => {
                setEditingId(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-3.5" /> Pitching
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowHistory((value) => !value)}
          >
            <History className="size-3.5" /> Riwayat ({history.length})
          </Button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {activePitchings.length === 0 ? (
          <EmptyState icon={Trophy} title="Belum ada pitching" description="Tambahkan pitching untuk memulai." />
        ) : (
          activePitchings.map((pitching) => {
            const roles = rolesForPitching(store, pitching.id);
            return (
              <div
                key={pitching.id}
                role={canOpenSimpro ? "button" : undefined}
                tabIndex={canOpenSimpro ? 0 : undefined}
                onClick={canOpenSimpro ? () => openPitchingInSimpro(pitching.id) : undefined}
                onKeyDown={
                  canOpenSimpro
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openPitchingInSimpro(pitching.id);
                        }
                      }
                    : undefined
                }
                className={cn(
                  "rounded-xl border bg-card p-3 transition-colors",
                  canOpenSimpro &&
                    "hover:border-primary/40 focus-visible:ring-ring/50 cursor-pointer focus-visible:ring-3 focus-visible:outline-none",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-semibold">{pitching.title}</h4>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          pitching.status === "won"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {pitching.status === "won" ? "Won" : "Draft"}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {pitching.description || "Tanpa deskripsi."}
                    </p>
                  </div>
                  {canManage && pitching.status === "draft" ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Edit pitching"
                      disabled={!canEditPitching(pitching.id)}
                      title={
                        canEditPitching(pitching.id)
                          ? "Edit pitching"
                          : "Tidak bisa diedit setelah task keluar dari Backlog"
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingId(pitching.id);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  ) : null}
                </div>

                <div className="mt-3 space-y-1.5">
                  {roles.map((role) => {
                    const task = role.taskId
                      ? store.tasks.find((item) => item.id === role.taskId)
                      : undefined;
                    return (
                      <div key={role.id} className="flex items-center gap-2 text-xs">
                        <UserAvatar user={userById(store, role.requestedUserId)} size="sm" />
                        <span className="min-w-0 flex-1 truncate">{role.label}</span>
                        {task ? (
                          <>
                            <TaskStatusBadge status={task.status} />
                            {canOpenSimpro ? (
                              <Link
                                href={`/projects/${project.id}/board?task=${task.id}`}
                                onClick={(event) => event.stopPropagation()}
                                className="text-primary text-[10px]"
                              >
                                {task.code}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">
                                {task.code}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Tanpa task</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {canManage && pitching.status === "draft" ? (
                  <div className="mt-3 flex gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        store.decidePitching(pitching.id, "won");
                        toast.success("Pitching ditandai menang.");
                      }}
                    >
                      <Trophy className="size-3.5" /> Menang
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        store.decidePitching(pitching.id, "lost");
                        toast.success("Pitching kalah dan task diarsipkan.");
                      }}
                    >
                      Kalah
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {showHistory ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Riwayat pitching kalah
          </h4>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-xs">Belum ada pitching kalah.</p>
          ) : (
            history.map((pitching) => {
              const lostTasks = store.tasks.filter(
                (task) => task.pitchingId === pitching.id && task.archivedAt,
              );
              return (
                <div
                  key={pitching.id}
                  className="rounded-lg border bg-muted/20 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <XCircle className="size-3.5 text-rose-500" />
                    <span className="min-w-0 flex-1 truncate">{pitching.title}</span>
                    <span className="text-muted-foreground">Lost</span>
                  </div>
                  {lostTasks.length > 0 ? (
                    <div className="mt-1 space-y-1 pl-5">
                      {lostTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-2 text-[10px]">
                          <span className="text-muted-foreground">{task.code}</span>
                          <span className="min-w-0 flex-1 truncate">{task.title}</span>
                          <TaskStatusBadge status={task.status} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}

      <GatePanel
        projectId={project.id}
        stepKey="pitching"
        onComplete={() => store.completeStep(project.id, "pitching")}
      />

      <PitchingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={project.id}
        pitching={editingId ? store.pitchings.find((item) => item.id === editingId) : undefined}
      />
    </div>
  );
}

function SurveyStep({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const form = formFor(store, project.id, "survey");
  if (!form) return null;
  return (
    <div className="space-y-4">
      <SectionCard
        title="Form Survey"
        description="Form berada di SIMPRO. PM melakukan review di sana."
        actions={
          <Link href="/forms" className="text-primary text-xs font-medium">
            Buka di SIMPRO
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AssignControl form={form} label="Assignee" />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Status:</span>
            <FormStatusBadge status={form.status} />
          </div>
          <DataRow label="Tanggal survey" value={"surveyDate" in form.payload ? formatDate(form.payload.surveyDate) : "—"} />
          <DataRow label="Lokasi" value={"location" in form.payload ? form.payload.location || "—" : "—"} />
          <DataRow label="Jumlah foto" value={`${form.photos?.length ?? 0} foto`} />
          <DataRow label="Submitted" value={formatDate(form.submittedAt)} />
        </div>
        {form.reviewComment ? (
          <p className="text-muted-foreground mt-2 rounded-lg bg-muted/40 p-2 text-xs">
            Review: {form.reviewComment}
          </p>
        ) : null}
      </SectionCard>
      <GatePanel
        projectId={project.id}
        stepKey="survey"
        onComplete={() => store.completeStep(project.id, "survey")}
      />
    </div>
  );
}

function RabStep({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const form = formFor(store, project.id, "rab");
  const currentUser = userById(store, store.currentUserId);
  const [open, setOpen] = useState(false);
  if (!form || !currentUser) return null;
  const editable = canEditForm(store, currentUser, form);
  const reviewer = canReviewForm(store, currentUser, form);
  const payload = form.payload as { items?: { qty: number; unitPrice: number }[] };
  const total = (payload.items ?? []).reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );
  return (
    <div className="space-y-4">
      <SectionCard
        title="Form RAB"
        description="Diisi Finance di CRM. PM review sebelum step selesai."
        actions={
          <Button size="sm" variant={editable || reviewer ? "default" : "outline"} onClick={() => setOpen(true)}>
            {editable ? "Isi RAB" : reviewer ? "Review RAB" : "Lihat RAB"}
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AssignControl form={form} label="Finance" />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Status:</span>
            <FormStatusBadge status={form.status} />
          </div>
          <DataRow label="Jumlah item" value={`${payload.items?.length ?? 0} item`} />
          <DataRow label="Total RAB" value={formatCurrency(total)} />
        </div>
        {form.reviewComment ? (
          <p className="text-muted-foreground mt-2 rounded-lg bg-muted/40 p-2 text-xs">
            Review: {form.reviewComment}
          </p>
        ) : null}
      </SectionCard>
      <GatePanel
        projectId={project.id}
        stepKey="rab"
        onComplete={() => store.completeStep(project.id, "rab")}
      />
      <RabFormDialog open={open} onOpenChange={setOpen} formId={form.id} />
    </div>
  );
}

function RunningStep({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const tasks = tasksForStep(store, project.id, "running");
  const active = tasks.filter((task) => task.status !== "completed");
  return (
    <div className="space-y-4">
      <SectionCard
        title="Running"
        description="Seluruh eksekusi dilakukan di SIMPRO. CRM hanya membaca."
        actions={
          <Link
            href={`/projects/${project.id}/board`}
            className="text-primary text-xs font-medium"
          >
            Buka Board SIMPRO
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <DataRow label="Total task" value={tasks.length} />
          <DataRow label="Selesai" value={tasks.filter((task) => task.status === "completed").length} />
          <DataRow label="Aktif" value={active.length} />
        </div>
        <div className="mt-3 space-y-1.5">
          {tasks.length === 0 ? (
            <EmptyState icon={Clock3} title="Belum ada task" description="PM dapat membuat task di board SIMPRO." />
          ) : (
            tasks.slice(0, 6).map((task) => (
              <div key={task.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                <span className="text-muted-foreground w-20 shrink-0">{task.code}</span>
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                <TaskStatusBadge status={task.status} />
                <UserAvatar user={userById(store, task.assigneeId)} size="sm" />
              </div>
            ))
          )}
        </div>
      </SectionCard>
      <GatePanel
        projectId={project.id}
        stepKey="running"
        onComplete={() => store.completeStep(project.id, "running")}
      />
    </div>
  );
}

function FinanceFormCard({
  project,
  keyName,
}: {
  project: Project;
  keyName: "bast" | "invoice";
}) {
  const store = usePrototypeStore();
  const form = formFor(store, project.id, keyName);
  const currentUser = userById(store, store.currentUserId);
  const [open, setOpen] = useState(false);
  if (!form || !currentUser) return null;
  const editable = canEditForm(store, currentUser, form);
  const payload = form.payload as {
    number?: string;
    amount?: number;
    taxAmount?: number;
  };
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="size-4 text-primary" />
            <h4 className="text-sm font-semibold">{keyName === "bast" ? "BAST" : "Invoice"}</h4>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {keyName === "bast" ? "Berita Acara Serah Terima" : "Tagihan proyek"}
          </p>
        </div>
        <FormStatusBadge status={form.status} />
      </div>
      <div className="mt-3 space-y-1">
        <DataRow label="Nomor" value={payload.number || "—"} />
        <DataRow label="Assignee" value={userById(store, form.assigneeId)?.name ?? "Belum di-assign"} />
        {keyName === "invoice" ? (
          <DataRow
            label="Total"
            value={formatCurrency((payload.amount ?? 0) + (payload.taxAmount ?? 0))}
          />
        ) : null}
        <DataRow label="Submitted" value={formatDate(form.submittedAt)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AssignControl form={form} label={keyName === "bast" ? "Finance BAST" : "Finance Invoice"} />
        <Button size="sm" variant={editable ? "default" : "outline"} onClick={() => setOpen(true)}>
          {editable ? "Isi / Edit" : "Lihat"}
        </Button>
      </div>
      <FinanceFormDialog open={open} onOpenChange={setOpen} formId={form.id} />
    </div>
  );
}

function FinanceStep({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const bast = formFor(store, project.id, "bast");
  const invoice = formFor(store, project.id, "invoice");
  const nonFinanceDone = store.steps
    .filter((step) => step.projectId === project.id && step.phase !== "finance")
    .every((step) => step.status === "completed");
  const ready = Boolean(
    nonFinanceDone &&
      bast?.status === "submitted" &&
      invoice?.status === "submitted" &&
      project.status === "active",
  );
  const canComplete = currentUser?.role === "admin" || (currentUser?.role === "pm" && project.createdById === currentUser.id);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <FinanceFormCard project={project} keyName="bast" />
        <FinanceFormCard project={project} keyName="invoice" />
      </div>
      <div className="rounded-xl border bg-muted/20 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
          <ShieldCheck className="size-4" /> Kelengkapan Finance
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            {bast?.status === "submitted" ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Circle className="text-muted-foreground size-3.5" />}
            BAST submitted
          </div>
          <div className="flex items-center gap-2">
            {invoice?.status === "submitted" ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Circle className="text-muted-foreground size-3.5" />}
            Invoice submitted
          </div>
          <div className="flex items-center gap-2">
            {nonFinanceDone ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Circle className="text-muted-foreground size-3.5" />}
            Step sebelumnya selesai
          </div>
        </div>
        {canComplete ? (
          <Button
            className="mt-3"
            size="sm"
            disabled={!ready}
            onClick={() => {
              store.completeProject(project.id);
              toast.success("Proyek ditandai selesai.");
            }}
          >
            <CheckCircle2 className="size-3.5" /> Selesaikan proyek
          </Button>
        ) : (
          <p className="text-muted-foreground mt-2 text-xs">Hanya PM/Admin yang dapat menutup proyek.</p>
        )}
      </div>
    </div>
  );
}

function CompletedSummary({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const forms = formsFor(store, project.id);
  const journey = calculateJourneyProgress(store, project.id);
  return (
    <SectionCard title="Proyek selesai" description="Seluruh journey dan form finance sudah lengkap.">
      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
        <CheckCircle2 className="size-8" />
        <div>
          <p className="text-sm font-semibold">Journey {journey}%</p>
          <p className="text-xs">
            Selesai {formatDate(project.actualEndDate)} · {forms.length} form tersimpan
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

export function CrmProjectDetail({ projectId }: { projectId: string }) {
  const store = usePrototypeStore();
  const project = store.projects.find((item) => item.id === projectId);
  const currentUser = userById(store, store.currentUserId);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (!project || !currentUser) {
    return <EmptyState icon={FolderKanban} title="Proyek tidak ditemukan" description="Proyek mungkin tidak ada atau bukan milik Anda." />;
  }

  if (currentUser.role === "pm" && project.createdById !== currentUser.id) {
    return <EmptyState icon={ShieldCheck} title="Akses ditolak" description="PM hanya dapat membuka proyek miliknya." />;
  }

  const active = activeSteps(store, project.id);
  const activeKeys = new Set(active.map((step) => step.key));
  const journey = calculateJourneyProgress(store, project.id);
  const work = workProgressForProject(store, project.id);
  const phase = active[0]?.phase;
  const group = project.groupId
    ? store.groups.find((item) => item.id === project.groupId)
    : undefined;
  const canManage = canManageProject(currentUser, project);
  const canCancel = canCancelProject(currentUser, project);

  const stepContent = (() => {
    if (project.status === "completed") return <CompletedSummary project={project} />;
    if (project.status === "cancelled") {
      return (
        <SectionCard title="Proyek dibatalkan" description={project.cancelReason}>
          <EmptyState icon={XCircle} title="Proyek dihentikan" description="Tidak ada aksi lanjutan untuk proyek cancelled." />
        </SectionCard>
      );
    }
    if (activeKeys.has("bast") || activeKeys.has("invoice")) {
      return <FinanceStep project={project} />;
    }
    if (activeKeys.has("pitching")) return <PitchingStep project={project} />;
    if (activeKeys.has("survey")) return <SurveyStep project={project} />;
    if (activeKeys.has("rab")) return <RabStep project={project} />;
    if (activeKeys.has("running")) return <RunningStep project={project} />;
    return <EmptyState icon={Clock3} title="Tidak ada step aktif" />;
  })();

  return (
    <div className="space-y-5">
      <Link href="/crm/projects" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs">
        <ArrowLeft className="size-3.5" /> Kembali ke projects
      </Link>

      <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-foreground/10">
        <div
          className="relative p-5 text-white"
          style={{
            background: `linear-gradient(135deg, ${project.coverColor}, ${project.coverColor}cc)`,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-white/25">
                  {project.code}
                </span>
                <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-white/25">
                  {project.status}
                </span>
                {phase ? (
                  <span className="rounded-md bg-violet-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-white/25">
                    {phase}
                  </span>
                ) : null}
                <PriorityBadge priority={project.priority} />
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{project.name}</h1>
              <p className="mt-1 text-sm text-white/75">
                {project.client || "Tanpa klien"} · PM {userById(store, project.createdById)?.name ?? "—"}
              </p>
              {group ? (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/70">
                  <FolderKanban className="size-3.5" /> {group.name}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage ? (
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
              ) : null}
              {canCancel && project.status === "active" ? (
                <Button variant="secondary" size="sm" onClick={() => setCancelOpen(true)}>
                  Batalkan
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-white/70">Journey</span>
                <span className="font-semibold">{journey}%</span>
              </div>
              <ProgressBar value={journey} className="bg-white/20" tone="bg-white" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-white/70">Work step aktif</span>
                <span className="font-semibold">{work}%</span>
              </div>
              <ProgressBar value={work} className="bg-white/20" tone="bg-sky-300" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-white/70">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" /> {formatDate(project.startDate)} → {formatDate(project.targetEndDate)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" /> {group ? `Group ${group.name}` : "Tanpa group"}
            </span>
          </div>

          <div className="mt-5 border-t border-white/15 pt-4">
            <ProjectStepper projectId={project.id} />
          </div>
        </div>
      </div>

      {stepContent}

      <SectionCard title="Activity log" description="Riwayat perubahan pada proyek ini.">
        <div className="space-y-2">
          {store.activityLogs
            .filter((entry) => entry.projectId === project.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 8)
            .map((entry) => (
              <div key={entry.id} className="flex gap-2 text-xs">
                <span className="bg-primary mt-1 size-1.5 shrink-0 rounded-full" />
                <span>
                  {entry.message}{" "}
                  <span className="text-muted-foreground">
                    · {formatDateTime(entry.createdAt)} ·{" "}
                    {userById(store, entry.actorId)?.name ?? "User"}
                  </span>
                </span>
              </div>
            ))}
          {store.activityLogs.filter((entry) => entry.projectId === project.id).length === 0 ? (
            <p className="text-muted-foreground text-xs">Belum ada aktivitas.</p>
          ) : null}
        </div>
      </SectionCard>

      <ProjectDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan proyek?</DialogTitle>
            <DialogDescription>
              Proyek akan berhenti di step saat ini. Tindakan ini tidak dapat dibuka kembali di MVP.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            rows={3}
            placeholder="Alasan pembatalan (wajib)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim()}
              onClick={() => {
                store.cancelProject(project.id, cancelReason.trim());
                setCancelOpen(false);
                toast.success("Proyek dibatalkan.");
              }}
            >
              Batalkan proyek
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
