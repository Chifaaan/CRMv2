"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Copy,
  GripVertical,
  LayoutTemplate,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canManageTemplates,
  userById,
  validateTemplateStages,
} from "@/lib/prototype/domain";
import {
  GATE_KIND_LABEL,
  PHASE_HINT,
  PHASE_LABEL,
  PHASE_ORDER,
  STAGE_KIND_LABEL,
  type FormStepKey,
  type GateKind,
  type Phase,
  type ProjectTemplate,
  type StageKind,
  type TemplateStage,
  type TemplateTask,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  Field,
  NativeSelect,
  PageHeader,
  SectionCard,
} from "../ui";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneStages(stages: TemplateStage[]): TemplateStage[] {
  return stages.map((stage) => ({
    ...stage,
    tasks: stage.tasks.map((task) => ({ ...task })),
  }));
}

function normalize(stages: TemplateStage[]): TemplateStage[] {
  return stages.map((stage, index) => ({ ...stage, order: index + 1 }));
}

function starterStages(): TemplateStage[] {
  return normalize([
    {
      id: uid("stage"),
      name: "Brief Received",
      phase: "prospek",
      order: 1,
      kind: "checklist",
      required: true,
      weight: 1,
      tasks: [],
    },
    {
      id: uid("stage"),
      name: "Client Approval",
      phase: "prospek",
      order: 2,
      kind: "gate",
      gateKind: "client_approval",
      required: true,
      weight: 1,
      tasks: [],
    },
    {
      id: uid("stage"),
      name: "Kickoff",
      phase: "planning",
      order: 3,
      kind: "checklist",
      required: true,
      weight: 1,
      tasks: [],
    },
    {
      id: uid("stage"),
      name: "Eksekusi",
      phase: "running",
      order: 4,
      kind: "checklist",
      required: true,
      weight: 1,
      tasks: [],
    },
    {
      id: uid("stage"),
      name: "Laporan Akhir",
      phase: "closing",
      order: 5,
      kind: "checklist",
      required: true,
      weight: 1,
      tasks: [],
    },
  ]);
}

const KIND_CLASS: Record<StageKind, string> = {
  checklist: "bg-slate-100 text-slate-700",
  finance_form: "bg-sky-100 text-sky-700",
  gate: "bg-amber-100 text-amber-800",
};

function SortableStageRow({
  stage,
  selected,
  onSelect,
}: {
  stage: TemplateStage;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5",
        selected && "border-primary/50 ring-primary/20 ring-2",
        isDragging && "opacity-60",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground cursor-grab touch-none"
        aria-label={`Urutkan ${stage.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-xs font-medium">{stage.name}</span>
        <span className="text-muted-foreground block text-[10px]">
          {STAGE_KIND_LABEL[stage.kind]}
          {stage.gateKind ? ` · ${GATE_KIND_LABEL[stage.gateKind]}` : ""}
          {stage.financeKind ? ` · ${stage.financeKind.toUpperCase()}` : ""}
          {` · bobot ${stage.weight}`}
          {stage.required ? "" : " · opsional"}
          {stage.costBeforeCommitment ? " · berbiaya" : ""}
        </span>
      </button>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold",
          KIND_CLASS[stage.kind],
        )}
      >
        {STAGE_KIND_LABEL[stage.kind]}
      </span>
    </div>
  );
}

function TemplateEditor({
  template,
  onDone,
}: {
  template?: ProjectTemplate;
  onDone: () => void;
}) {
  const store = usePrototypeStore();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [projectType, setProjectType] = useState(
    template?.projectType ?? "Umum",
  );
  const [stages, setStages] = useState<TemplateStage[]>(
    template ? cloneStages(template.stages) : starterStages(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    template?.stages[0]?.id ?? null,
  );
  const [note, setNote] = useState("");
  const legacy = template?.legacy ?? false;
  const validation = validateTemplateStages(stages, { legacy });
  const selected = stages.find((stage) => stage.id === selectedId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const updateStage = (id: string, patch: Partial<TemplateStage>) => {
    setStages((current) =>
      current.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage)),
    );
  };

  const addStage = (phase: Phase) => {
    const stage: TemplateStage = {
      id: uid("stage"),
      name: `Tahap ${stages.filter((item) => item.phase === phase).length + 1}`,
      phase,
      order: 0,
      kind: "checklist",
      required: true,
      weight: 1,
      tasks: [],
    };
    setStages((current) => {
      const index = current.map((item) => item.phase).lastIndexOf(phase);
      const next =
        index === -1
          ? [...current, stage]
          : [...current.slice(0, index + 1), stage, ...current.slice(index + 1)];
      return normalize(next);
    });
    setSelectedId(stage.id);
  };

  const moveStageToPhase = (id: string, phase: Phase) => {
    setStages((current) => {
      const target = current.find((stage) => stage.id === id);
      if (!target || target.phase === phase) return current;
      const others = current.filter((stage) => stage.id !== id);
      const lastIndex = others
        .map((stage, index) => ({ stage, index }))
        .filter((item) => item.stage.phase === phase)
        .pop()?.index;
      const insertAt = lastIndex === undefined ? others.length : lastIndex + 1;
      return normalize([
        ...others.slice(0, insertAt),
        { ...target, phase },
        ...others.slice(insertAt),
      ]);
    });
  };

  const deleteStage = (id: string) => {
    const target = stages.find((stage) => stage.id === id);
    if (!target) return;
    if (target.kind === "gate" && target.gateKind === "client_approval") {
      toast.error("Gerbang menang tidak bisa dihapus.");
      return;
    }
    setStages((current) => normalize(current.filter((stage) => stage.id !== id)));
    if (selectedId === id) setSelectedId(null);
  };

  const onDragEnd = (phase: Phase, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStages((current) => {
      const phaseStages = current.filter((stage) => stage.phase === phase);
      const oldIndex = phaseStages.findIndex((stage) => stage.id === active.id);
      const newIndex = phaseStages.findIndex((stage) => stage.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      const moved = arrayMove(phaseStages, oldIndex, newIndex);
      const rebuilt = PHASE_ORDER.flatMap((item) =>
        item === phase ? moved : current.filter((stage) => stage.phase === item),
      );
      return normalize(rebuilt);
    });
  };

  const addTask = () => {
    if (!selected) return;
    const task: TemplateTask = {
      id: uid("ttask"),
      name: "Task baru",
      required: true,
    };
    updateStage(selected.id, { tasks: [...selected.tasks, task] });
  };

  const updateTask = (taskId: string, patch: Partial<TemplateTask>) => {
    if (!selected) return;
    updateStage(selected.id, {
      tasks: selected.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task,
      ),
    });
  };

  const save = () => {
    if (!validation.ok) {
      toast.error(validation.errors[0] ?? "Template belum valid.");
      return;
    }
    const id = store.saveTemplate({
      id: template?.id,
      name,
      description,
      projectType,
      stages,
      note,
    });
    if (!id) {
      toast.error("Gagal menyimpan template.");
      return;
    }
    toast.success(
      template ? "Versi template baru diterbitkan." : "Template dibuat.",
    );
    onDone();
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onDone}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="size-3.5" /> Kembali ke daftar template
      </button>

      <PageHeader
        title={template ? `Edit ${template.name}` : "Template baru"}
        description={
          template
            ? `Versi ${template.version}. Menyimpan membuat versi ${template.version + 1}; proyek lama tetap memakai salinannya.`
            : "Template dipakai sebagai cetakan tahap dan task saat proyek dibuat."
        }
        actions={
          <Button onClick={save}>
            <Save className="size-4" />
            {template ? "Simpan versi baru" : "Simpan template"}
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <SectionCard title="Info template">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama template">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: KOL Campaign"
                />
              </Field>
              <Field label="Jenis proyek">
                <Input
                  value={projectType}
                  onChange={(event) => setProjectType(event.target.value)}
                  placeholder="Contoh: KOL Campaign"
                />
              </Field>
              <Field label="Deskripsi" className="sm:col-span-2">
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  placeholder="Ringkasan penggunaan template"
                />
              </Field>
            </div>
            {legacy ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                Template legacy dikecualikan dari aturan “tepat satu gerbang
                menang” dan “satu tahap per fase”.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Pratinjau stepper"
            description="Urutan fase tetap. Tahap di dalam fase bisa diurutkan."
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {PHASE_ORDER.map((phase) => (
                <div key={phase} className="rounded-lg border bg-muted/20 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide">
                    {PHASE_LABEL[phase]}
                  </p>
                  <div className="mt-1 space-y-1">
                    {stages
                      .filter((stage) => stage.phase === phase)
                      .map((stage) => (
                        <span
                          key={stage.id}
                          className="block truncate rounded bg-card px-1.5 py-1 text-[10px] ring-1 ring-foreground/10"
                          title={stage.name}
                        >
                          {stage.name}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Tahap per fase"
            description="Tarik untuk mengurutkan di dalam fase. Pilih tahap untuk mengedit di panel samping."
          >
            <div className="space-y-4">
              {PHASE_ORDER.map((phase) => {
                const phaseStages = stages.filter(
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
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => onDragEnd(phase, event)}
                    >
                      <SortableContext
                        items={phaseStages.map((stage) => stage.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1.5">
                          {phaseStages.length === 0 ? (
                            <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-[11px]">
                              Belum ada tahap di fase ini.
                            </p>
                          ) : (
                            phaseStages.map((stage) => (
                              <SortableStageRow
                                key={stage.id}
                                stage={stage}
                                selected={selectedId === stage.id}
                                onSelect={() => setSelectedId(stage.id)}
                              />
                            ))
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title={selected ? `Tahap: ${selected.name}` : "Pilih tahap"}
            description={
              selected
                ? "Perubahan di sini disimpan saat versi baru diterbitkan."
                : "Klik salah satu tahap untuk mengedit."
            }
          >
            {selected ? (
              <div className="space-y-3">
                <Field label="Nama tahap">
                  <Input
                    value={selected.name}
                    onChange={(event) =>
                      updateStage(selected.id, { name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Deskripsi">
                  <Textarea
                    value={selected.description ?? ""}
                    onChange={(event) =>
                      updateStage(selected.id, {
                        description: event.target.value,
                      })
                    }
                    rows={2}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Fase">
                    <NativeSelect
                      value={selected.phase}
                      onChange={(value) =>
                        moveStageToPhase(selected.id, value as Phase)
                      }
                    >
                      {PHASE_ORDER.map((phase) => (
                        <option key={phase} value={phase}>
                          {PHASE_LABEL[phase]}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label="Jenis">
                    <NativeSelect
                      value={selected.kind}
                      onChange={(value) =>
                        updateStage(selected.id, {
                          kind: value as StageKind,
                          financeKind:
                            value === "finance_form"
                              ? selected.financeKind ?? "rab"
                              : undefined,
                          gateKind:
                            value === "gate"
                              ? selected.gateKind ?? "go_no_go"
                              : undefined,
                        })
                      }
                    >
                      {Object.entries(STAGE_KIND_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                {selected.kind === "finance_form" ? (
                  <Field label="Form keuangan">
                    <NativeSelect
                      value={selected.financeKind ?? "rab"}
                      onChange={(value) =>
                        updateStage(selected.id, {
                          financeKind: value as FormStepKey,
                        })
                      }
                    >
                      <option value="survey">Survey (legacy)</option>
                      <option value="rab">RAB</option>
                      <option value="bast">BAST</option>
                      <option value="invoice">Invoice</option>
                    </NativeSelect>
                  </Field>
                ) : null}
                {selected.kind === "gate" ? (
                  <Field label="Jenis gerbang">
                    <NativeSelect
                      value={selected.gateKind ?? "go_no_go"}
                      onChange={(value) =>
                        updateStage(selected.id, {
                          gateKind: value as GateKind,
                        })
                      }
                    >
                      {Object.entries(GATE_KIND_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Bobot progress">
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={selected.weight}
                      onChange={(event) =>
                        updateStage(selected.id, {
                          weight: Number(event.target.value) || 1,
                        })
                      }
                    />
                  </Field>
                  <Field label="Grup paralel" hint="Kosongkan bila tidak paralel">
                    <Input
                      value={selected.parallelGroup ?? ""}
                      onChange={(event) =>
                        updateStage(selected.id, {
                          parallelGroup: event.target.value || undefined,
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={selected.required}
                      onChange={(event) =>
                        updateStage(selected.id, {
                          required: event.target.checked,
                        })
                      }
                    />
                    Tahap wajib
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={selected.costBeforeCommitment ?? false}
                      onChange={(event) =>
                        updateStage(selected.id, {
                          costBeforeCommitment: event.target.checked,
                        })
                      }
                    />
                    Berbiaya sebelum komitmen
                  </label>
                </div>

                <div className="border-t pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold">Task default</h4>
                    <Button variant="outline" size="xs" onClick={addTask}>
                      <Plus className="size-3" /> Task
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {selected.tasks.length === 0 ? (
                      <p className="text-muted-foreground text-[11px]">
                        Belum ada task default.
                      </p>
                    ) : (
                      selected.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="space-y-1.5 rounded-lg border p-2"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={task.name}
                              onChange={(event) =>
                                updateTask(task.id, { name: event.target.value })
                              }
                              className="h-7 text-xs"
                              aria-label="Nama task"
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Hapus task"
                              onClick={() =>
                                updateStage(selected.id, {
                                  tasks: selected.tasks.filter(
                                    (item) => item.id !== task.id,
                                  ),
                                })
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Input
                              value={task.role ?? ""}
                              onChange={(event) =>
                                updateTask(task.id, { role: event.target.value })
                              }
                              placeholder="Peran"
                              className="h-7 text-xs"
                              aria-label="Peran task"
                            />
                            <Input
                              value={task.deliverable ?? ""}
                              onChange={(event) =>
                                updateTask(task.id, {
                                  deliverable: event.target.value,
                                })
                              }
                              placeholder="Deliverable"
                              className="h-7 text-xs"
                              aria-label="Deliverable task"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-[11px]">
                            <input
                              type="checkbox"
                              className="size-3.5"
                              checked={task.required}
                              onChange={(event) =>
                                updateTask(task.id, {
                                  required: event.target.checked,
                                })
                              }
                            />
                            Wajib
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteStage(selected.id)}
                >
                  <Trash2 className="size-3.5" /> Hapus tahap
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Belum ada tahap yang dipilih.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Simpan" description="Catatan perubahan versi.">
            <Field label="Catatan versi">
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Contoh: tambah tahap evaluasi"
              />
            </Field>
            {validation.errors.length > 0 ? (
              <div className="mt-3 space-y-1 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                {validation.errors.map((error) => (
                  <p key={error} className="flex items-start gap-1">
                    <AlertCircle className="mt-0.5 size-3 shrink-0" />
                    {error}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-emerald-700">
                Template valid.
              </p>
            )}
            <Button className="mt-3 w-full" onClick={save}>
              <Save className="size-4" />
              {template ? "Terbitkan versi baru" : "Simpan template"}
            </Button>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export function CrmTemplates() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [editingId, setEditingId] = useState<string | null>(null);

  const projectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of store.projects) {
      if (!project.templateId) continue;
      counts.set(
        project.templateId,
        (counts.get(project.templateId) ?? 0) + 1,
      );
    }
    return counts;
  }, [store.projects]);

  if (!currentUser || !canManageTemplates(currentUser)) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title="Akses ditolak"
        description="Hanya Admin dan PM yang dapat mengelola template."
      />
    );
  }

  if (editingId) {
    return (
      <TemplateEditor
        template={
          editingId === "new"
            ? undefined
            : store.templates.find((item) => item.id === editingId)
        }
        onDone={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Templates"
        description="Cetakan tahap dan task per jenis proyek. Mengedit template tidak mengubah proyek yang sudah dibuat."
        actions={
          <Button onClick={() => setEditingId("new")}>
            <Plus className="size-4" /> Template baru
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {store.templates.map((template) => {
          const used = projectCounts.get(template.id) ?? 0;
          return (
            <div
              key={template.id}
              className={cn(
                "bg-card ring-foreground/10 flex flex-col rounded-xl p-4 shadow-sm ring-1",
                template.status === "archived" && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-sm font-semibold">
                      {template.name}
                    </h3>
                    {template.legacy ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                        legacy
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-semibold",
                        template.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {template.status === "active" ? "Aktif" : "Diarsipkan"}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                    {template.description || "Tanpa deskripsi"}
                  </p>
                </div>
                <span className="text-muted-foreground shrink-0 text-[10px]">
                  v{template.version}
                </span>
              </div>

              <div className="text-muted-foreground mt-3 flex flex-wrap gap-3 text-[10px]">
                <span>{template.stages.length} tahap</span>
                <span>{used} proyek memakai</span>
                <span>{template.projectType}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setEditingId(template.id)}
                >
                  <Pencil className="size-3" /> Edit
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    const id = store.duplicateTemplate(template.id);
                    if (id) toast.success("Template diduplikat.");
                  }}
                >
                  <Copy className="size-3" /> Duplikat
                </Button>
                {template.status === "active" && !template.legacy ? (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      store.archiveTemplate(template.id);
                      toast.success("Template diarsipkan.");
                    }}
                  >
                    <Archive className="size-3" /> Arsipkan
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
