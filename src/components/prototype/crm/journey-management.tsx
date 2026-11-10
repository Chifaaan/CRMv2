"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Layers,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canEditPhaseStructure,
  canManageProject,
  createManualStage,
  journeyPhaseErrors,
  journeyStartErrors,
  userById,
} from "@/lib/prototype/domain";
import { formTemplateForTitle, UMUM_TEMPLATE_ID } from "@/lib/prototype/templates";
import {
  GATE_KIND_LABEL,
  PHASE_HINT,
  PHASE_LABEL,
  PHASE_ORDER,
  STAGE_KIND_LABEL,
  type FormStepKey,
  type GateKind,
  type Phase,
  type Project,
  type ProjectStep,
  type StageKind,
  type TemplateStage,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import { EmptyState, Field, NativeSelect, SectionCard } from "../ui";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalize(stages: TemplateStage[]): TemplateStage[] {
  return stages.map((stage, index) => ({ ...stage, order: index + 1 }));
}

function cloneStage(stage: TemplateStage): TemplateStage {
  return {
    ...stage,
    formTemplate: stage.formTemplate
      ? {
          ...stage.formTemplate,
          defaultFields: { ...stage.formTemplate.defaultFields },
          fields: stage.formTemplate.fields.map((field) => ({
            ...field,
            options: field.options ? [...field.options] : undefined,
          })),
        }
      : undefined,
    tasks: stage.tasks.map((task) => ({ ...task })),
  };
}

function stepsToStages(steps: ProjectStep[]): TemplateStage[] {
  return normalize(
    steps.map((step) => ({
      id: step.key,
      name: step.name,
      description: step.description,
      phase: step.phase,
      order: step.order,
      kind: step.kind,
      required: step.required,
      weight: step.weight,
      parallelGroup: step.parallelGroup,
      financeKind: step.financeKind,
      gateKind: step.gateKind,
      costBeforeCommitment: step.costBeforeCommitment,
      legacyKey: step.legacyKey,
      formTemplate: step.formTemplate,
      entryTypes: step.entryTypes,
      tasks: step.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        role: task.role,
        required: task.required,
        deliverable: task.deliverable,
      })),
    })),
  );
}

function phaseStepsFor(projectId: string, phase: Phase): ProjectStep[] {
  return usePrototypeStore
    .getState()
    .steps.filter(
      (step) => step.projectId === projectId && step.phase === phase,
    )
    .sort((a, b) => a.order - b.order);
}

function phaseLabel(project: Project, phase: Phase): string {
  const state = project.phaseStates?.[phase];
  if (phase === "closing") {
    return state ? "Ditambahkan otomatis" : "Belum ditambahkan";
  }
  if (!state) {
    return phase === "prospek" ? "Belum disusun" : "Terbuka setelah gerbang menang";
  }
  if (state.lockedAt || state.startedAt) return "Terkunci";
  return "Draft — belum dimulai";
}

export function JourneyManagement({ project }: { project: Project }) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [phase, setPhase] = useState<Phase>("prospek");
  const [draft, setDraft] = useState<TemplateStage[]>(() =>
    stepsToStages(phaseStepsFor(project.id, "prospek")),
  );
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const template = store.templates.find(
    (item) => item.id === project.templateId,
  );
  const legacy =
    Boolean(template?.legacy) || project.templateId === UMUM_TEMPLATE_ID;
  const canManage = Boolean(currentUser && canManageProject(currentUser, project));
  const canEdit = canEditPhaseStructure(project, phase);
  const phaseState = project.phaseStates?.[phase];
  const phaseSteps = store.steps
    .filter(
      (step) => step.projectId === project.id && step.phase === phase,
    )
    .sort((a, b) => a.order - b.order);
  const templateStages = (template?.stages ?? []).filter(
    (stage) => stage.phase === phase,
  );

  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const priorComplete = PHASE_ORDER.slice(0, phaseIndex).every((prior) => {
    const priorSteps = store.steps.filter(
      (step) => step.projectId === project.id && step.phase === prior,
    );
    if (priorSteps.length === 0) {
      return legacy && prior === "planning";
    }
    return priorSteps.every(
      (step) => step.status === "completed" || step.status === "skipped",
    );
  });
  const readyToStart =
    canManage &&
    canEdit &&
    phase !== "closing" &&
    (phase === "prospek" ? draft.length > 0 : priorComplete && draft.length > 0);

  const switchPhase = (next: Phase) => {
    if (next === phase) return;
    if (
      dirty &&
      !window.confirm(
        "Ada perubahan yang belum disimpan pada fase ini. Pindah fase akan membuang perubahan tersebut. Lanjutkan?",
      )
    ) {
      return;
    }
    setPhase(next);
    setDraft(stepsToStages(phaseStepsFor(project.id, next)));
    setDirty(false);
    setErrors([]);
  };

  const updateStage = (id: string, patch: Partial<TemplateStage>) => {
    setDraft((current) =>
      current.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage)),
    );
    setDirty(true);
  };

  const addStage = () => {
    const order = draft.length + 1;
    setDraft((current) => [
      ...current,
      createManualStage(phase, order, uid("stage")),
    ]);
    setDirty(true);
  };

  const moveStage = (id: string, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.findIndex((stage) => stage.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return normalize(next);
    });
    setDirty(true);
  };

  const deleteStage = (id: string) => {
    setDraft((current) => normalize(current.filter((stage) => stage.id !== id)));
    setDirty(true);
  };

  const applyTemplate = () => {
    if (templateStages.length === 0) return;
    if (
      draft.length > 0 &&
      !window.confirm(
        "Isi dari template akan mengganti tahap fase ini. Lanjutkan?",
      )
    ) {
      return;
    }
    setDraft(normalize(templateStages.map(cloneStage)));
    setDirty(true);
    setErrors([]);
  };

  const saveDraft = () => {
    const next = normalize(draft.map((stage) => ({ ...stage, phase })));
    const validation = journeyPhaseErrors(
      project,
      phase,
      next,
      store.steps.filter((step) => step.projectId === project.id),
    );
    if (!validation.ok) {
      setErrors(validation.errors);
      toast.error(validation.errors[0] ?? "Tahapan belum valid.");
      return false;
    }
    const ok = usePrototypeStore
      .getState()
      .setPhaseStructure(project.id, phase, next);
    if (!ok) {
      toast.error("Fase tidak bisa disimpan.");
      return false;
    }
    setDirty(false);
    setErrors([]);
    setDraft(stepsToStages(phaseStepsFor(project.id, phase)));
    toast.success(`Fase ${PHASE_LABEL[phase]} disimpan.`);
    return true;
  };

  const startPhase = () => {
    if (dirty && !saveDraft()) return;
    const steps = phaseStepsFor(project.id, phase);
    if (phase === "prospek") {
      const validation = journeyStartErrors(project, steps, template);
      if (!validation.ok) {
        setErrors(validation.errors);
        toast.error(validation.errors[0] ?? "Journey belum bisa dimulai.");
        return;
      }
    }
    const ok = usePrototypeStore.getState().startPhase(project.id, phase);
    if (!ok) {
      toast.error(
        phase === "prospek"
          ? "Prospek belum bisa dimulai."
          : "Fase sebelumnya harus selesai dan minimal satu tahap harus disusun.",
      );
      return;
    }
    setDirty(false);
    setErrors([]);
    setDraft(stepsToStages(phaseStepsFor(project.id, phase)));
    toast.success(`Fase ${PHASE_LABEL[phase]} dimulai.`);
  };

  const empty = canEdit ? draft.length === 0 : phaseSteps.length === 0;

  return (
    <SectionCard
      title="Journey Management"
      description="Pilih fase, lalu susun tahapnya. Template hanya rekomendasi; tahap bisa ditambah, diubah, diurutkan, dan dihapus sebelum fase dimulai."
      actions={
        canManage && canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            {templateStages.length > 0 ? (
              <Button variant="outline" size="sm" onClick={applyTemplate}>
                <RotateCcw className="size-3.5" /> Isi dari template
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={addStage}>
              <Plus className="size-3.5" /> Tahap
            </Button>
            {dirty ? (
              <Button size="sm" onClick={saveDraft}>
                Simpan
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {PHASE_ORDER.map((item) => {
            const selected = item === phase;
            const state = project.phaseStates?.[item];
            return (
              <button
                key={item}
                type="button"
                onClick={() => switchPhase(item)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted/60",
                )}
              >
                <span className="block text-[11px] font-semibold">
                  {PHASE_LABEL[item]}
                </span>
                <span className="text-muted-foreground block text-[10px]">
                  {phaseLabel(project, item)}
                </span>
                {state?.startedAt ? (
                  <span className="text-muted-foreground block text-[9px]">
                    Dimulai
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <p className="text-muted-foreground text-[11px]">
          {PHASE_HINT[phase]} · {phaseLabel(project, phase)}
        </p>

        {errors.length > 0 ? (
          <ul className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}

        {phase === "closing" ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs">
            <p className="font-medium">Closing dikelola oleh sistem.</p>
            <p className="text-muted-foreground mt-1">
              Saat Running dimulai, BAST dan Invoice selalu ditambahkan sebagai
              form keuangan paralel, ditambah Pembayaran atau tahap Closing dari
              template. Tahap Closing tidak bisa diubah manual.
            </p>
          </div>
        ) : null}

        {!phaseState && phase !== "prospek" ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs">
            <p className="font-medium">
              Fase {PHASE_LABEL[phase]} belum dibuka.
            </p>
            <p className="text-muted-foreground mt-1">
              Fase ini bisa disusun setelah Prospek menang (gerbang persetujuan
              klien).
            </p>
          </div>
        ) : null}

        {canEdit && phase !== "closing" ? (
          <div className="space-y-2">
            {empty ? (
              <EmptyState
                icon={Layers}
                title="Belum ada tahap"
                description="Tambahkan tahap manual atau isi dari template."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={addStage}>
                      <Plus className="size-3.5" /> Tahap
                    </Button>
                    {templateStages.length > 0 ? (
                      <Button size="sm" variant="outline" onClick={applyTemplate}>
                        <RotateCcw className="size-3.5" /> Isi dari template
                      </Button>
                    ) : null}
                  </div>
                }
              />
            ) : (
              draft.map((stage, index) => (
                <div
                  key={stage.id}
                  className="rounded-lg border bg-card p-2"
                >
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={stage.name}
                      onChange={(event) =>
                        updateStage(stage.id, { name: event.target.value })
                      }
                      className="h-8 text-xs"
                      aria-label="Nama tahap"
                    />
                    <span className="bg-muted shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold">
                      {STAGE_KIND_LABEL[stage.kind]}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Naikkan tahap"
                      disabled={index === 0}
                      onClick={() => moveStage(stage.id, -1)}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Turunkan tahap"
                      disabled={index === draft.length - 1}
                      onClick={() => moveStage(stage.id, 1)}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Hapus tahap"
                      onClick={() => deleteStage(stage.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                    <NativeSelect
                      value={stage.kind}
                      onChange={(value) => {
                        const kind = value as StageKind;
                        updateStage(stage.id, {
                          kind,
                          financeKind:
                            kind === "finance_form"
                              ? stage.financeKind ?? "rab"
                              : undefined,
                          gateKind:
                            kind === "gate"
                              ? stage.gateKind ?? "go_no_go"
                              : undefined,
                          formTemplate:
                            kind === "form"
                              ? stage.formTemplate ??
                                formTemplateForTitle(stage.name)
                              : undefined,
                        });
                      }}
                      className="h-7 text-[11px]"
                    >
                      {Object.entries(STAGE_KIND_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect>

                    {stage.kind === "finance_form" ? (
                      <NativeSelect
                        value={stage.financeKind ?? "rab"}
                        onChange={(value) =>
                          updateStage(stage.id, {
                            financeKind: value as FormStepKey,
                          })
                        }
                        className="h-7 text-[11px]"
                      >
                        <option value="rab">RAB</option>
                        <option value="bast">BAST</option>
                        <option value="invoice">Invoice</option>
                        <option value="payment">Pembayaran</option>
                      </NativeSelect>
                    ) : null}

                    {stage.kind === "gate" ? (
                      <NativeSelect
                        value={stage.gateKind ?? "go_no_go"}
                        onChange={(value) =>
                          updateStage(stage.id, {
                            gateKind: value as GateKind,
                          })
                        }
                        className="h-7 text-[11px]"
                      >
                        {Object.entries(GATE_KIND_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </NativeSelect>
                    ) : null}

                    {stage.kind === "form" ? (
                      <Field label="Judul form" className="sm:col-span-2">
                        <Input
                          value={
                            (stage.formTemplate ??
                              formTemplateForTitle(stage.name)).title
                          }
                          onChange={(event) =>
                            updateStage(stage.id, {
                              formTemplate: {
                                ...(stage.formTemplate ??
                                  formTemplateForTitle(stage.name)),
                                title: event.target.value,
                              },
                            })
                          }
                          className="h-7 text-[11px]"
                          aria-label="Judul form"
                        />
                      </Field>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {!canEdit && phaseSteps.length > 0 ? (
          <div className="space-y-1.5">
            {phaseSteps.map((step) => (
              <div
                key={step.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11px]"
              >
                <span className="font-medium">{step.name}</span>
                <span className="text-muted-foreground">
                  {STAGE_KIND_LABEL[step.kind]} · {step.status}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {canManage && canEdit && phase !== "closing" ? (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <Button size="sm" disabled={!readyToStart} onClick={startPhase}>
              <CheckCircle2 className="size-3.5" />
              {phase === "prospek" ? "Mulai Prospek" : "Mulai fase"}
            </Button>
            <span className="text-muted-foreground text-[10px]">
              {phase === "prospek"
                ? "Prospek terkunci setelah journey dimulai."
                : "Fase sebelumnya harus selesai sebelum fase ini dimulai."}
            </span>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
