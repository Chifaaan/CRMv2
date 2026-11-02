"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { ArrowRightLeft, LayoutGrid, List, Plus, Rows } from "lucide-react";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import { useProjectDetail } from "../project-detail-context";
import { ActiveFilterChips } from "@/components/features/crud/active-filter-chips";
import { ResourceListToolbar } from "@/components/features/crud/resource-list-toolbar";
import {
  KanbanBoard,
  type KanbanTask,
} from "@/components/features/board/KanbanBoard";
import { useProjectBoardKanbanInfinite } from "@/components/features/board/use-kanban-board-infinite";
import { BoardTaskListView } from "@/components/features/board/BoardTaskListView";
import { TaskFormSheet } from "@/components/features/tasks/TaskFormSheet";
import { BoardListSortFilterFields } from "@/components/features/board/board-list-sort-filter-fields";
import {
  DEFAULT_LIST_SORT_DIR,
  DEFAULT_LIST_SORT_KEY,
  DEFAULT_LIST_STALE_PRESET,
  type ListSortKey,
  type StalePreset,
  type TaskListSortKey,
} from "@/components/features/board/board-task-utils";
import { useClampListPage } from "@/lib/hooks/use-clamp-list-page";
import { TaskDetailSheet } from "@/components/features/tasks/TaskDetailSheet";
import { useTaskStatusUpdate } from "@/hooks/use-task-status-update";
import {
  isParkingLotBoardStatus,
  ParkingLotReasonModal,
} from "@/components/features/tasks/ParkingLotReasonModal";
import { Button } from "@/components/ui/button";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LIST_PAGE_SIZE,
  type ListPageSize,
} from "@/lib/list-pagination";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  canCreateInProjectContext,
  canOpenTaskFormEditor,
  canRunFullTaskListOpsInProject,
  isMyTasksBoardReadOnlyRole,
} from "@/lib/project-detail-permissions";
import {
  TaskTransferConfirmDialog,
  TaskTransferPickProjectDialog,
} from "@/components/features/tasks/TaskTransferModals";
import type {
  TransferTargetProject,
  TransferTasksResponse,
} from "@/components/features/tasks/task-transfer-types";

type MemberRow = {
  user: { id: string; name: string; role: string };
};

type SprintRow = { id: string; name: string; status: string };

type TaskListResponse = {
  data: KanbanTask[];
  meta: { total: number; page: number; take: number; pages: number };
};

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const BOARD_PRIORITY_FILTER_ITEMS = [
  { value: "__all__", label: "All priorities" },
  ...PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
];

export function BoardPageClient() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const taskQuery = searchParams.get("task")?.trim() ?? "";
  const { project } = useProjectDetail();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = String(
    (session?.user as { role?: string } | undefined)?.role ?? "",
  )
    .trim()
    .toLowerCase();
  /** Viewer/client saja; developer boleh drag status di board (backend: hanya task yang di-assign). */
  const readOnly = isMyTasksBoardReadOnlyRole(role);
  const canCreateTask = canCreateInProjectContext(role);
  const canOpenTaskEditor = canOpenTaskFormEditor(role);
  const canTransferTasks = canRunFullTaskListOpsInProject(role);

  /** Session/role dari client; di SSR kosong — defer UI bergantung role untuk hindari hydration mismatch. */
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => {
    setClientReady(true);
  }, []);

  const [search, setSearch] = useState("");
  const [listSelected, setListSelected] = useState<Set<string>>(new Set());
  const [transferPickOpen, setTransferPickOpen] = useState(false);
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [boardView, setBoardView] = useState<"board" | "list">("board");
  const [swimlaneMode, setSwimlaneMode] = useState(false);
  const [listSortKey, setListSortKey] =
    useState<TaskListSortKey>(DEFAULT_LIST_SORT_KEY);
  const [listSortDir, setListSortDir] =
    useState<"asc" | "desc">(DEFAULT_LIST_SORT_DIR);
  const [listStale, setListStale] = useState<StalePreset>(
    DEFAULT_LIST_STALE_PRESET,
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftAssignee, setDraftAssignee] = useState("");
  const [draftPriority, setDraftPriority] = useState("");
  const [draftTag, setDraftTag] = useState("");
  const [draftSprint, setDraftSprint] = useState("");
  const [draftListSortKey, setDraftListSortKey] =
    useState<TaskListSortKey>(DEFAULT_LIST_SORT_KEY);
  const [draftListSortDir, setDraftListSortDir] =
    useState<"asc" | "desc">(DEFAULT_LIST_SORT_DIR);
  const [draftListStale, setDraftListStale] = useState<StalePreset>(
    DEFAULT_LIST_STALE_PRESET,
  );
  const [appliedAssignee, setAppliedAssignee] = useState("");
  const [appliedPriority, setAppliedPriority] = useState("");
  const [appliedTag, setAppliedTag] = useState("");
  const [appliedSprint, setAppliedSprint] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formDefaultStatus, setFormDefaultStatus] = useState<string>("backlog");
  const [followUpReferenceTaskIds, setFollowUpReferenceTaskIds] = useState<
    string[]
  >([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState<ListPageSize>(
    DEFAULT_LIST_PAGE_SIZE,
  );

  const replaceBoardTaskQuery = useCallback(
    (taskId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (taskId) params.set("task", taskId);
      else params.delete("task");
      const qs = params.toString();
      const path = pathname || "";
      router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const detailTaskId = taskQuery || null;
  const detailOpen = Boolean(detailTaskId);

  const boardKanbanBaseParams = useMemo(() => {
    const params: Record<string, string> = { projectId };
    if (search.trim()) params.search = search.trim();
    if (appliedAssignee) params.assigneeId = appliedAssignee;
    if (appliedPriority) params.priority = appliedPriority;
    if (appliedTag) params.tag = appliedTag;
    if (appliedSprint) params.sprintId = appliedSprint;
    return params;
  }, [
    projectId,
    search,
    appliedAssignee,
    appliedPriority,
    appliedTag,
    appliedSprint,
  ]);

  const kanbanBoard = useProjectBoardKanbanInfinite({
    baseParams: boardKanbanBaseParams,
    enabled: boardView === "board",
  });

  const listQueryFilters = useMemo(
    () => ({
      projectId,
      listSortKey,
      listSortDir,
      listStale,
      search: search.trim(),
      appliedAssignee,
      appliedPriority,
      appliedTag,
      appliedSprint,
    }),
    [
      projectId,
      listSortKey,
      listSortDir,
      listStale,
      search,
      appliedAssignee,
      appliedPriority,
      appliedTag,
      appliedSprint,
    ],
  );

  const listQ = useQuery({
    queryKey: [
      "tasks",
      projectId,
      "board-list",
      listQueryFilters,
      listPage,
      listPageSize,
    ],
    queryFn: async () => {
      const params: Record<string, string> = {
        projectId,
        page: String(listPage),
        take: String(listPageSize),
        sortBy: listSortKey,
        sortDir: listSortDir,
      };
      if (search.trim()) params.search = search.trim();
      if (appliedAssignee) params.assigneeId = appliedAssignee;
      if (appliedPriority) params.priority = appliedPriority;
      if (appliedTag) params.tag = appliedTag;
      if (appliedSprint) params.sprintId = appliedSprint;
      if (listStale !== "none") params.stalePreset = listStale;
      const res = await api.get<TaskListResponse>("/api/tasks", { params });
      return res.data;
    },
    enabled: boardView === "list",
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    setListPage(1);
  }, [listQueryFilters]);

  useClampListPage(listQ.data?.meta?.pages, setListPage);

  const handleListPageSizeChange = useCallback((next: ListPageSize) => {
    setListPageSize(next);
    setListPage(1);
  }, []);

  const handleListSortChange = useCallback(
    (sortKey: TaskListSortKey, sortDir: "asc" | "desc") => {
      setListSortKey(sortKey);
      setListSortDir(sortDir);
      setListPage(1);
    },
    [],
  );

  const membersQ = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const res = await api.get<MemberRow[]>(
        `/api/projects/${projectId}/members`,
      );
      return res.data;
    },
  });

  const sprintsQ = useQuery({
    queryKey: ["sprints", projectId, "board"],
    queryFn: async () => {
      const res = await api.get<SprintRow[]>("/api/sprints", {
        params: { projectId },
      });
      return res.data;
    },
  });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    const rows =
      boardView === "board"
        ? kanbanBoard.tasks
        : (listQ.data?.data ?? []);
    for (const t of rows) {
      for (const tag of t.tags ?? []) s.add(tag);
    }
    return [...s].sort();
  }, [boardView, kanbanBoard.tasks, listQ.data?.data]);

  const boardAssigneeFilterItems = useMemo(
    () => [
      { value: "__all__", label: "All assignees" },
      ...(membersQ.data ?? []).map((m) => ({
        value: m.user.id,
        label: m.user.name,
      })),
    ],
    [membersQ.data],
  );
  const boardTagFilterItems = useMemo(
    () => [
      { value: "__all__", label: "All labels" },
      ...allTags.map((tag) => ({ value: tag, label: tag })),
    ],
    [allTags],
  );
  const boardSprintFilterItems = useMemo(
    () => [
      { value: "__all__", label: "All sprints" },
      ...(sprintsQ.data ?? []).map((s) => ({
        value: s.id,
        label: s.name,
      })),
    ],
    [sprintsQ.data],
  );

  const openFilter = useCallback(() => {
    setDraftAssignee(appliedAssignee);
    setDraftPriority(appliedPriority);
    setDraftTag(appliedTag);
    setDraftSprint(appliedSprint);
    setDraftListSortKey(listSortKey);
    setDraftListSortDir(listSortDir);
    setDraftListStale(listStale);
    setFilterOpen(true);
  }, [
    appliedAssignee,
    appliedPriority,
    appliedTag,
    appliedSprint,
    listSortKey,
    listSortDir,
    listStale,
  ]);

  const applyFilters = useCallback(() => {
    setAppliedAssignee(draftAssignee);
    setAppliedPriority(draftPriority);
    setAppliedTag(draftTag);
    setAppliedSprint(draftSprint);
    setListSortKey(draftListSortKey);
    setListSortDir(draftListSortDir);
    setListStale(draftListStale);
    setFilterOpen(false);
  }, [
    draftAssignee,
    draftPriority,
    draftTag,
    draftSprint,
    draftListSortKey,
    draftListSortDir,
    draftListStale,
  ]);

  const clearFilters = useCallback(() => {
    setDraftAssignee("");
    setDraftPriority("");
    setDraftTag("");
    setDraftSprint("");
    setDraftListSortKey(DEFAULT_LIST_SORT_KEY);
    setDraftListSortDir(DEFAULT_LIST_SORT_DIR);
    setDraftListStale(DEFAULT_LIST_STALE_PRESET);
    setAppliedAssignee("");
    setAppliedPriority("");
    setAppliedTag("");
    setAppliedSprint("");
    setListSortKey(DEFAULT_LIST_SORT_KEY);
    setListSortDir(DEFAULT_LIST_SORT_DIR);
    setListStale(DEFAULT_LIST_STALE_PRESET);
    setSearch("");
  }, []);

  const filterCount =
    (appliedAssignee ? 1 : 0) +
    (appliedPriority ? 1 : 0) +
    (appliedTag ? 1 : 0) +
    (appliedSprint ? 1 : 0);

  const chipItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (appliedAssignee) {
      const m = membersQ.data?.find((x) => x.user.id === appliedAssignee);
      items.push({
        id: "assignee",
        label: `Assignee: ${m?.user.name ?? appliedAssignee}`,
      });
    }
    if (appliedPriority) {
      items.push({
        id: "priority",
        label: `Priority: ${appliedPriority}`,
      });
    }
    if (appliedTag) {
      items.push({ id: "tag", label: `Label: ${appliedTag}` });
    }
    if (appliedSprint) {
      const sp = sprintsQ.data?.find((s) => s.id === appliedSprint);
      items.push({
        id: "sprint",
        label: `Sprint: ${sp?.name ?? appliedSprint}`,
      });
    }
    return items;
  }, [
    appliedAssignee,
    appliedPriority,
    appliedTag,
    appliedSprint,
    membersQ.data,
    sprintsQ.data,
  ]);

  function removeChip(id: string) {
    if (id === "assignee") setAppliedAssignee("");
    if (id === "priority") setAppliedPriority("");
    if (id === "tag") setAppliedTag("");
    if (id === "sprint") setAppliedSprint("");
  }

  const kanbanTasks = kanbanBoard.tasks;

  const listMeta = listQ.data?.meta;

  const listDisplayTasks = useMemo(() => {
    const rows = listQ.data?.data ?? [];
    return rows.map((t) => ({
      ...t,
      updatedAt: t.updatedAt ?? t.createdAt,
    }));
  }, [listQ.data?.data]);

  const listSelectedIds = [...listSelected];
  const hasListSelection = listSelectedIds.length > 0;
  const allListPageSelected =
    listDisplayTasks.length > 0 &&
    listDisplayTasks.every((t) => listSelected.has(t.id));

  const transferTargetsQ = useQuery({
    queryKey: ["tasks", "transfer-targets", projectId],
    queryFn: async () => {
      const { data } = await api.get<TransferTargetProject[]>(
        "/api/tasks/transfer-targets",
        { params: { excludeProjectId: projectId } },
      );
      return data;
    },
    enabled: canTransferTasks,
  });

  const transferTargetLabel = useMemo(() => {
    const p = transferTargetsQ.data?.find((x) => x.id === transferTargetId);
    if (!p) return "";
    return p.name.trim() ? `${p.name.trim()} (${p.code})` : p.code;
  }, [transferTargetsQ.data, transferTargetId]);

  const transferMut = useMutation({
    mutationFn: async (body: { taskIds: string[]; targetProjectId: string }) => {
      const { data } = await api.post<TransferTasksResponse>(
        "/api/tasks/transfer",
        body,
      );
      return data;
    },
    onSuccess: (data) => {
      setListSelected(new Set());
      setTransferPickOpen(false);
      setTransferConfirmOpen(false);
      setTransferTargetId("");
      void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      void qc.invalidateQueries({
        queryKey: ["tasks", data.targetProjectId],
      });
      toast.success(
        data.transferred === 1
          ? "Task berhasil dipindahkan"
          : `${data.transferred} task berhasil dipindahkan`,
      );
    },
    onError: () => toast.error("Gagal memindahkan task"),
  });

  function toggleListSelect(id: string, on: boolean) {
    setListSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleListSelectAll(on: boolean) {
    if (!on) {
      setListSelected(new Set());
      return;
    }
    setListSelected(new Set(listDisplayTasks.map((t) => t.id)));
  }

  function openTransferPick() {
    setTransferTargetId("");
    setTransferPickOpen(true);
  }

  function proceedTransferConfirm() {
    setTransferPickOpen(false);
    setTransferConfirmOpen(true);
  }

  function runTransfer() {
    if (!transferTargetId || listSelectedIds.length === 0) return;
    transferMut.mutate({
      taskIds: listSelectedIds,
      targetProjectId: transferTargetId,
    });
  }

  const loadingBoard =
    boardView === "board" ? kanbanBoard.isInitialLoading : listQ.isPending;

  const {
    requestStatusChange,
    confirmParkingLotMove,
    cancelParkingLotMove,
    pendingMove,
    isPending: statusUpdatePending,
  } = useTaskStatusUpdate({
    invalidateQueryKeys: [["tasks", projectId]],
    userRole: role,
    getTaskStatus: (taskId) =>
      kanbanBoard.tasks.find((t) => t.id === taskId)?.status,
    getTaskSprintStatus: (taskId) =>
      kanbanBoard.tasks.find((t) => t.id === taskId)?.sprint?.status,
  });

  function openNewTask() {
    setFollowUpReferenceTaskIds([]);
    setFormDefaultStatus("backlog");
    setCreateModalOpen(true);
  }

  function openFollowUpTask(referenceTaskId: string) {
    setFollowUpReferenceTaskIds([referenceTaskId]);
    setFormDefaultStatus("backlog");
    setCreateModalOpen(true);
  }

  function openTaskDetail(id: string) {
    replaceBoardTaskQuery(id);
  }

  function openEditFromDetail() {
    const id = detailTaskId;
    replaceBoardTaskQuery(null);
    if (id) {
      setEditTaskId(id);
      setEditModalOpen(true);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Board</h2>
          <p className="text-sm text-zinc-600">
            {project.name} — Kanban with run-in pipeline and parking lot
            (Trackly-style).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5">
            <Button
              type="button"
              variant={boardView === "board" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1 px-2"
              onClick={() => setBoardView("board")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </Button>
            <Button
              type="button"
              variant={boardView === "list" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1 px-2"
              onClick={() => {
                if (boardView !== "list") setListPage(1);
                setBoardView("list");
              }}
            >
              <List className="h-3.5 w-3.5" />
              List
            </Button>
          </div>
          {boardView === "board" ? (
            <Button
              type="button"
              variant={swimlaneMode ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => setSwimlaneMode((v) => !v)}
            >
              <Rows className="h-3.5 w-3.5" />
              Swimlane
            </Button>
          ) : null}
          {clientReady && canCreateTask ? (
            <Button
              type="button"
              size="sm"
              className="gap-1"
              onClick={openNewTask}
            >
              <Plus className="h-3.5 w-3.5" />
              New task
            </Button>
          ) : null}
        </div>
      </div>

      <ResourceListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tasks, id, tags…"
        filterActiveCount={filterCount}
        onOpenFilter={openFilter}
        filterLabel="Board filters"
      />

      <ActiveFilterChips items={chipItems} onRemove={removeChip} />

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className={filterSheetContentClassName}>
          <SheetHeader className={filterSheetHeaderClassName}>
            <SheetTitle className={filterSheetTitleClassName}>
              Filter board
            </SheetTitle>
            <SheetDescription className={filterSheetDescriptionClassName}>
              Saring kartu di papan tanpa mengubah data tugas.
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
                items={boardAssigneeFilterItems}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {boardAssigneeFilterItems.map((it) => (
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
                items={BOARD_PRIORITY_FILTER_ITEMS}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {BOARD_PRIORITY_FILTER_ITEMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {allTags.length > 0 ? (
              <div className={filterSheetFieldClassName}>
                <Label className={filterSheetLabelClassName}>Label</Label>
                <Select
                  value={draftTag || "__all__"}
                  onValueChange={(v) =>
                    setDraftTag(v === "__all__" ? "" : (v ?? ""))
                  }
                  items={boardTagFilterItems}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="All labels" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardTagFilterItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {(sprintsQ.data ?? []).length > 0 ? (
              <div className={filterSheetFieldClassName}>
                <Label className={filterSheetLabelClassName}>Sprint</Label>
                <Select
                  value={draftSprint || "__all__"}
                  onValueChange={(v) =>
                    setDraftSprint(v === "__all__" ? "" : (v ?? ""))
                  }
                  items={boardSprintFilterItems}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="All sprints" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardSprintFilterItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <BoardListSortFilterFields
              sortKey={draftListSortKey as ListSortKey}
              sortDir={draftListSortDir}
              stale={draftListStale}
              onSortKeyChange={(v) => setDraftListSortKey(v)}
              onSortDirChange={setDraftListSortDir}
              onStaleChange={setDraftListStale}
            />
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

      <TaskFormSheet
        mode="create"
        open={createModalOpen}
        onOpenChange={(o) => {
          setCreateModalOpen(o);
          if (!o) setFollowUpReferenceTaskIds([]);
        }}
        projectId={projectId}
        defaultValues={{ status: formDefaultStatus }}
        initialReferenceTaskIds={followUpReferenceTaskIds}
        onSuccess={() =>
          void qc.invalidateQueries({ queryKey: ["tasks", projectId] })
        }
      />

      {editTaskId && canOpenTaskEditor ? (
        <TaskFormSheet
          mode="edit"
          open={editModalOpen}
          onOpenChange={(o) => {
            setEditModalOpen(o);
            if (!o) setEditTaskId(null);
          }}
          projectId={projectId}
          taskId={editTaskId}
          onSuccess={() =>
            void qc.invalidateQueries({ queryKey: ["tasks", projectId] })
          }
        />
      ) : null}

      <TaskDetailSheet
        taskId={detailTaskId}
        projectId={projectId}
        open={detailOpen}
        onOpenChange={(o) => {
          if (!o) replaceBoardTaskQuery(null);
        }}
        onUpdated={() =>
          void qc.invalidateQueries({ queryKey: ["tasks", projectId] })
        }
        presentation="trackly"
        syncBoardDeepLink
        onRequestEdit={
          canOpenTaskEditor ? openEditFromDetail : undefined
        }
        onRequestCreateFollowUp={
          canCreateTask ? openFollowUpTask : undefined
        }
        onDuplicated={(newTaskId) => replaceBoardTaskQuery(newTaskId)}
      />

      {loadingBoard ? (
        <Skeleton className="h-[420px] w-full rounded-lg" />
      ) : boardView === "list" ? (
        !listMeta?.total ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 py-16 text-center">
            <p className="text-sm font-medium text-zinc-700">
              No tasks match list filters
            </p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              Adjust stale filters, toolbar search, or board filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <BoardTaskListView
              tasks={listDisplayTasks}
              readOnly={readOnly}
              selectable={canTransferTasks}
              selected={listSelected}
              onToggleSelect={toggleListSelect}
              onToggleSelectAll={toggleListSelectAll}
              allPageSelected={allListPageSelected}
              onOpenTask={openTaskDetail}
              serverSort={{
                sortKey: listSortKey,
                sortDir: listSortDir,
                onSortChange: handleListSortChange,
              }}
            />
            <ListPaginationBar
              total={listMeta.total}
              page={listPage}
              pageSize={listPageSize}
              onPageChange={setListPage}
              onPageSizeChange={handleListPageSizeChange}
              disabled={listQ.isFetching}
            />
          </div>
        )
      ) : kanbanTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 py-16 text-center">
          <p className="text-sm font-medium text-zinc-700">No tasks to show</p>
          <p className="mt-1 max-w-sm text-xs text-zinc-500">
            Adjust filters or create a task. Parking-lot statuses (on hold,
            cancelled) appear in the lower section.
          </p>
          {clientReady && canCreateTask ? (
            <Button
              type="button"
              size="sm"
              className="mt-4"
              onClick={openNewTask}
            >
              New task
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <KanbanBoard
            tasks={kanbanTasks}
            readOnly={readOnly}
            swimlaneMode={swimlaneMode}
            onOpenTask={openTaskDetail}
            columnTotals={kanbanBoard.columnTotals}
            columnInfinite={kanbanBoard.columnInfinite}
            onMove={(taskId, newStatus) =>
              requestStatusChange(taskId, newStatus)
            }
          />
        </div>
      )}

      {hasListSelection && canTransferTasks && boardView === "list" ? (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-md">
          <span className="text-sm font-medium">
            {listSelectedIds.length} dipilih
          </span>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={openTransferPick}
          >
            <ArrowRightLeft className="size-3.5" />
            Transfer Task
          </Button>
        </div>
      ) : null}

      <TaskTransferPickProjectDialog
        open={transferPickOpen}
        onOpenChange={setTransferPickOpen}
        sourceProjectId={projectId}
        taskCount={listSelectedIds.length || 1}
        targetProjectId={transferTargetId}
        onTargetProjectIdChange={setTransferTargetId}
        onSubmit={proceedTransferConfirm}
      />

      <TaskTransferConfirmDialog
        open={transferConfirmOpen}
        onOpenChange={setTransferConfirmOpen}
        taskCount={listSelectedIds.length || 1}
        targetLabel={transferTargetLabel}
        pending={transferMut.isPending}
        onConfirm={runTransfer}
      />

      <ParkingLotReasonModal
        open={pendingMove != null}
        targetStatus={
          pendingMove && isParkingLotBoardStatus(pendingMove.status)
            ? pendingMove.status
            : null
        }
        onConfirm={confirmParkingLotMove}
        onCancel={cancelParkingLotMove}
        isPending={statusUpdatePending}
      />
    </div>
  );
}
