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
  Pencil,
  Plus,
  ShieldCheck,
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
  canManageProjectSteps,
  canViewProject,
  evaluateGate,
  formatCurrency,
  formatDate,
  formatDateTime,
  formEntriesForStep,
  formEntryProgress,
  formFor,
  formLabel,
  formsFor,
  isNewLifecycleProject,
  operationalAssigneeCandidates,
  projectCommercialTotals,
  projectPhase,
  projectProgress,
  projectWorkspaceTabs,
  reviewerCandidates,
  roleCanSeeCommercialTotals,
  tasksForStep,
  userById,
  workProgressForProject,
  type ProjectWorkspaceTab,
} from "@/lib/prototype/domain";
import {
  FORM_ENTRY_STATUS_LABEL,
  FORM_STATUS_LABEL,
  GATE_KIND_LABEL,
  LIFECYCLE_LABEL,
  PHASE_HINT,
  PHASE_LABEL,
  PHASE_ORDER,
  type FormEntry,
  type FormStepKey,
  type GateKind,
  type Phase,
  type Project,
  type ProjectStep,
  type StageKind,
  type StepForm,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  missingPhaseTooltip,
  phaseStageCounts,
  phaseTransitionBanner,
  phasesForProject,
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
import { ProjectDialog, TaskDialog } from "../dialogs";
import { TaskProgressPanels } from "../simpro/task-progress";
import { ProjectStepHistory } from "./project-history";
import { ProjectMediaOrders } from "./media-order";
import { MediaOrderStepPanel } from "./media-order-form";
import {
  CrmProjectBacklogTab,
  CrmProjectBoardTab,
  CrmProjectFormsTab,
} from "./project-work-panels";
import { hasUnsavedFormChanges, StepFormPanel } from "./step-form-panel";
import { isMandatoryProjectStep } from "@/lib/prototype/mandatory-steps";

type StepTone = "done" | "active" | "attention" | "empty";

const WORKSPACE_TAB_LABEL: Record<ProjectWorkspaceTab, string> = {
  overview: "Overview",
  journey: "Journey Management",
  board: "Board",
  backlog: "Backlog",
  forms: "Forms",
  media: "Media Order",
};


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
  const project = store.projects.find((item) => item.id === projectId);
  const steps = store.steps
    .filter((step) => step.projectId === projectId)
    .sort((a, b) => a.order - b.order);
  const phases = phasesForProject(project, steps);
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
                  : (counts[phase] ?? 0) === 0
                    ? "0 Step"
                    : `${counts[phase]} tahap`}
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
    form.type === "survey"
      ? user.role === "assignee"
      : form.type === "bast"
        ? user.role === "finance" || user.role === "media"
        : user.role === "finance",
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
  const [reviewerId, setReviewerId] = useState("");

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
                    {entry.reviewerId
                      ? ` · Reviewer ${userById(store, entry.reviewerId)?.name ?? "—"}`
                      : ""}
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

        {canManage &&
        entries.length === 0 &&
        !step.noWorkConfirmedAt &&
        !isNewLifecycleProject(project) ? (
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
            <div>
              <label className="text-xs font-medium" htmlFor="entry-reviewer">
                Reviewer
              </label>
              <NativeSelect
                value={reviewerId}
                onChange={setReviewerId}
                className="mt-1 w-full"
              >
                <option value="">Belum ditentukan</option>
                {reviewerCandidates(store).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-muted-foreground mt-1 text-[10px]">
                Reviewer dapat menyetujui atau meminta revisi. Hanya PM, Manager,
                dan Finance.
              </p>
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
                  reviewerId: reviewerId || undefined,
                });
                setTitle("");
                setDueDate("");
                setReviewerId("");
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
            {tasks.map((task) => (
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

      {canManage &&
      tasks.length === 0 &&
      !step.noWorkConfirmedAt &&
      !isNewLifecycleProject(project) ? (
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

function StepDialog({
  open,
  onOpenChange,
  project,
  step,
  defaultPhase,
  defaultManagerPicId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  step?: ProjectStep;
  defaultPhase: Phase;
  defaultManagerPicId: string;
}) {
  const store = usePrototypeStore();
  const managers = store.users.filter((user) => user.role === "manager");
  const [name, setName] = useState(step?.name ?? "");
  const [description, setDescription] = useState(step?.description ?? "");
  const [phase, setPhase] = useState<Phase>(step?.phase ?? defaultPhase);
  const [kind, setKind] = useState<StageKind>(step?.kind ?? "simpro");
  const [financeKind, setFinanceKind] = useState<FormStepKey>(
    step?.financeKind ?? "bast",
  );
  const [gateKind, setGateKind] = useState<GateKind>(
    step?.gateKind ?? "go_no_go",
  );
  const [managerPicId, setManagerPicId] = useState(
    step?.managerPicId ?? defaultManagerPicId,
  );

  useEffect(() => {
    if (!open) return;
    setName(step?.name ?? "");
    setDescription(step?.description ?? "");
    setPhase(step?.phase ?? defaultPhase);
    setKind(step?.kind ?? (defaultPhase === "finance" ? "finance_form" : "simpro"));
    setFinanceKind(step?.financeKind ?? "bast");
    setGateKind(step?.gateKind ?? "go_no_go");
    setManagerPicId(step?.managerPicId ?? defaultManagerPicId);
    // Reset only when the dialog opens or switches step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step?.id]);

  useEffect(() => {
    if (phase === "finance") {
      setKind("finance_form");
    } else if (kind === "finance_form") {
      setKind("simpro");
    }
    // Keep the kind valid for the chosen phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const requestedShape = {
    phase,
    kind,
    financeKind: kind === "finance_form" ? financeKind : undefined,
    gateKind: kind === "gate" ? gateKind : undefined,
  };
  const mandatory = isMandatoryProjectStep(requestedShape);

  const save = () => {
    if (!name.trim()) {
      toast.error("Nama step wajib diisi.");
      return;
    }
    if (kind === "finance_form" && !financeKind) {
      toast.error("Jenis form keuangan wajib dipilih.");
      return;
    }
    if (kind === "gate" && !gateKind) {
      toast.error("Jenis gerbang wajib dipilih.");
      return;
    }
    if (step) {
      const ok = store.updateProjectStep(project.id, step.id, {
        name: name.trim(),
        description: description.trim(),
        managerPicId,
      });
      toast[ok ? "success" : "error"](
        ok ? "Step diperbarui." : "Gagal memperbarui step.",
      );
      if (ok) onOpenChange(false);
      return;
    }
    const id = store.addProjectStep(project.id, {
      name: name.trim(),
      description: description.trim(),
      phase,
      kind,
      financeKind: kind === "finance_form" ? financeKind : undefined,
      gateKind: kind === "gate" ? gateKind : undefined,
      managerPicId,
    });
    toast[id ? "success" : "error"](
      id ? "Step ditambahkan." : "Gagal menambah step.",
    );
    if (id) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step ? "Edit Step" : "Tambah Step"}</DialogTitle>
          <DialogDescription>
            {step
              ? "Perbarui nama, deskripsi, dan Manager PIC step."
              : "Pilih fase dan jenis step. Step wajib dapat dibuat otomatis."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-xs">
          <label className="space-y-1">
            <span className="font-medium">Nama step</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: KOL Briefing"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="font-medium">Fase</span>
              <NativeSelect
                value={phase}
                disabled={Boolean(step)}
                onChange={(value) => setPhase(value as Phase)}
              >
                {PHASE_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {PHASE_LABEL[item]}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="space-y-1">
              <span className="font-medium">Jenis step</span>
              <NativeSelect
                value={kind}
                disabled={Boolean(step) || phase === "finance"}
                onChange={(value) => setKind(value as StageKind)}
              >
                <option value="simpro">SIMPRO</option>
                <option value="form">Form</option>
                <option value="gate">Gerbang</option>
                <option value="finance_form">Form keuangan</option>
              </NativeSelect>
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {kind === "finance_form" ? (
              <label className="space-y-1">
                <span className="font-medium">Jenis form keuangan</span>
                <NativeSelect
                  value={financeKind}
                  onChange={(value) => setFinanceKind(value as FormStepKey)}
                >
                  <option value="rab">RAB</option>
                  <option value="mo">Media Order</option>
                  <option value="bast">BAST</option>
                  <option value="invoice">Invoice</option>
                  <option value="payment">Pembayaran</option>
                </NativeSelect>
              </label>
            ) : null}
            {kind === "gate" ? (
              <label className="space-y-1">
                <span className="font-medium">Jenis gerbang</span>
                <NativeSelect
                  value={gateKind}
                  onChange={(value) => setGateKind(value as GateKind)}
                >
                  <option value="go_no_go">Go / No-Go</option>
                  <option value="client_approval">Persetujuan klien (menang)</option>
                </NativeSelect>
              </label>
            ) : null}
            <label className="space-y-1">
              <span className="font-medium">Manager PIC</span>
              <NativeSelect
                value={managerPicId}
                onChange={(value) => setManagerPicId(value)}
              >
                <option value="">Belum ditugaskan</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </div>
          <label className="space-y-1">
            <span className="font-medium">Deskripsi</span>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="Ringkasan step"
            />
          </label>
          <p className="text-muted-foreground">
            {mandatory
              ? "Step ini wajib pada fase tersebut dan dibuat otomatis."
              : "Step ini opsional dan dapat dihapus setelah proyek berjalan."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={save}>{step ? "Simpan" : "Tambah"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [workspaceTab, setWorkspaceTab] = useState<ProjectWorkspaceTab>("overview");
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [workTaskId, setWorkTaskId] = useState<string | undefined>(undefined);
  const [workTaskStepKey, setWorkTaskStepKey] = useState<string | undefined>(undefined);
  const [workTaskOpen, setWorkTaskOpen] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const value = url.searchParams.get("tab");
    if (
      value === "journey" ||
      value === "board" ||
      value === "backlog" ||
      value === "forms" ||
      value === "media"
    ) {
      setWorkspaceTab(value);
      return;
    }
    setWorkspaceTab("overview");
    if (value && value !== "overview") {
      url.searchParams.delete("tab");
      window.history.replaceState(null, "", url);
    }
  }, []);

  useEffect(() => {
    const taskId = new URLSearchParams(window.location.search).get("task");
    if (!taskId) return;
    if (store.tasks.some((task) => task.id === taskId && task.projectId === projectId)) {
      setWorkTaskId(taskId);
      setWorkTaskOpen(true);
    }
    // Only react to a new project; the query is a one-shot deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const switchWorkspaceTab = (tab: ProjectWorkspaceTab) => {
    setWorkspaceTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
  };
  const transitionBanner = project
    ? phaseTransitionBanner(projectSteps, project.status)
    : null;
  const bannerStorageKey = transitionBanner
    ? `crm-phase-banner:${projectId}:${transitionBanner.key}`
    : null;

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("step");
    const valid = projectSteps.find((step) => step.key === fromUrl);
    const initial = valid ?? fallbackStep;
    setSelectedStepKey(initial?.key ?? null);
    setSelectedPhase(
      initial?.phase ??
        (isNewLifecycleProject(project) ? "planning" : "prospek"),
    );
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
  if (
    currentUser.role === "media" ||
    currentUser.role === "bod" ||
    (currentUser.role === "assignee" &&
      !canViewProject(store, currentUser, project))
  ) {
    return <EmptyState icon={ShieldCheck} title="Akses ditolak" description="Role ini tidak dapat membuka detail proyek." />;
  }

  const active = activeSteps(store, project.id);
  const newLifecycle = isNewLifecycleProject(project);
  const progress = projectProgress(store, project.id);
  const journey = progress.value;
  const work = workProgressForProject(store, project.id);
  const phase = active[0]?.phase ?? projectPhase(project, projectSteps);
  const group = project.groupId
    ? store.groups.find((item) => item.id === project.groupId)
    : undefined;
  const commercial = projectCommercialTotals(store, project.id);
  const showCommercial = roleCanSeeCommercialTotals(currentUser.role);
  const canManage = canManageProject(currentUser, project);
  const canManageSteps = canManageProjectSteps(currentUser, project);
  const availableTabs = projectWorkspaceTabs(currentUser.role);
  const visibleTab: ProjectWorkspaceTab = availableTabs.includes(workspaceTab)
    ? workspaceTab
    : "overview";
  const managerPicId =
    project.managerId ?? store.users.find((user) => user.role === "manager")?.id;
  const currentPhase = projectPhase(project, projectSteps);
  const selectedPhaseSteps = projectSteps.filter(
    (step) => step.phase === selectedPhase,
  );
  const selectedPhaseReady =
    selectedPhaseSteps.length > 0 &&
    selectedPhaseSteps.every(
      (step) => step.status === "completed" || step.status === "skipped",
    );
  const overviewTasks = store.tasks.filter(
    (task) =>
      task.projectId === project.id &&
      !task.archivedAt &&
      (currentUser.role !== "assignee" || task.assigneeId === currentUser.id),
  );
  const canCancel = canCancelProject(currentUser, project);
  const selectedStep =
    selectedPhaseSteps.find((step) => step.key === selectedStepKey) ??
    selectedPhaseSteps.find((step) => step.status === "active") ??
    [...selectedPhaseSteps]
      .reverse()
      .find((step) => step.status !== "pending") ??
    selectedPhaseSteps[0];
  const selectedKey = selectedStep?.key;
  const selectedGate = selectedStep
    ? evaluateGate(store, project.id, selectedStep.key)
    : null;
  const unmetRequirements =
    selectedGate?.requirements.filter((requirement) => !requirement.met) ?? [];
  const completionBlocked =
    selectedStep?.status === "active" &&
    (selectedStep.kind === "gate" || !selectedGate?.ready);
  const activeStepExists = projectSteps.some(
    (step) => step.status === "active",
  );
  const firstPendingCurrentPhase = selectedPhaseSteps
    .filter(
      (step) => step.status === "pending" && step.phase === currentPhase,
    )
    .sort((a, b) => a.order - b.order)[0];
  const canActivateStep =
    canManageSteps &&
    !activeStepExists &&
    selectedPhase === currentPhase &&
    Boolean(firstPendingCurrentPhase?.managerPicId);
  const readOnly = project.status !== "active" || selectedStep?.status !== "active";
  const allStepsDone =
    projectSteps.length > 0 &&
    projectSteps.every(
      (step) => step.status === "completed" || step.status === "skipped",
    );
  const template = project.templateId
    ? store.templates.find((item) => item.id === project.templateId)
    : undefined;
  const templateTooltip = missingPhaseTooltip(projectSteps);

  const selectStep = (stepKey: string) => {
    const next = projectSteps.find((step) => step.key === stepKey);
    if (!next) return;
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
    const candidates = projectSteps.filter((step) => step.phase === phase);
    const next =
      candidates.find((step) => step.status === "active") ??
      [...candidates].reverse().find((step) => step.status !== "pending") ??
      candidates[0];
    if (next) {
      selectStep(next.key);
      return;
    }
    if (selectedStep && hasUnsavedFormChanges()) {
      const proceed = window.confirm(
        "Ada perubahan form yang belum tersimpan. Pindah fase akan membuang perubahan tersebut. Lanjutkan?",
      );
      if (!proceed) return;
    }
    setSelectedPhase(phase);
    setSelectedStepKey(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("step");
    window.history.replaceState(null, "", url);
  };

  const focusNextStep = () => {
    const latest = usePrototypeStore.getState();
    const nextSteps = latest.steps
      .filter((step) => step.projectId === project.id)
      .sort((a, b) => a.order - b.order);
    const nextPhase = projectPhase(
      latest.projects.find((item) => item.id === project.id) ?? project,
      nextSteps,
    );
    const next =
      nextSteps.find((step) => step.status === "active") ??
      nextSteps.find(
        (step) => step.phase === nextPhase && step.status === "pending",
      );
    if (!next) return;
    setSelectedStepKey(next.key);
    setSelectedPhase(next.phase);
    const url = new URL(window.location.href);
    url.searchParams.set("step", next.key);
    window.history.replaceState(null, "", url);
  };

  const stepContent = (() => {
    if (!selectedStep) {
      return (
        <EmptyState
          icon={Clock3}
          title="Belum ada step"
          description="Fase ini belum memiliki step. PM/Admin dapat menambahkannya di Kelola fase."
        />
      );
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
    if (selectedStep.financeKind === "mo") {
      return (
        <MediaOrderStepPanel project={project} readOnly={readOnly} />
      );
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
              {showCommercial && (commercial.rab > 0 || commercial.mo > 0) ? (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {commercial.rab > 0 ? (
                    <span className="rounded-md bg-white/15 px-2 py-0.5 font-semibold ring-1 ring-white/25">
                      RAB {formatCurrency(commercial.rab)}
                    </span>
                  ) : null}
                  {commercial.mo > 0 ? (
                    <span className="rounded-md bg-white/15 px-2 py-0.5 font-semibold ring-1 ring-white/25">
                      MO {formatCurrency(commercial.mo)}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {group ? (
                <Link
                  href={`/crm/umbrella-projects/${group.id}`}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"
                >
                  <FolderKanban className="size-3.5" /> Umbrella Project · {group.name}
                </Link>
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
                <span className="text-white/70">Progress</span>
                <span className="font-semibold">{progress.label}</span>
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
              <Users className="size-3.5" />{" "}
              {group ? `Umbrella Project · ${group.name}` : "Tanpa umbrella"}
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchWorkspaceTab(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                visibleTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {WORKSPACE_TAB_LABEL[tab]}
            </button>
          ))}
        </div>
        {canManage && selectedStep?.status === "active" ? (
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              disabled={completionBlocked}
              title={
                completionBlocked
                  ? selectedStep.kind === "gate"
                    ? "Gunakan panel keputusan gerbang."
                    : unmetRequirements
                        .map((requirement) => requirement.label)
                        .join(" · ")
                  : undefined
              }
              onClick={() => {
                const ok = store.completeStep(project.id, selectedStep.key);
                if (ok) {
                  toast.success(`Tahap ${selectedStep.name} diselesaikan.`);
                  focusNextStep();
                } else {
                  toast.error(
                    selectedStep.kind === "gate"
                      ? "Gunakan panel gerbang untuk mencatat keputusan."
                      : unmetRequirements.length > 0
                        ? `Tahap belum siap: ${unmetRequirements
                            .map((requirement) => requirement.label)
                            .join(" · ")}`
                        : "Tahap belum siap diselesaikan.",
                  );
                }
              }}
            >
              Selesaikan Tahap
            </Button>
            {completionBlocked ? (
              <p className="text-muted-foreground max-w-[320px] text-right text-[10px]">
                {selectedStep.kind === "gate"
                  ? "Gunakan panel keputusan gerbang."
                  : unmetRequirements.length > 0
                    ? unmetRequirements
                        .map((requirement) => requirement.label)
                        .join(" · ")
                    : "Selesaikan pekerjaan tahap terlebih dahulu."}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {(visibleTab === "journey" ||
        (visibleTab === "overview" && !project.startedAt)) &&
      newLifecycle &&
      !project.startedAt ? (
        <SectionCard
          title="Proyek belum dimulai"
          description={
            canManage
              ? "Pilih fase awal. Fase Prospek wajib dijalankan bila template memuatnya; Finance tersedia setelah Running selesai."
              : "Menunggu PM memulai proyek."
          }
        >
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {projectSteps.some((step) => step.phase === "prospek") ? (
                <Button
                  size="sm"
                  onClick={() => {
                    if (!managerPicId) {
                      toast.error("Tetapkan Manager proyek terlebih dahulu.");
                      return;
                    }
                    const ok = store.startProject(project.id, "prospek", {
                      managerPicId,
                    });
                    toast[ok ? "success" : "error"](
                      ok
                        ? "Proyek dimulai dari Prospek."
                        : "Gagal memulai proyek.",
                    );
                  }}
                >
                  Mulai dari Prospek
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!managerPicId) {
                        toast.error("Tetapkan Manager proyek terlebih dahulu.");
                        return;
                      }
                      const ok = store.startProject(project.id, "planning", {
                        managerPicId,
                      });
                      toast[ok ? "success" : "error"](
                        ok
                          ? "Proyek dimulai dari Planning."
                          : "Gagal memulai proyek.",
                      );
                    }}
                  >
                    Mulai dari Planning
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!managerPicId) {
                        toast.error("Tetapkan Manager proyek terlebih dahulu.");
                        return;
                      }
                      const ok = store.startProject(project.id, "running", {
                        managerPicId,
                      });
                      toast[ok ? "success" : "error"](
                        ok
                          ? "Proyek dimulai dari Running; Planning dilewati."
                          : "Gagal memulai proyek.",
                      );
                    }}
                  >
                    Langsung ke Running
                  </Button>
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              Menunggu PM memulai proyek.
            </p>
          )}
        </SectionCard>
      ) : null}

      {visibleTab === "journey" && newLifecycle && project.startedAt && canManageSteps ? (
        <SectionCard
          title="Kelola fase"
          description="Tambah step pada fase aktif atau selesaikan fase setelah semua step selesai."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingStepId(null);
                  setStepDialogOpen(true);
                }}
              >
                <Plus className="size-3.5" /> Tambah step
              </Button>
              {canActivateStep && firstPendingCurrentPhase ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const ok = store.activateProjectStep(
                      project.id,
                      firstPendingCurrentPhase.id,
                    );
                    toast[ok ? "success" : "error"](
                      ok
                        ? `Tahap ${firstPendingCurrentPhase.name} aktif.`
                        : "Tahap belum dapat diaktifkan.",
                    );
                    if (ok) focusNextStep();
                  }}
                >
                  Aktifkan tahap {firstPendingCurrentPhase.name}
                </Button>
              ) : null}
              <Button
                size="sm"
                disabled={
                  selectedPhase !== currentPhase || !selectedPhaseReady
                }
                onClick={() => {
                  const ok = store.completeProjectPhase(
                    project.id,
                    selectedPhase,
                  );
                  toast[ok ? "success" : "error"](
                    ok
                      ? `Fase ${PHASE_LABEL[selectedPhase]} selesai.`
                      : "Fase belum siap diselesaikan.",
                  );
                  if (ok) focusNextStep();
                }}
              >
                Selesaikan fase {PHASE_LABEL[selectedPhase]}
              </Button>
            </div>
          }
        >
          <div className="space-y-1 text-xs">
            {selectedPhaseSteps.length === 0 ? (
              <p className="text-muted-foreground">
                Belum ada step pada fase ini.
              </p>
            ) : (
              selectedPhaseSteps
                .sort((a, b) => a.order - b.order)
                .map((step) => (
                  <div
                    key={step.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1"
                  >
                    <span>
                      {step.name} · {step.status}
                      <span
                        className={cn(
                          "ml-1 rounded px-1.5 py-0.5 text-[9px] font-semibold",
                          isMandatoryProjectStep(step)
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {isMandatoryProjectStep(step) ? "Wajib" : "Opsional"}
                      </span>
                      {step.managerPicId
                        ? ` · PIC ${userById(store, step.managerPicId)?.name ?? "-"}`
                        : ""}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          setEditingStepId(step.id);
                          setStepDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      {step.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px]"
                            onClick={() =>
                              store.reorderProjectStep(project.id, step.id, "up")
                            }
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px]"
                            onClick={() =>
                              store.reorderProjectStep(project.id, step.id, "down")
                            }
                          >
                            ↓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px]"
                            onClick={() => store.deleteProjectStep(project.id, step.id)}
                          >
                            Hapus
                          </Button>
                        </>
                      ) : null}
                    </span>
                  </div>
                ))
            )}
          </div>
        </SectionCard>
      ) : null}

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

      {visibleTab === "overview" ? (
        <div className="space-y-3">
          <SectionCard
            title="Penyelesaian Tahap"
            description="Ringkasan step selesai, dilewati, dan belum selesai."
          >
            <div className="grid gap-2 text-xs sm:grid-cols-3">
              <p>Selesai: {projectSteps.filter((step) => step.status === "completed").length}</p>
              <p>Dilewati: {projectSteps.filter((step) => step.status === "skipped").length}</p>
              <p>Belum selesai: {projectSteps.filter((step) => step.status === "pending" || step.status === "active").length}</p>
            </div>
          </SectionCard>
          {showCommercial ? (
            <SectionCard
              title="Nilai Komersial"
              description="Akumulatif RAB dan Media Order proyek ini."
            >
              <div className="grid gap-2 text-xs sm:grid-cols-3">
                <DataRow label="Akumulatif RAB" value={formatCurrency(commercial.rab)} />
                <DataRow label="Akumulatif MO" value={formatCurrency(commercial.mo)} />
                <DataRow
                  label="Margin MO"
                  value={`${formatCurrency(commercial.moMargin)} (${Math.round(commercial.moMarginPercent)}%)`}
                />
                {commercial.unmappedRab + commercial.unmappedMo > 0 ? (
                  <p className="text-[11px] text-amber-700 sm:col-span-3">
                    {commercial.unmappedRab + commercial.unmappedMo} item belum dipetakan ke unit bisnis dan tidak dihitung.
                  </p>
                ) : null}
              </div>
            </SectionCard>
          ) : null}
          <TaskProgressPanels
            tasks={overviewTasks}
            distributionDescription="Status task SIMPRO proyek ini."
            progressDescription="Ringkasan penyelesaian task proyek ini."
          />
          <SectionCard title="Riwayat Aktivitas" description="Event proyek terbaru.">
            <div className="space-y-1 text-[11px]">
              {store.projectEvents
                .filter((event) => event.projectId === project.id)
                .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                .slice(0, 10)
                .map((event) => (
                  <div key={event.id} className="flex flex-wrap gap-2 rounded border px-2 py-1">
                    <span className="font-semibold">{event.eventType}</span>
                    <span className="text-muted-foreground">
                      {formatDateTime(event.occurredAt)}
                    </span>
                    <span>{userById(store, event.actorId)?.name ?? "User"}</span>
                    <span className="text-muted-foreground">{event.summary}</span>
                  </div>
                ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {visibleTab === "board" ? (
        <CrmProjectBoardTab
          project={project}
          onTaskClick={(task) => {
            setWorkTaskId(task.id);
            setWorkTaskStepKey(task.stepKey);
            setWorkTaskOpen(true);
          }}
          onNewTask={(stepKey) => {
            setWorkTaskId(undefined);
            setWorkTaskStepKey(stepKey);
            setWorkTaskOpen(true);
          }}
        />
      ) : null}

      {visibleTab === "backlog" ? (
        <CrmProjectBacklogTab
          project={project}
          onTaskClick={(task) => {
            setWorkTaskId(task.id);
            setWorkTaskStepKey(task.stepKey);
            setWorkTaskOpen(true);
          }}
          onNewTask={(stepKey) => {
            setWorkTaskId(undefined);
            setWorkTaskStepKey(stepKey);
            setWorkTaskOpen(true);
          }}
        />
      ) : null}

      {visibleTab === "forms" ? <CrmProjectFormsTab project={project} /> : null}

      {visibleTab === "media" ? <ProjectMediaOrders project={project} /> : null}

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

      {visibleTab === "journey" && activeStep && selectedStep && selectedStep.status !== "active" ? (
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

      {visibleTab === "journey" ? (
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
      ) : null}

      <TaskDialog
        open={workTaskOpen}
        onOpenChange={(open) => {
          setWorkTaskOpen(open);
          if (!open) {
            setWorkTaskId(undefined);
            setWorkTaskStepKey(undefined);
          }
        }}
        projectId={project.id}
        taskId={workTaskId}
        stepKey={workTaskStepKey}
      />

      <ProjectDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      <StepDialog
        open={stepDialogOpen}
        onOpenChange={(open) => {
          setStepDialogOpen(open);
          if (!open) setEditingStepId(null);
        }}
        project={project}
        step={
          editingStepId
            ? projectSteps.find((step) => step.id === editingStepId)
            : undefined
        }
        defaultPhase={selectedPhase}
        defaultManagerPicId={managerPicId ?? ""}
      />
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
