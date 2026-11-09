"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FolderKanban,
  History,
  Pencil,
  Plus,
  ShieldCheck,
  Trophy,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  canApproveGate,
  canCancelProject,
  canCreateFormEntry,
  canEditForm,
  canManageProject,
  evaluateGate,
  formatCurrency,
  formatDate,
  formatDateTime,
  formEntriesForStep,
  formEntryProgress,
  formFor,
  formLabel,
  formsFor,
  operationalAssigneeCandidates,
  pitchingsFor,
  rolesForPitching,
  tasksForStep,
  userById,
  workProgressForProject,
} from "@/lib/prototype/domain";
import {
  FORM_ENTRY_STATUS_LABEL,
  FORM_STATUS_LABEL,
  GATE_KIND_LABEL,
  LIFECYCLE_LABEL,
  PHASE_HINT,
  PHASE_LABEL,
  type FormEntry,
  type Phase,
  type Project,
  type ProjectStep,
  type StepForm,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  missingPhaseTooltip,
  phaseStageCounts,
  phaseTransitionBanner,
  phasesPresent,
} from "@/lib/prototype/stepper";
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
import { PitchingDialog, ProjectDialog, TaskDialog } from "../dialogs";
import { ProjectStepHistory } from "./project-history";
import { hasUnsavedFormChanges, StepFormPanel } from "./step-form-panel";

type StepTone = "done" | "active" | "attention" | "empty";

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
  step: { status: string },
  data: { completedData: boolean; needsAttention: boolean },
): StepTone {
  if (step.status === "skipped") return "empty";
  if (step.status === "completed" || data.completedData) return "done";
  if (step.status === "active") {
    return data.needsAttention ? "attention" : "active";
  }
  return "empty";
}

function stageSummary(
  store: ReturnType<typeof usePrototypeStore.getState>,
  projectId: string,
  step: ProjectStep,
): {
  full: string;
  emptyValue: boolean;
  completedData: boolean;
  needsAttention: boolean;
} {
  if (step.status === "completed") {
    return {
      full: "Selesai",
      emptyValue: false,
      completedData: true,
      needsAttention: false,
    };
  }
  if (step.status === "pending") {
    return {
      full: "Belum dimulai",
      emptyValue: true,
      completedData: false,
      needsAttention: false,
    };
  }
  if (step.kind === "gate") {
    return {
      full: step.gateDecision
        ? step.gateDecision.decision === "approved"
          ? "Disetujui"
          : "Ditolak"
        : "Menunggu keputusan",
      emptyValue: !step.gateDecision,
      completedData: step.gateDecision?.decision === "approved",
      needsAttention: !step.gateDecision,
    };
  }
  if (step.kind === "finance_form") {
    const form = step.financeKind ? formFor(store, projectId, step.financeKind) : undefined;
    const text =
      form && form.status !== "unassigned"
        ? FORM_STATUS_LABEL[form.status]
        : "Belum ada PIC";
    return {
      full: text,
      emptyValue: !form || form.status === "unassigned",
      completedData: form?.status === "approved" || form?.status === "submitted",
      needsAttention: !form?.assigneeId,
    };
  }
  if (step.kind === "form") {
    if (step.legacyKey === "survey" && !step.formTemplate) {
      const form = formFor(store, projectId, "survey");
      const text =
        form && form.status !== "unassigned"
          ? FORM_STATUS_LABEL[form.status]
          : "Belum ada PIC";
      return {
        full: text,
        emptyValue: !form || form.status === "unassigned",
        completedData: form?.status === "approved",
        needsAttention: !form?.assigneeId,
      };
    }
    const progress = formEntryProgress(store, projectId, step.key);
    return {
      full:
        progress.total === 0
          ? "Belum ada entri"
          : `${progress.approved}/${progress.total} disetujui`,
      emptyValue: progress.total === 0,
      completedData: progress.total > 0 && progress.approved === progress.total,
      needsAttention: progress.total === 0 || progress.approved < progress.total,
    };
  }
  if (step.legacyKey === "pitching") {
    const winners = pitchingsFor(store, projectId).filter(
      (pitching) => pitching.status === "won",
    ).length;
    return {
      full: `${winners} winner`,
      emptyValue: winners === 0,
      completedData: false,
      needsAttention: false,
    };
  }
  const tasks = tasksForStep(store, projectId, step.key);
  const active = tasks.filter((task) => task.status !== "completed").length;
  return {
    full: tasks.length === 0 ? "Belum ada task" : `${active} aktif`,
    emptyValue: tasks.length === 0,
    completedData: tasks.length > 0 && active === 0,
    needsAttention: active > 0,
  };
}

function ProjectStepper({
  projectId,
  selectedStepKey,
  selectedPhase,
  onPhaseClick,
  onStepClick,
  panelId,
}: {
  projectId: string;
  selectedStepKey: string;
  selectedPhase: Phase;
  onPhaseClick: (phase: Phase) => void;
  onStepClick?: (stepKey: string) => void;
  panelId: string;
}) {
  const store = usePrototypeStore();
  const steps = store.steps
    .filter((step) => step.projectId === projectId)
    .sort((a, b) => a.order - b.order);
  const phases = phasesPresent(steps);
  const counts = phaseStageCounts(steps);
  const activePhase = steps.find((step) => step.status === "active")?.phase;
  const effectivePhase = phases.includes(selectedPhase)
    ? selectedPhase
    : activePhase ?? phases[0];
  const phaseSteps = effectivePhase
    ? steps.filter((step) => step.phase === effectivePhase)
    : [];
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const phaseRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const moveFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % phaseSteps.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + phaseSteps.length) % phaseSteps.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = phaseSteps.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const nextStep = phaseSteps[nextIndex];
    tabRefs.current[nextStep.key]?.focus();
    if (nextStep.status !== "pending") {
      onStepClick?.(nextStep.key);
    }
  };

  const movePhaseFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (phases.length === 0) return;
    let nextIndex = index;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % phases.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + phases.length) % phases.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = phases.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const nextPhase = phases[nextIndex];
    phaseRefs.current[nextPhase]?.focus();
    onPhaseClick(nextPhase);
  };

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label={`Fase proyek: ${phases
          .map((phase) => PHASE_LABEL[phase])
          .join(", ")}`}
        className="flex gap-1.5 overflow-x-auto pb-1"
      >
        {phases.map((phase, index) => {
          const isActive = activePhase === phase;
          const selected = effectivePhase === phase;
          return (
            <button
              key={phase}
              ref={(node) => {
                phaseRefs.current[phase] = node;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-current={isActive ? "step" : undefined}
              tabIndex={selected ? 0 : -1}
              title={PHASE_HINT[phase]}
              onClick={() => onPhaseClick(phase)}
              onKeyDown={(event) => movePhaseFocus(event, index)}
              style={{
                flexGrow: counts[phase] ?? 1,
                flexBasis: 0,
              }}
              className={cn(
                "min-w-[110px] rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none",
                selected ? "bg-white/15" : "hover:bg-white/10",
              )}
            >
              <span
                className={cn(
                  "block text-[10px] font-semibold tracking-[0.08em] uppercase",
                  isActive ? "text-white" : "text-white/60",
                )}
              >
                {PHASE_LABEL[phase]}
              </span>
              <span className="block truncate text-[10px] text-white/50">
                {isActive
                  ? "Sedang berjalan"
                  : `${counts[phase] ?? 0} tahap`}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tablist"
        aria-label={`Tahap fase ${
          PHASE_LABEL[effectivePhase ?? "prospek"]
        }`}
        className="relative flex gap-2 overflow-x-auto pb-2"
      >
        {phaseSteps.map((step, index) => {
          const done = step.status === "completed";
          const active = step.status === "active";
          const skipped = step.status === "skipped";
          const pending = step.status === "pending";
          const selected = selectedStepKey === step.key;
          const summary = skipped
            ? {
                full: "Tidak digunakan",
                emptyValue: false,
                completedData: false,
                needsAttention: false,
              }
            : stageSummary(store, projectId, step);
          const tone = getStepStatus(step, {
            completedData: summary.completedData,
            needsAttention: active && summary.needsAttention,
          });
          const toneClass = STEP_TONE_CLASS[tone];
          const textClass =
            summary.emptyValue && tone !== "attention"
              ? "text-white/50"
              : toneClass.text;
          const pillClass =
            tone === "active" || tone === "attention" ? toneClass.pill : "";

          return (
            <button
              key={step.id}
              ref={(node) => {
                tabRefs.current[step.key] = node;
              }}
              type="button"
              id={`step-tab-${step.key}`}
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              aria-disabled={pending || undefined}
              aria-current={active ? "step" : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                if (!pending) onStepClick?.(step.key);
              }}
              onKeyDown={(event) => moveFocus(event, index)}
              aria-label={
                pending ? `${step.name} — Belum dimulai` : `${step.name} — ${summary.full}`
              }
              title={pending ? "Belum dimulai" : summary.full}
              className={cn(
                "group relative z-10 flex w-[112px] shrink-0 flex-col items-center gap-1 rounded-lg px-1 pb-1 text-center transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none",
                pending ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                selected && "bg-white/10",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-[11px] font-semibold",
                  done
                    ? "bg-white text-primary"
                    : active
                      ? "bg-white text-primary ring-4 ring-white/25"
                      : skipped
                        ? "border border-dashed border-white/60 bg-white/10 text-white/80"
                        : "border border-white/40 bg-white/10 text-white/70",
                )}
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : skipped ? (
                  <span className="text-[10px]">–</span>
                ) : (
                  step.order
                )}
              </span>

              <span
                className={cn(
                  "w-full truncate text-[11px] leading-tight",
                  active
                    ? "font-semibold text-white"
                    : done
                      ? "text-white/85"
                      : pending
                        ? "text-white/55"
                        : "text-white/70",
                )}
              >
                {step.name}
              </span>

              {step.costBeforeCommitment ? (
                <span className="rounded bg-amber-300/20 px-1 text-[9px] text-amber-100">
                  Berbiaya
                </span>
              ) : null}

              <span
                className={cn(
                  "flex max-w-full min-w-0 items-center justify-center gap-1 text-[10px] leading-tight",
                  textClass,
                  pillClass,
                )}
                title={summary.full}
              >
                <span className={cn("size-1.5 shrink-0 rounded-full", toneClass.dot)} />
                <span className="truncate">{summary.full}</span>
              </span>
            </button>
          );
        })}
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
  stepKey: string;
  onComplete: () => void;
}) {
  const store = usePrototypeStore();
  const gate = evaluateGate(store, projectId, stepKey);
  const user = userById(store, store.currentUserId);
  const project = store.projects.find((item) => item.id === projectId);
  const canComplete = Boolean(user && project && canManageProject(user, project));
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
        <ShieldCheck className="size-4" /> Syarat menyelesaikan tahap
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
            toast.success("Tahap diselesaikan.");
          }}
        >
          Selesaikan tahap
        </Button>
      ) : (
        <p className="text-muted-foreground mt-3 text-xs">
          Hanya PM pemilik proyek atau Admin yang dapat menyelesaikan tahap.
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

function PitchingStep({
  project,
  readOnly = false,
}: {
  project: Project;
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const router = useRouter();
  const currentUser = userById(store, store.currentUserId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const pitchings = pitchingsFor(store, project.id);
  const canManage = currentUser && canManageProject(currentUser, project);
  const canAssign =
    currentUser &&
    operationalAssigneeCandidates(store, currentUser, project).length > 0;
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
          {canManage && !readOnly ? (
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
                  {canManage && !readOnly && pitching.status === "draft" ? (
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
                            {canAssign && task.status !== "completed" ? (
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setTaskId(task.id);
                                  setTaskDialogOpen(true);
                                }}
                              >
                                Assign
                              </Button>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Tanpa task</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {canManage && !readOnly && pitching.status === "draft" ? (
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

      {!readOnly ? (
        <GatePanel
          projectId={project.id}
          stepKey="pitching"
          onComplete={() => store.completeStep(project.id, "pitching")}
        />
      ) : null}

      <PitchingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={project.id}
        pitching={editingId ? store.pitchings.find((item) => item.id === editingId) : undefined}
      />
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projectId={project.id}
        taskId={taskId}
        stepKey="pitching"
      />
    </div>
  );
}

function SurveyStep({
  project,
  readOnly = false,
}: {
  project: Project;
  readOnly?: boolean;
}) {
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
          {!readOnly ? (
            <AssignControl form={form} label="Assignee" />
          ) : null}
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
      {!readOnly ? (
        <GatePanel
          projectId={project.id}
          stepKey="survey"
          onComplete={() => store.completeStep(project.id, "survey")}
        />
      ) : null}
    </div>
  );
}

function FinanceFormSummary({
  project,
  formKey,
  readOnly = false,
}: {
  project: Project;
  formKey: "rab" | "bast" | "invoice" | "payment";
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const form = formFor(store, project.id, formKey);
  const [panelMode, setPanelMode] = useState<"review" | "history" | null>(null);
  if (!form || !currentUser) return null;

  const editable =
    !readOnly &&
    canEditForm(store, currentUser, form) &&
    form.status !== "submitted" &&
    form.status !== "approved";
  const href = `/crm/projects/${project.id}/forms/${formKey}`;
  const rabItems =
    formKey === "rab"
      ? ((form.payload as { items?: { qty: number; unitPrice: number }[] })
          .items ?? [])
      : [];
  const rabTotal = rabItems.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );

  return (
    <div className="space-y-3">
      <div className="bg-card ring-foreground/10 rounded-xl p-4 shadow-sm ring-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{formLabel(formKey)}</h3>
              <FormStatusBadge status={form.status} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Assignee {userById(store, form.assigneeId)?.name ?? "Belum di-assign"}
              {form.updatedAt
                ? ` · Terakhir diubah ${formatDateTime(form.updatedAt)}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={href}>
              <Button size="sm" variant={editable ? "default" : "outline"}>
                {editable ? "Buka form" : "Lihat form"}
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPanelMode("review")}
            >
              Review
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPanelMode("history")}
            >
              History
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          {formKey === "rab" ? (
            <DataRow label="Total RAB" value={formatCurrency(rabTotal)} />
          ) : null}
          <DataRow label="Submitted" value={formatDate(form.submittedAt)} />
          <DataRow
            label="Review terakhir"
            value={form.reviewComment || "—"}
          />
        </div>
      </div>

      {panelMode ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold">
              {panelMode === "review" ? "Review form" : "History form"}
            </h4>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setPanelMode(null)}
            >
              Tutup
            </Button>
          </div>
          <StepFormPanel
            key={panelMode}
            project={project}
            formKey={formKey}
            initialMode={panelMode}
            hideFill
            hideModeTabs
          />
        </div>
      ) : null}
    </div>
  );
}

function RabStep({
  project,
  readOnly = false,
}: {
  project: Project;
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  return (
    <div className="space-y-4">
      <FinanceFormSummary
        project={project}
        formKey="rab"
        readOnly={readOnly}
      />
      {!readOnly ? (
        <GatePanel
          projectId={project.id}
          stepKey="rab"
          onComplete={() => store.completeStep(project.id, "rab")}
        />
      ) : null}
    </div>
  );
}

function RunningStep({
  project,
  readOnly = false,
}: {
  project: Project;
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const tasks = tasksForStep(store, project.id, "running");
  const active = tasks.filter((task) => task.status !== "completed");
  const canAssign =
    currentUser &&
    operationalAssigneeCandidates(store, currentUser, project).length > 0;
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
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
                {canAssign && task.status !== "completed" ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setTaskId(task.id);
                      setTaskDialogOpen(true);
                    }}
                  >
                    Assign
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </SectionCard>
      {!readOnly ? (
        <GatePanel
          projectId={project.id}
          stepKey="running"
          onComplete={() => store.completeStep(project.id, "running")}
        />
      ) : null}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projectId={project.id}
        taskId={taskId}
        stepKey="running"
      />
    </div>
  );
}

function FinanceStep({
  project,
  step,
  readOnly = false,
}: {
  project: Project;
  step: ProjectStep;
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const formKey =
    step.financeKind === "payment"
      ? "payment"
      : step.financeKind === "invoice"
        ? "invoice"
        : "bast";
  return (
    <div className="space-y-4">
      <FinanceFormSummary
        key={formKey}
        project={project}
        formKey={formKey}
        readOnly={readOnly}
      />
      {!readOnly ? (
        <GatePanel
          projectId={project.id}
          stepKey={step.key}
          onComplete={() => store.completeStep(project.id, step.key)}
        />
      ) : null}
    </div>
  );
}

function EntryAssignControl({
  entry,
  onDone,
}: {
  entry: FormEntry;
  onDone: () => void;
}) {
  const store = usePrototypeStore();
  const [userId, setUserId] = useState(entry.assigneeId ?? "");
  const currentUser = userById(store, store.currentUserId);
  const project = store.projects.find((item) => item.id === entry.projectId);
  const candidates = currentUser
    ? operationalAssigneeCandidates(store, currentUser, project)
    : [];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <NativeSelect
        value={userId}
        onChange={setUserId}
        className="h-7 w-[150px] text-[11px]"
      >
        <option value="">Pilih assignee</option>
        {candidates.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </NativeSelect>
      <Button
        size="xs"
        variant="outline"
        disabled={!userId}
        onClick={() => {
          if (!userId) return;
          store.assignFormEntry(entry.id, userId);
          toast.success("Entri form di-assign.");
          onDone();
        }}
      >
        Assign
      </Button>
    </div>
  );
}

function FormStagePanel({
  project,
  step,
  readOnly = false,
}: {
  project: Project;
  step: ProjectStep;
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const router = useRouter();
  const currentUser = userById(store, store.currentUserId);
  const entries = formEntriesForStep(store, project.id, step.key);
  const progress = formEntryProgress(store, project.id, step.key);
  const canCreate = Boolean(
    currentUser &&
      !readOnly &&
      canCreateFormEntry(store, currentUser, project, step.key),
  );
  const canAssign =
    currentUser &&
    operationalAssigneeCandidates(store, currentUser, project).length > 0;
  const canManage = Boolean(currentUser && canManageProject(currentUser, project));
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  return (
    <div className="space-y-4">
      <SectionCard
        title={step.name}
        description={
          step.description ||
          step.formTemplate?.title ||
          "Tahap form dengan satu template dan banyak entri."
        }
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" /> Buat entri
            </Button>
          ) : null
        }
      >
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">
              {progress.approved} dari {progress.total} disetujui
            </span>
          </div>
          <ProgressBar
            value={
              progress.total === 0
                ? 0
                : Math.round((progress.approved / progress.total) * 100)
            }
          />
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={Clock3}
            title="Belum ada entri"
            description="PM membuat entri, lalu Manager/Admin meng-assign ke assignee."
          />
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{entry.title}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {FORM_ENTRY_STATUS_LABEL[entry.status]}
                    {entry.dueDate ? ` · Tenggat ${formatDate(entry.dueDate)}` : ""}
                  </p>
                </div>
                <UserAvatar user={userById(store, entry.assigneeId)} size="sm" />
                {canAssign && entry.status === "unassigned" ? (
                  <EntryAssignControl
                    entry={entry}
                    onDone={() => undefined}
                  />
                ) : null}
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => router.push(`/forms?entry=${entry.id}`)}
                >
                  Buka
                </Button>
              </div>
            ))}
          </div>
        )}

        {canManage && entries.length === 0 && !step.noWorkConfirmedAt ? (
          <div className="mt-3 rounded-lg border border-dashed p-2">
            <p className="text-muted-foreground mb-2 text-[11px]">
              Tidak ada pekerjaan di tahap ini? Konfirmasi akan dicatat di audit trail.
            </p>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                store.confirmNoWork(project.id, step.key);
                toast.success("Konfirmasi tidak ada pekerjaan dicatat.");
              }}
            >
              Konfirmasi tidak ada pekerjaan
            </Button>
          </div>
        ) : null}
      </SectionCard>

      {!readOnly ? (
        <GatePanel
          projectId={project.id}
          stepKey={step.key}
          onComplete={() => store.completeStep(project.id, step.key)}
        />
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat entri form</DialogTitle>
            <DialogDescription>
              Entri dibuat tanpa assignee. Manager/Admin meng-assign setelahnya.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium" htmlFor="entry-title">
                Nama entri
              </label>
              <Input
                id="entry-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Contoh: Vendor A / Lokasi Jakarta"
              />
            </div>
            <div>
              <label className="text-xs font-medium" htmlFor="entry-due">
                Tenggat
              </label>
              <Input
                id="entry-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!title.trim()}
              onClick={() => {
                store.createFormEntry(project.id, step.key, {
                  title,
                  dueDate: dueDate
                    ? new Date(`${dueDate}T00:00:00`).toISOString()
                    : undefined,
                });
                setTitle("");
                setDueDate("");
                setCreateOpen(false);
                toast.success("Entri form dibuat.");
              }}
            >
              Buat entri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SimproStagePanel({
  project,
  step,
  readOnly = false,
}: {
  project: Project;
  step: ProjectStep;
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const tasks = tasksForStep(store, project.id, step.key);
  const active = tasks.filter((task) => task.status !== "completed").length;
  const canManage = Boolean(currentUser && canManageProject(currentUser, project));
  const canAssign =
    currentUser &&
    operationalAssigneeCandidates(store, currentUser, project).length > 0;
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const suggestions = step.tasks ?? [];

  return (
    <div className="space-y-4">
      <SectionCard
        title={step.name}
        description={
          step.description ||
          "Tahap SIMPRO dikerjakan lewat kartu task di board."
        }
        actions={
          <Link href={`/projects/${project.id}/board?stage=${step.key}`}>
            <Button size="sm" variant="outline">
              Buka Board
            </Button>
          </Link>
        }
      >
        {step.costBeforeCommitment ? (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            <ShieldCheck className="size-3.5 shrink-0" />
            Tahap berbiaya sebelum komitmen. Biaya tetap tercatat meski proyek kalah.
          </div>
        ) : null}
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <DataRow label="Total task" value={tasks.length} />
          <DataRow
            label="Selesai"
            value={tasks.filter((task) => task.status === "completed").length}
          />
          <DataRow label="Aktif" value={active} />
        </div>
        {tasks.length === 0 ? (
          <EmptyState
            icon={Clock3}
            title="Belum ada task"
            description="Buat task dari board atau dari template tahap."
          />
        ) : (
          <div className="space-y-1.5">
            {tasks.slice(0, 8).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground w-20 shrink-0">
                  {task.code}
                </span>
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                <TaskStatusBadge status={task.status} />
                <UserAvatar user={userById(store, task.assigneeId)} size="sm" />
                {canAssign && task.status !== "completed" ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setTaskId(task.id);
                      setTaskDialogOpen(true);
                    }}
                  >
                    Assign
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {suggestions.length > 0 && canManage ? (
        <SectionCard
          title="Task dari template"
          description="Task default adalah usulan, bukan dibuat otomatis."
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelected(suggestions.map((task) => task.id));
                setTemplateOpen(true);
              }}
            >
              Buat dari template
            </Button>
          }
        >
          <p className="text-muted-foreground text-xs">
            {suggestions.length} task default tersedia.
          </p>
        </SectionCard>
      ) : null}

      {!readOnly ? (
        <GatePanel
          projectId={project.id}
          stepKey={step.key}
          onComplete={() => store.completeStep(project.id, step.key)}
        />
      ) : null}

      {canManage && tasks.length === 0 && !step.noWorkConfirmedAt ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            store.confirmNoWork(project.id, step.key);
            toast.success("Konfirmasi tidak ada pekerjaan dicatat.");
          }}
        >
          Konfirmasi tidak ada pekerjaan
        </Button>
      ) : null}

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat task dari template</DialogTitle>
            <DialogDescription>
              Pilih task default yang ingin dibuat sebagai kartu Backlog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {suggestions.map((task) => (
              <label key={task.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={selected.includes(task.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, task.id]
                        : current.filter((id) => id !== task.id),
                    )
                  }
                />
                <span>{task.name}</span>
                {task.deliverable ? (
                  <span className="text-muted-foreground text-[10px]">
                    {task.deliverable}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={selected.length === 0}
              onClick={() => {
                const count = store.createTasksFromTemplate(
                  project.id,
                  step.key,
                  selected,
                );
                setTemplateOpen(false);
                toast.success(`${count} task dibuat dari template.`);
              }}
            >
              Buat task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projectId={project.id}
        taskId={taskId}
        stepKey={step.key}
      />
    </div>
  );
}

function GateStage({
  project,
  step,
  readOnly = false,
}: {
  project: Project;
  step: ProjectStep;
  readOnly?: boolean;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const gate = evaluateGate(store, project.id, step.key);
  const [reason, setReason] = useState("");
  const isWinningGate = step.gateKind === "client_approval";
  const decision = step.gateDecision;
  const canDecide = Boolean(
    currentUser &&
      canApproveGate(store, currentUser, project) &&
      project.status === "active" &&
      step.status === "active",
  );

  return (
    <div className="space-y-4">
      <SectionCard
        title={step.name}
        description={
          step.description ||
          (isWinningGate
            ? "Persetujuan klien. Menang memindahkan proyek ke Planning dan mengunci RAB sebagai baseline."
            : "Titik keputusan Go/No-Go.")
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="bg-muted rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {GATE_KIND_LABEL[step.gateKind ?? "go_no_go"]}
          </span>
          {decision ? (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                decision.decision === "approved"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700",
              )}
            >
              {decision.decision === "approved" ? "Disetujui" : "Ditolak"}
            </span>
          ) : null}
        </div>

        {decision ? (
          <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-xs">
            <p>
              Keputusan:{" "}
              <span className="font-semibold">
                {decision.decision === "approved" ? "Disetujui" : "Ditolak"}
              </span>
            </p>
            {decision.reason ? <p>Alasan: {decision.reason}</p> : null}
            <p className="text-muted-foreground">
              Oleh {userById(store, decision.actorId)?.name ?? "User"} ·{" "}
              {formatDate(decision.decidedAt)}
            </p>
          </div>
        ) : null}

        <div className="mt-3 space-y-1.5">
          {gate.requirements.map((requirement) => (
            <div key={requirement.label} className="flex items-center gap-2 text-xs">
              {requirement.met ? (
                <CheckCircle2 className="size-3.5 text-emerald-600" />
              ) : (
                <XCircle className="text-muted-foreground size-3.5" />
              )}
              <span
                className={
                  requirement.met ? "text-foreground" : "text-muted-foreground"
                }
              >
                {requirement.label}
              </span>
            </div>
          ))}
        </div>

        {!readOnly && canDecide && !decision ? (
          <div className="mt-4 space-y-2 border-t pt-3">
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder="Alasan penolakan (wajib bila menolak)"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!gate.ready}
                onClick={() => {
                  store.decideGate(project.id, step.key, "approved");
                  toast.success(
                    isWinningGate
                      ? "Gerbang disetujui. Proyek menang dan masuk Planning."
                      : "Keputusan Go dicatat.",
                  );
                }}
              >
                <CheckCircle2 className="size-3.5" />
                {isWinningGate ? "Setujui (menang)" : "Go"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!reason.trim()}
                onClick={() => {
                  store.decideGate(project.id, step.key, "rejected", reason);
                  toast.success("Keputusan ditolak dan dicatat.");
                }}
              >
                <XCircle className="size-3.5" />
                {isWinningGate ? "Tolak (kalah)" : "No-Go"}
              </Button>
            </div>
          </div>
        ) : null}

        {!readOnly && !canDecide && !decision ? (
          <p className="text-muted-foreground mt-3 text-xs">
            Hanya PM pemilik proyek atau Admin yang dapat memutuskan gerbang.
          </p>
        ) : null}
      </SectionCard>

      {isWinningGate && project.rabBaselineLockedAt ? (
        <div className="flex items-center gap-2 rounded-xl border bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
          <ShieldCheck className="size-3.5" />
          RAB terkunci sebagai baseline sejak {formatDate(project.rabBaselineLockedAt)}.
        </div>
      ) : null}
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
  const projectSteps = store.steps
    .filter((step) => step.projectId === projectId)
    .sort((a, b) => a.order - b.order);
  const activeStep = projectSteps.find((step) => step.status === "active");
  const fallbackStep =
    activeStep ??
    [...projectSteps].reverse().find((step) => step.status !== "pending") ??
    projectSteps[0];
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedStepKey, setSelectedStepKey] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase>("prospek");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const transitionBanner = project
    ? phaseTransitionBanner(projectSteps, project.status)
    : null;
  const bannerStorageKey = transitionBanner
    ? `crm-phase-banner:${projectId}:${transitionBanner.key}`
    : null;

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("step");
    const valid = projectSteps.find(
      (step) => step.key === fromUrl && step.status !== "pending",
    );
    const initial = valid ?? fallbackStep;
    setSelectedStepKey(initial?.key ?? null);
    setSelectedPhase(initial?.phase ?? "prospek");
    // Only initialize when the project changes; later store updates must not
    // reset the user's selected step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!bannerStorageKey) return;
    try {
      setBannerDismissed(window.localStorage.getItem(bannerStorageKey) === "1");
    } catch {
      setBannerDismissed(false);
    }
  }, [bannerStorageKey]);

  if (!project || !currentUser) {
    return <EmptyState icon={FolderKanban} title="Proyek tidak ditemukan" description="Proyek mungkin tidak ada atau bukan milik Anda." />;
  }

  if (currentUser.role === "pm" && project.createdById !== currentUser.id) {
    return <EmptyState icon={ShieldCheck} title="Akses ditolak" description="PM hanya dapat membuka proyek miliknya." />;
  }

  const active = activeSteps(store, project.id);
  const journey = calculateJourneyProgress(store, project.id);
  const work = workProgressForProject(store, project.id);
  const phase = active[0]?.phase;
  const group = project.groupId
    ? store.groups.find((item) => item.id === project.groupId)
    : undefined;
  const canManage = canManageProject(currentUser, project);
  const canCancel = canCancelProject(currentUser, project);
  const selectedStep =
    projectSteps.find((step) => step.key === selectedStepKey) ?? fallbackStep;
  const selectedKey = selectedStep?.key;
  const readOnly = project.status !== "active" || selectedStep?.status !== "active";
  const allStepsDone = projectSteps.every(
    (step) => step.status === "completed" || step.status === "skipped",
  );
  const template = project.templateId
    ? store.templates.find((item) => item.id === project.templateId)
    : undefined;
  const templateTooltip = missingPhaseTooltip(projectSteps);

  const selectStep = (stepKey: string) => {
    const next = projectSteps.find((step) => step.key === stepKey);
    if (!next || next.status === "pending") return;
    if (stepKey !== selectedStepKey && hasUnsavedFormChanges()) {
      const proceed = window.confirm(
        "Ada perubahan form yang belum tersimpan. Pindah tahap akan membuang perubahan tersebut. Lanjutkan?",
      );
      if (!proceed) return;
    }
    setSelectedStepKey(stepKey);
    setSelectedPhase(next.phase);
    const url = new URL(window.location.href);
    url.searchParams.set("step", stepKey);
    window.history.replaceState(null, "", url);
  };

  const selectPhase = (phase: Phase) => {
    setSelectedPhase(phase);
    const candidates = projectSteps.filter((step) => step.phase === phase);
    const next =
      candidates.find((step) => step.status === "active") ??
      [...candidates].reverse().find((step) => step.status !== "pending");
    if (next) selectStep(next.key);
  };

  const stepContent = (() => {
    if (!selectedStep) {
      return <EmptyState icon={Clock3} title="Tidak ada tahap" />;
    }
    if (selectedStep.status === "pending") {
      return (
        <EmptyState
          icon={Clock3}
          title="Belum dimulai"
          description="Tahap ini belum dapat dibuka."
        />
      );
    }
    if (selectedStep.kind === "gate") {
      return (
        <GateStage project={project} step={selectedStep} readOnly={readOnly} />
      );
    }
    if (selectedStep.kind === "form") {
      if (selectedStep.legacyKey === "survey" && !selectedStep.formTemplate) {
        return <SurveyStep project={project} readOnly={readOnly} />;
      }
      return (
        <FormStagePanel project={project} step={selectedStep} readOnly={readOnly} />
      );
    }
    if (selectedStep.kind === "simpro") {
      if (selectedStep.legacyKey === "pitching") {
        return <PitchingStep project={project} readOnly={readOnly} />;
      }
      if (selectedStep.legacyKey === "running") {
        return <RunningStep project={project} readOnly={readOnly} />;
      }
      return (
        <SimproStagePanel project={project} step={selectedStep} readOnly={readOnly} />
      );
    }
    if (selectedStep.financeKind === "survey") {
      return <SurveyStep project={project} readOnly={readOnly} />;
    }
    if (selectedStep.financeKind === "rab") {
      return <RabStep project={project} readOnly={readOnly} />;
    }
    return (
      <FinanceStep project={project} step={selectedStep} readOnly={readOnly} />
    );
  })();

  return (
    <div className="space-y-5">
      <Link
        href="/crm/projects"
        onClick={(event) => {
          if (
            hasUnsavedFormChanges() &&
            !window.confirm(
              "Ada perubahan form yang belum tersimpan. Keluar dari halaman akan membuang perubahan tersebut. Lanjutkan?",
            )
          ) {
            event.preventDefault();
          }
        }}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
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
                  {LIFECYCLE_LABEL[project.lifecycle ?? "active"]}
                </span>
                {phase ? (
                  <span className="rounded-md bg-violet-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-white/25">
                    {PHASE_LABEL[phase]}
                  </span>
                ) : null}
                {template ? (
                  <span
                    className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-white/25"
                    title={templateTooltip}
                    aria-label={`${template.name} v${
                      project.templateVersion ?? template.version
                    }. ${templateTooltip}`}
                  >
                    {template.name} v{project.templateVersion ?? template.version}
                  </span>
                ) : null}
                <PriorityBadge priority={project.priority} />
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{project.name}</h1>
              <p className="mt-1 text-sm text-white/75">
                {project.client || "Tanpa klien"} · PM {userById(store, project.createdById)?.name ?? "—"} · Manager {userById(store, project.managerId)?.name ?? "Belum ditugaskan"}
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
            <ProjectStepper
              projectId={project.id}
              selectedStepKey={selectedKey ?? ""}
              selectedPhase={selectedPhase}
              onPhaseClick={selectPhase}
              onStepClick={selectStep}
              panelId="project-step-panel"
            />
            <p className="mt-2 text-[10px] text-white/60">
              Tahapan terkunci setelah proyek dibuat. Klik fase untuk melihat tahap di dalamnya.
            </p>
          </div>
        </div>
      </div>

      {transitionBanner && !bannerDismissed ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900"
        >
          <span>{transitionBanner.message}</span>
          <button
            type="button"
            aria-label="Tutup pemberitahuan fase"
            className="text-sky-700 hover:text-sky-900 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            onClick={() => {
              try {
                if (bannerStorageKey) {
                  window.localStorage.setItem(bannerStorageKey, "1");
                }
              } catch {
                /* ignore storage errors */
              }
              setBannerDismissed(true);
            }}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {project.status === "completed" ? (
        <CompletedSummary project={project} />
      ) : null}

      {project.status === "active" && allStepsDone && canManage ? (
        <SectionCard
          title="Semua tahap selesai"
          description="Tutup proyek untuk menandai siklus hidup Selesai."
        >
          <Button
            size="sm"
            onClick={() => {
              store.completeProject(project.id);
              toast.success("Proyek ditandai selesai.");
            }}
          >
            <CheckCircle2 className="size-3.5" /> Selesaikan proyek
          </Button>
        </SectionCard>
      ) : null}

      {project.status === "cancelled" ? (
        <SectionCard
          title={
            project.lifecycle === "lost" ? "Proyek kalah" : "Proyek dibatalkan"
          }
          description={project.lostReason ?? project.cancelReason}
        >
          <p className="text-muted-foreground text-xs">
            Proyek tersimpan lengkap dengan riwayat, bersifat read-only, dan
            tidak masuk workload.
          </p>
        </SectionCard>
      ) : null}

      {activeStep && selectedStep && selectedStep.status !== "active" ? (
        <div>
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => selectStep(activeStep.key)}
          >
            Kembali ke tahap aktif
          </Button>
        </div>
      ) : null}

      <div
        role="tabpanel"
        id="project-step-panel"
        aria-labelledby={
          selectedKey ? `step-tab-${selectedKey}` : undefined
        }
        className="space-y-4"
      >
        {stepContent}
        {selectedKey ? (
          <ProjectStepHistory projectId={project.id} stepKey={selectedKey} />
        ) : null}
      </div>

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
