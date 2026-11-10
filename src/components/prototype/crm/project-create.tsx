"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Layers,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePrototypeStore } from "@/lib/prototype/store";
import { newProjectTemplates } from "@/lib/prototype/templates";
import {
  ensureMandatoryStages,
  isMandatoryStage,
  mandatoryStagesForPhases,
} from "@/lib/prototype/mandatory-steps";
import {
  canCreateProject,
  userById,
  validateTemplateStages,
} from "@/lib/prototype/domain";
import {
  GATE_KIND_LABEL,
  PHASE_HINT,
  PHASE_LABEL,
  PHASE_ORDER,
  PRIORITY_LABEL,
  STAGE_KIND_LABEL,
  type FormStepKey,
  type GateKind,
  type Phase,
  type Priority,
  type StageKind,
  type TemplateStage,
  type TemplateTask,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import { EmptyState, Field, NativeSelect, PageHeader, SectionCard } from "../ui";

const DRAFT_KEY = "crm-project-draft-v1";

const COVER_COLORS = [
  "#9f1239",
  "#1e40af",
  "#7c3aed",
  "#0f766e",
  "#b45309",
  "#0369a1",
  "#be123c",
  "#4d7c0f",
];

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneStages(stages: TemplateStage[]): TemplateStage[] {
  return stages.map((stage) => ({
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
  }));
}

function templateCreationStages(template?: { stages: TemplateStage[]; legacy?: boolean }) {
  const withoutProspek = (template?.stages ?? []).filter(
    (stage) => stage.phase !== "prospek",
  );
  return cloneStages(
    ensureMandatoryStages(withoutProspek, template?.legacy ?? false),
  );
}

function manualCreationStages() {
  return cloneStages(
    ensureMandatoryStages(mandatoryStagesForPhases(["finance"])),
  );
}

function prospekCreationStages(template?: { stages: TemplateStage[]; legacy?: boolean }) {
  const prospek = (template?.stages ?? []).filter(
    (stage) => stage.phase === "prospek",
  );
  return cloneStages(
    ensureMandatoryStages(
      prospek.length > 0 ? prospek : mandatoryStagesForPhases(["prospek"]),
      template?.legacy ?? false,
    ),
  );
}

function formTemplateFor(title: string): NonNullable<TemplateStage["formTemplate"]> {
  return {
    title,
    defaultFields: {
      executionDate: { enabled: true, required: true },
      location: { enabled: true, required: true },
      notes: { enabled: true, required: false },
      photos: { enabled: true, required: false },
    },
    fields: [],
  };
}

function normalize(stages: TemplateStage[]): TemplateStage[] {
  return stages.map((stage, index) => ({ ...stage, order: index + 1 }));
}

type Draft = {
  name: string;
  client: string;
  description: string;
  priority: Priority;
  startDate: string;
  targetEndDate: string;
  coverColor: string;
  templateId: string;
  managerId: string;
  mode: "template" | "manual";
  stages: TemplateStage[];
};

export function CrmProjectCreate() {
  const store = usePrototypeStore();
  const router = useRouter();
  const currentUser = userById(store, store.currentUserId);
  const activeTemplates = newProjectTemplates(store.templates);
  const [draft, setDraft] = useState<Draft>(() => ({
    name: "",
    client: "",
    description: "",
    priority: "medium",
    startDate: new Date().toISOString().slice(0, 10),
    targetEndDate: "",
    coverColor: COVER_COLORS[0],
    templateId: activeTemplates[0]?.id ?? "",
    managerId: "",
    mode: "template",
    stages: templateCreationStages(activeTemplates[0]),
  }));
  const [dirty, setDirty] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Draft;
        if (parsed?.stages?.length) {
          const restoredStages =
            parsed.mode === "manual"
              ? normalize([
                  ...parsed.stages,
                  ...mandatoryStagesForPhases(["finance"]),
                ])
              : parsed.stages;
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDraft({
            ...parsed,
            managerId: parsed.managerId ?? "",
            mode: parsed.mode ?? "template",
            stages: restoredStages,
          });
          setRestored(true);
        }
      }
    } catch {
      /* ignore broken draft */
    }
  }, []);

  useEffect(() => {
    if (!dirty) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore quota errors */
    }
  }, [draft, dirty]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const template = store.templates.find(
    (item) => item.id === draft.templateId,
  );
  const validation = validateTemplateStages(draft.stages, {
    legacy: template?.legacy,
  });
  const includesProspek = draft.stages.some(
    (stage) => stage.phase === "prospek",
  );
  const financeReady = ["bast", "invoice"].every((kind) =>
    draft.stages.some(
      (stage) => stage.phase === "finance" && stage.financeKind === kind,
    ),
  );
  const canSubmit =
    draft.name.trim().length > 0 &&
    (draft.mode === "manual" ? financeReady : validation.ok);
  const toggleProspek = () => {
    if (includesProspek) {
      patch({
        stages: normalize(
          draft.stages.filter((stage) => stage.phase !== "prospek"),
        ),
      });
      return;
    }
    patch({
      stages: normalize([
        ...prospekCreationStages(template),
        ...draft.stages,
      ]),
    });
  };

  const patch = (value: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...value }));
    setDirty(true);
  };

  const chooseTemplate = (templateId: string) => {
    const next = store.templates.find((item) => item.id === templateId);
    patch({
      templateId,
      stages: templateCreationStages(next),
    });
  };

  const updateStage = (id: string, value: Partial<TemplateStage>) => {
    patch({
      stages: draft.stages.map((stage) =>
        stage.id === id ? { ...stage, ...value } : stage,
      ),
    });
  };

  const moveStage = (id: string, direction: -1 | 1) => {
    const index = draft.stages.findIndex((stage) => stage.id === id);
    const target = draft.stages[index];
    if (!target) return;
    const phaseIndexes = draft.stages
      .map((stage, position) => ({ stage, position }))
      .filter((item) => item.stage.phase === target.phase)
      .map((item) => item.position);
    const localIndex = phaseIndexes.indexOf(index);
    const swapPosition = phaseIndexes[localIndex + direction];
    if (swapPosition === undefined) return;
    const next = [...draft.stages];
    [next[index], next[swapPosition]] = [next[swapPosition], next[index]];
    patch({ stages: normalize(next) });
  };

  const deleteStage = (id: string) => {
    const target = draft.stages.find((stage) => stage.id === id);
    if (!target) return;
    if (target.required || target.kind === "gate" || isMandatoryStage(target)) {
      toast.error("Tahap wajib dan gerbang tidak bisa dihapus.");
      return;
    }
    patch({ stages: normalize(draft.stages.filter((stage) => stage.id !== id)) });
  };

  const addStage = (phase: Phase) => {
    const stage: TemplateStage = {
      id: uid("stage"),
      name: `Tahap ${draft.stages.filter((item) => item.phase === phase).length + 1}`,
      phase,
      order: 0,
      kind: "form",
      formTemplate: formTemplateFor(`Tahap ${draft.stages.filter((item) => item.phase === phase).length + 1}`),
      required: false,
      weight: 1,
      tasks: [],
    };
    const index = draft.stages.map((item) => item.phase).lastIndexOf(phase);
    const next =
      index === -1
        ? [...draft.stages, stage]
        : [
            ...draft.stages.slice(0, index + 1),
            stage,
            ...draft.stages.slice(index + 1),
          ];
    patch({ stages: normalize(next) });
  };

  const addTask = (stageId: string) => {
    const stage = draft.stages.find((item) => item.id === stageId);
    if (!stage) return;
    const task: TemplateTask = {
      id: uid("ttask"),
      name: "Task baru",
      required: false,
    };
    updateStage(stageId, { tasks: [...stage.tasks, task] });
  };

  const summary = useMemo(
    () =>
      PHASE_ORDER.map((phase) => ({
        phase,
        count: draft.stages.filter((stage) => stage.phase === phase).length,
      })),
    [draft.stages],
  );

  if (!currentUser || !canCreateProject(currentUser)) {
    return (
      <EmptyState
        icon={Layers}
        title="Akses ditolak"
        description="Hanya Admin dan PM yang dapat membuat proyek."
      />
    );
  }

  const submit = () => {
    if (!draft.name.trim()) {
      toast.error("Nama proyek wajib diisi.");
      return;
    }
    if (draft.mode === "template") {
      if (!template) {
        toast.error("Pilih template terlebih dahulu.");
        return;
      }
      if (!validation.ok) {
        toast.error(validation.errors[0] ?? "Tahapan belum valid.");
        return;
      }
    } else if (!financeReady) {
      toast.error("Step wajib Finance (BAST dan Invoice) belum lengkap.");
      return;
    }
    const id = store.createProject({
      name: draft.name.trim(),
      client: draft.client.trim(),
      description: draft.description.trim(),
      priority: draft.priority,
      startDate: draft.startDate
        ? new Date(`${draft.startDate}T00:00:00`).toISOString()
        : "",
      targetEndDate: draft.targetEndDate
        ? new Date(`${draft.targetEndDate}T00:00:00`).toISOString()
        : "",
      coverColor: draft.coverColor,
      mode: draft.mode,
      templateId: draft.mode === "template" ? template?.id : undefined,
      managerId: draft.managerId,
      stages: draft.stages,
    });
    if (!id) {
      toast.error("Gagal membuat proyek.");
      return;
    }
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setDirty(false);
    toast.success(
      draft.mode === "template"
        ? "Proyek dibuat dari template."
        : "Proyek manual dibuat.",
    );
    router.push(`/crm/projects/${id}`);
  };

  return (
    <div className="space-y-5">
      <Link
        href="/crm/projects"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="size-3.5" /> Kembali ke projects
      </Link>

      <PageHeader
        title="Proyek baru"
        description="Pilih template agar tahapan dan step terbentuk otomatis, atau buat manual lalu susun step di Journey Management."
        actions={
          <Button onClick={submit} disabled={!canSubmit}>
            <CheckCircle2 className="size-4" /> Buat proyek
          </Button>
        }
      />

      {restored ? (
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-900">
          Draft sebelumnya dipulihkan. Perubahan tersimpan sampai form dikirim.
        </div>
      ) : null}

      <SectionCard title="Informasi proyek">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama proyek" className="sm:col-span-2">
            <Input
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="Contoh: Kampanye KOL Ramadan"
            />
          </Field>
          <Field label="Klien">
            <Input
              value={draft.client}
              onChange={(event) => patch({ client: event.target.value })}
              placeholder="Nama klien"
            />
          </Field>
          <Field label="Prioritas">
            <NativeSelect
              value={draft.priority}
              onChange={(value) => patch({ priority: value as Priority })}
            >
              {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Tanggal mulai">
            <Input
              type="date"
              value={draft.startDate}
              onChange={(event) => patch({ startDate: event.target.value })}
            />
          </Field>
          <Field label="Target selesai">
            <Input
              type="date"
              value={draft.targetEndDate}
              onChange={(event) => patch({ targetEndDate: event.target.value })}
            />
          </Field>
          <Field label="Deskripsi" className="sm:col-span-2">
            <Textarea
              value={draft.description}
              onChange={(event) => patch({ description: event.target.value })}
              rows={2}
              placeholder="Ringkasan proyek"
            />
          </Field>
          <Field label="Warna cover" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {COVER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => patch({ coverColor: color })}
                  className={cn(
                    "size-8 rounded-full ring-2 ring-offset-2",
                    draft.coverColor === color
                      ? "ring-foreground"
                      : "ring-transparent",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Pilih warna ${color}`}
                />
              ))}
            </div>
          </Field>
          <Field
            label="Mode proyek"
            hint="Dari template menyalin tahapan dan step template; Manual membuat step wajib Finance dan step lain diatur di Journey Management."
            className="sm:col-span-2"
          >
            <NativeSelect
              value={draft.mode}
              onChange={(value) => {
                const mode = value as "template" | "manual";
                if (mode === "manual") {
                  patch({ mode, stages: manualCreationStages() });
                  return;
                }
                const next =
                  activeTemplates.find((item) => item.id === draft.templateId) ??
                  activeTemplates[0];
                patch({
                  mode,
                  templateId: next?.id ?? "",
                  stages: templateCreationStages(next),
                });
              }}
            >
              <option value="template">Dari template</option>
              <option value="manual">Manual</option>
            </NativeSelect>
            {draft.mode === "manual" ? (
              <p className="text-muted-foreground mt-1 text-[11px]">
                Mode Manual: tahapan dan step dibuat di dalam proyek dan dapat
                diatur di Journey Management. Dua step wajib Finance (BAST dan
                Invoice) dibuat otomatis.
              </p>
            ) : null}
          </Field>
          <Field
            label="Template"
            hint="Satu proyek memakai tepat satu template."
            className="sm:col-span-2"
          >
            <NativeSelect
              value={draft.templateId}
              onChange={chooseTemplate}
              disabled={draft.mode === "manual"}
            >
              {activeTemplates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (v{item.version})
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Manager penanggung jawab"
            hint="Hanya user role Manager yang dapat dipilih."
            className="sm:col-span-2"
          >
            <NativeSelect
              value={draft.managerId}
              onChange={(value) => patch({ managerId: value })}
            >
              <option value="">Belum ditugaskan</option>
              {store.users
                .filter((user) => user.role === "manager")
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <Field
            label="Tahap Prospek"
            hint="Opsional. Bila disertakan, RAB dan Decision Win / Loss dibuat otomatis."
            className="sm:col-span-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={includesProspek ? "outline" : "default"}
                size="sm"
                onClick={toggleProspek}
              >
                {includesProspek
                  ? "Hapus tahapan Prospek"
                  : "Tambah tahapan Prospek"}
              </Button>
              <span className="text-muted-foreground text-[11px]">
                {includesProspek
                  ? "Fase Prospek disertakan dengan step wajib RAB + Decision."
                  : "Prospek tidak termasuk dalam proyek ini."}
              </span>
            </div>
          </Field>
        </div>
      </SectionCard>

      {draft.mode === "template" ? (
      <SectionCard
        title="Sesuaikan tahapan"
        description="Tahap dan task disalin dari template. Perubahan di sini hanya berlaku untuk proyek ini; step tetap dapat diatur di Journey Management."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              patch({ stages: templateCreationStages(template) })
            }
          >
            <RotateCcw className="size-3.5" /> Kembalikan ke template
          </Button>
        }
      >
        <div className="space-y-4">
          {PHASE_ORDER.map((phase) => {
            const phaseStages = draft.stages.filter(
              (stage) => stage.phase === phase,
            );
            return (
              <div key={phase}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold">
                      {PHASE_LABEL[phase]}
                    </h3>
                    <p className="text-muted-foreground text-[10px]">
                      {PHASE_HINT[phase]}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => addStage(phase)}
                  >
                    <Plus className="size-3" /> Tahap
                  </Button>
                </div>
                <div className="space-y-2">
                  {phaseStages.length === 0 ? (
                    <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-[11px]">
                      Belum ada tahap.
                    </p>
                  ) : (
                    phaseStages.map((stage) => (
                      <div
                        key={stage.id}
                        className="rounded-lg border bg-card p-2"
                      >
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={stage.name}
                            onChange={(event) =>
                              updateStage(stage.id, {
                                name: event.target.value,
                              })
                            }
                            className="h-7 text-xs"
                            aria-label="Nama tahap"
                          />
                          <span className="bg-muted shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold">
                            {STAGE_KIND_LABEL[stage.kind]}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold",
                              isMandatoryStage(stage)
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {isMandatoryStage(stage) ? "Wajib" : "Opsional"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Naikkan tahap"
                            disabled={isMandatoryStage(stage)}
                            onClick={() => moveStage(stage.id, -1)}
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Turunkan tahap"
                            disabled={isMandatoryStage(stage)}
                            onClick={() => moveStage(stage.id, 1)}
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Hapus tahap"
                            disabled={
                              stage.required ||
                              stage.kind === "gate" ||
                              isMandatoryStage(stage)
                            }
                            title={
                              stage.required ||
                              stage.kind === "gate" ||
                              isMandatoryStage(stage)
                                ? "Tahap wajib dan gerbang tidak bisa dihapus"
                                : "Hapus tahap"
                            }
                            onClick={() => deleteStage(stage.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                          <NativeSelect
                            disabled={isMandatoryStage(stage)}
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
                                      formTemplateFor(stage.name)
                                    : stage.formTemplate,
                              });
                            }}
                            className="h-7 text-[11px]"
                          >
                            {Object.entries(STAGE_KIND_LABEL).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </NativeSelect>
                          {stage.kind === "finance_form" ? (
                            <NativeSelect
                              disabled={isMandatoryStage(stage)}
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
                              disabled={isMandatoryStage(stage)}
                              value={stage.gateKind ?? "go_no_go"}
                              onChange={(value) =>
                                updateStage(stage.id, {
                                  gateKind: value as GateKind,
                                })
                              }
                              className="h-7 text-[11px]"
                            >
                              {Object.entries(GATE_KIND_LABEL).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </NativeSelect>
                          ) : null}
                          {stage.kind === "form" ? (
                            <Input
                              value={
                                (stage.formTemplate ??
                                  formTemplateFor(stage.name)).title
                              }
                              onChange={(event) =>
                                updateStage(stage.id, {
                                  formTemplate: {
                                    ...(stage.formTemplate ??
                                      formTemplateFor(stage.name)),
                                    title: event.target.value,
                                  },
                                })
                              }
                              placeholder="Judul form"
                              className="h-7 text-[11px]"
                              aria-label="Judul form"
                            />
                          ) : null}
                        </div>

                        {stage.kind === "gate" && stage.gateKind ? (
                          <p className="text-muted-foreground mt-1 text-[10px]">
                            {GATE_KIND_LABEL[stage.gateKind]}
                          </p>
                        ) : null}
                        {stage.costBeforeCommitment ? (
                          <p className="mt-1 text-[10px] text-amber-700">
                            Berbiaya sebelum komitmen.
                          </p>
                        ) : null}

                        {stage.kind === "simpro" && stage.tasks.length > 0 ? (
                          <details className="mt-2">
                            <summary className="text-muted-foreground cursor-pointer text-[10px] font-medium">
                              {stage.tasks.length} task default
                            </summary>
                            <div className="mt-1.5 space-y-1.5">
                              {stage.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-2"
                                >
                                  <Input
                                    value={task.name}
                                    onChange={(event) =>
                                      updateStage(stage.id, {
                                        tasks: stage.tasks.map((item) =>
                                          item.id === task.id
                                            ? {
                                                ...item,
                                                name: event.target.value,
                                              }
                                            : item,
                                        ),
                                      })
                                    }
                                    className="h-6 text-[11px]"
                                    aria-label="Nama task"
                                  />
                                  <label className="text-muted-foreground flex shrink-0 items-center gap-1 text-[10px]">
                                    <input
                                      type="checkbox"
                                      className="size-3.5"
                                      checked={task.required}
                                      onChange={(event) =>
                                        updateStage(stage.id, {
                                          tasks: stage.tasks.map((item) =>
                                            item.id === task.id
                                              ? {
                                                  ...item,
                                                  required: event.target.checked,
                                                }
                                              : item,
                                          ),
                                        })
                                      }
                                    />
                                    wajib
                                  </label>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Hapus task"
                                    onClick={() =>
                                      updateStage(stage.id, {
                                        tasks: stage.tasks.filter(
                                          (item) => item.id !== task.id,
                                        ),
                                      })
                                    }
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : null}
                        {stage.kind === "simpro" ? (
                          <Button
                            variant="link"
                            size="xs"
                            className="mt-1 h-auto px-0"
                            onClick={() => addTask(stage.id)}
                          >
                            <Plus className="size-3" /> Task
                          </Button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
      ) : (
        <SectionCard
          title="Step otomatis mode Manual"
          description="Step wajib Finance dibuat otomatis; step lain ditambahkan dan diatur di Journey Management."
        >
          <div className="space-y-1 text-xs">
            {draft.stages.map((stage) => (
              <div
                key={stage.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1"
              >
                <span>
                  {PHASE_LABEL[stage.phase]} · {stage.name}
                </span>
                <span className="bg-amber-100 rounded px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                  Wajib
                </span>
              </div>
            ))}
            {draft.stages.length === 0 ? (
              <p className="text-muted-foreground">Belum ada step.</p>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-2 text-[11px]">
            Prospek {includesProspek ? "disertakan" : "tidak disertakan"}; gunakan
            tombol Tahap Prospek di atas untuk menambah atau menghapusnya.
          </p>
        </SectionCard>
      )}

      <SectionCard
        title="Ringkasan sebelum dibuat"
        description="Step dapat diatur lagi di Journey Management setelah proyek dibuat."
      >
        <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((item) => (
            <div key={item.phase} className="rounded-lg border bg-muted/20 p-2">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                {PHASE_LABEL[item.phase]}
              </p>
              <p className="font-semibold">{item.count} tahap</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          {draft.mode === "template"
            ? `Template ${template?.name ?? "—"} v${template?.version ?? "—"} · ${draft.stages.length} tahap total (${draft.stages.filter(isMandatoryStage).length} wajib, ${draft.stages.filter((stage) => !isMandatoryStage(stage)).length} opsional).`
            : `Manual · ${draft.stages.filter(isMandatoryStage).length} step wajib; tahapan dan step lain diatur di Journey Management.`}
        </p>
        {draft.mode === "template" && validation.errors.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
            {validation.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={submit} disabled={!canSubmit}>
            <CheckCircle2 className="size-4" /> Buat proyek
          </Button>
          <Link href="/crm/projects">
            <Button variant="outline">Batal</Button>
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
