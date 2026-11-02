"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { List, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FilterSheetBody,
  filterSheetContentClassName,
  filterSheetDescriptionClassName,
  filterSheetFieldClassName,
  filterSheetFooterClassName,
  filterSheetHeaderClassName,
  filterSheetLabelClassName,
  filterSheetTitleClassName,
} from "@/components/ui/filter-sheet";
import { ResourceListToolbar } from "@/components/features/crud/resource-list-toolbar";
import {
  ActiveFilterChips,
  type ActiveFilterChip,
} from "@/components/features/crud/active-filter-chips";
import { cn } from "@/lib/utils";
import { formatKanbanTaskPublicId } from "@/components/features/board/board-task-utils";
import { taskTypeLabel } from "@/lib/task-types";

const PLAN_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export type SprintPlanTask = {
  id: string;
  taskNumber?: number;
  project?: { id: string; code: string } | null;
  title: string;
  type: string;
  priority: string;
  storyPoints: number | null;
  sprintId: string | null;
  status: string;
  tags?: string[];
  assignees?: { user: { id: string; name: string; image: string | null } }[];
};

const BACKLOG_DROP = "sprint-plan-backlog";
function sprintPaneId(sprintId: string) {
  return `sprint-plan-sprint-${sprintId}`;
}

function isBacklogTask(t: SprintPlanTask) {
  return (
    !t.sprintId &&
    !["done", "completed", "cancelled", "canceled"].includes(
      t.status.toLowerCase(),
    )
  );
}

function PlanPane({
  id,
  title,
  icon,
  count,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Card className="flex min-h-[320px] flex-1 flex-col">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 py-3">
        {icon}
        <span className="flex-1 text-sm font-semibold">{title}</span>
        <Badge variant="secondary" className="tabular-nums">
          {count}
        </Badge>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-md border border-dashed border-transparent p-2 transition-colors",
          isOver && "border-zinc-300 bg-zinc-100/80",
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

function TaskCardContent({ task }: { task: SprintPlanTask }) {
  return (
    <>
      <p className="font-medium leading-snug">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
        <span className="font-mono font-medium text-zinc-600">
          {formatKanbanTaskPublicId(task)}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {taskTypeLabel(task.type)}
        </Badge>
        <span className="font-medium text-zinc-600">{task.priority}</span>
      </div>
    </>
  );
}

function PlanCard({
  task,
  disabled,
}: {
  task: SprintPlanTask;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled,
  });

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        className="h-[72px] rounded-lg border border-dashed border-zinc-300 bg-zinc-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-sm transition-shadow",
        !disabled && "cursor-grab touch-none hover:shadow-md active:cursor-grabbing",
        disabled && "opacity-80",
      )}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
    >
      <TaskCardContent task={task} />
    </div>
  );
}

type Props = {
  planningSprintId: string;
  planningSprintName: string;
  tasks: SprintPlanTask[];
  readOnly: boolean;
  onAssignToSprint: (taskId: string, sprintId: string) => void;
  onRemoveFromSprint: (taskId: string) => void;
};

export function SprintPlanningBoard({
  planningSprintId,
  planningSprintName,
  tasks,
  readOnly,
  onAssignToSprint,
  onRemoveFromSprint,
}: Props) {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Filter (samakan behaviour dgn halaman board): draft saat sheet terbuka,
  // applied saat ditekan Apply.
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftAssignee, setDraftAssignee] = useState("");
  const [draftPriority, setDraftPriority] = useState("");
  const [draftTag, setDraftTag] = useState("");
  const [appliedAssignee, setAppliedAssignee] = useState("");
  const [appliedPriority, setAppliedPriority] = useState("");
  const [appliedTag, setAppliedTag] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Opsi filter dari tugas yang tersedia.
  const assigneeItems = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      for (const a of t.assignees ?? []) {
        if (a.user?.id) map.set(a.user.id, a.user.name);
      }
    }
    return [
      { value: "__all__", label: "All assignees" },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [tasks]);

  const tagItems = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) for (const tag of t.tags ?? []) set.add(tag);
    return [
      { value: "__all__", label: "All labels" },
      ...Array.from(set).map((tag) => ({ value: tag, label: tag })),
    ];
  }, [tasks]);

  const priorityItems = useMemo(
    () => [
      { value: "__all__", label: "All priorities" },
      ...PLAN_PRIORITY_OPTIONS,
    ],
    [],
  );

  const q = search.trim().toLowerCase();
  const matchesFilters = useMemo(() => {
    return (t: SprintPlanTask) => {
      if (
        q &&
        !t.title.toLowerCase().includes(q) &&
        !t.id.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (appliedPriority && t.priority !== appliedPriority) return false;
      if (appliedTag && !(t.tags ?? []).includes(appliedTag)) return false;
      if (
        appliedAssignee &&
        !(t.assignees ?? []).some((a) => a.user?.id === appliedAssignee)
      ) {
        return false;
      }
      return true;
    };
  }, [q, appliedPriority, appliedTag, appliedAssignee]);

  const backlogTasks = useMemo(
    () => tasks.filter(isBacklogTask).filter(matchesFilters),
    [tasks, matchesFilters],
  );

  const sprintTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.sprintId === planningSprintId)
        .filter(matchesFilters),
    [tasks, planningSprintId, matchesFilters],
  );

  const filterCount =
    (appliedAssignee ? 1 : 0) +
    (appliedPriority ? 1 : 0) +
    (appliedTag ? 1 : 0);

  function openFilter() {
    setDraftAssignee(appliedAssignee);
    setDraftPriority(appliedPriority);
    setDraftTag(appliedTag);
    setFilterOpen(true);
  }
  function applyFilters() {
    setAppliedAssignee(draftAssignee);
    setAppliedPriority(draftPriority);
    setAppliedTag(draftTag);
    setFilterOpen(false);
  }
  function clearFilters() {
    setDraftAssignee("");
    setDraftPriority("");
    setDraftTag("");
  }
  const chipItems: ActiveFilterChip[] = [
    appliedAssignee
      ? {
          id: "assignee",
          label: `Assignee: ${
            assigneeItems.find((i) => i.value === appliedAssignee)?.label ??
            appliedAssignee
          }`,
        }
      : null,
    appliedPriority
      ? {
          id: "priority",
          label: `Prioritas: ${
            priorityItems.find((i) => i.value === appliedPriority)?.label ??
            appliedPriority
          }`,
        }
      : null,
    appliedTag ? { id: "tag", label: `Label: ${appliedTag}` } : null,
  ].filter(Boolean) as ActiveFilterChip[];
  function removeChip(id: string) {
    if (id === "assignee") setAppliedAssignee("");
    if (id === "priority") setAppliedPriority("");
    if (id === "tag") setAppliedTag("");
  }
  const hasActiveQuery = Boolean(q) || filterCount > 0;

  const sprintDropId = sprintPaneId(planningSprintId);
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  function paneFromOver(overId: string | undefined): "backlog" | "sprint" | null {
    if (!overId) return null;
    if (overId === BACKLOG_DROP) return "backlog";
    if (overId === sprintDropId) return "sprint";
    const hit = tasks.find((t) => t.id === overId);
    if (!hit) return null;
    if (isBacklogTask(hit)) return "backlog";
    if (hit.sprintId === planningSprintId) return "sprint";
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (readOnly) return;
    const { active, over } = e;
    if (!over) return;
    const taskId = String(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const target = paneFromOver(String(over.id));
    if (!target) return;
    if (target === "backlog") {
      if (task.sprintId) onRemoveFromSprint(taskId);
      return;
    }
    if (target === "sprint") {
      if (task.sprintId !== planningSprintId) {
        onAssignToSprint(taskId, planningSprintId);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="mb-4 space-y-3">
        <ResourceListToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari backlog…"
          filterActiveCount={filterCount}
          onOpenFilter={openFilter}
          filterLabel="Filter tugas"
        />
        <ActiveFilterChips items={chipItems} onRemove={removeChip} />
      </div>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className={filterSheetContentClassName}>
          <SheetHeader className={filterSheetHeaderClassName}>
            <SheetTitle className={filterSheetTitleClassName}>
              Filter tugas
            </SheetTitle>
            <SheetDescription className={filterSheetDescriptionClassName}>
              Saring tugas di backlog dan sprint tanpa mengubah data.
            </SheetDescription>
          </SheetHeader>
          <FilterSheetBody>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Assignee</Label>
              <Select
                value={draftAssignee || "__all__"}
                onValueChange={(v) =>
                  setDraftAssignee(v === "__all__" ? "" : (v ?? ""))
                }
                items={assigneeItems}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {assigneeItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Prioritas</Label>
              <Select
                value={draftPriority || "__all__"}
                onValueChange={(v) =>
                  setDraftPriority(v === "__all__" ? "" : (v ?? ""))
                }
                items={priorityItems}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {priorityItems.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tagItems.length > 1 ? (
              <div className={filterSheetFieldClassName}>
                <Label className={filterSheetLabelClassName}>Label</Label>
                <Select
                  value={draftTag || "__all__"}
                  onValueChange={(v) =>
                    setDraftTag(v === "__all__" ? "" : (v ?? ""))
                  }
                  items={tagItems}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="All labels" />
                  </SelectTrigger>
                  <SelectContent>
                    {tagItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </FilterSheetBody>
          <SheetFooter
            className={cn(
              filterSheetFooterClassName,
              "flex-col sm:flex-row sm:justify-between",
            )}
          >
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Clear all
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFilterOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={applyFilters}>
                Apply
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <PlanPane
          id={BACKLOG_DROP}
          title="Backlog (belum sprint)"
          icon={<List className="h-4 w-4 text-zinc-500" />}
          count={backlogTasks.length}
        >
          {backlogTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {hasActiveQuery
                ? "Tidak ada tugas cocok pencarian/filter."
                : "Semua tugas sudah masuk sprint atau selesai."}
            </p>
          ) : (
            backlogTasks.map((t) => (
              <PlanCard key={t.id} task={t} disabled={readOnly} />
            ))
          )}
        </PlanPane>
        <PlanPane
          id={sprintDropId}
          title={planningSprintName}
          icon={<Zap className="h-4 w-4 text-amber-600" />}
          count={sprintTasks.length}
        >
          {sprintTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Seret tugas ke sini untuk menambahkan ke sprint.
            </p>
          ) : (
            sprintTasks.map((t) => (
              <PlanCard key={t.id} task={t} disabled={readOnly} />
            ))
          )}
        </PlanPane>
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rounded-lg border border-zinc-300 bg-white p-3 text-sm shadow-xl ring-1 ring-zinc-200 opacity-95">
            <TaskCardContent task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
