"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ChevronDown, LayoutGrid, List, Rows } from "lucide-react";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import { ActiveFilterChips } from "@/components/features/crud/active-filter-chips";
import { ResourceListToolbar } from "@/components/features/crud/resource-list-toolbar";
import {
  KanbanBoard,
  type KanbanTask,
} from "@/components/features/board/KanbanBoard";
import { useMyTasksBoardKanbanInfinite } from "@/components/features/board/use-kanban-board-infinite";
import { useMyRelatedTasksBoardKanbanInfinite } from "@/hooks/use-my-related-tasks-kanban";
import { BoardTaskListView } from "@/components/features/board/BoardTaskListView";
import { TaskDetailSheet } from "@/components/features/tasks/TaskDetailSheet";
import { ReminderModal } from "@/components/features/dashboard/reminder-modal";
import {
  useReminderModal,
  type ReminderTaskItem,
} from "@/lib/hooks/use-reminder-modal";
import {
  isParkingLotBoardStatus,
  ParkingLotReasonModal,
} from "@/components/features/tasks/ParkingLotReasonModal";
import { TaskFormSheet } from "@/components/features/tasks/TaskFormSheet";
import {
  canChangeTaskStatus,
  notifyTaskStatusChangeBlocked,
  isTaskStatusLockedBySprint,
  notifySprintLockedStatusBlocked,
} from "@/lib/task-status-restrictions";
import { BoardListSortFilterFields } from "@/components/features/board/board-list-sort-filter-fields";
import {
  DEFAULT_LIST_SORT_DIR,
  DEFAULT_LIST_SORT_KEY,
  DEFAULT_LIST_STALE_PRESET,
  type ListSortKey,
  type StalePreset,
  type TaskListSortKey,
} from "@/components/features/board/board-task-utils";
import { TASK_STATUS_OPTIONS } from "@/components/features/board/BoardTaskModal";
import { Button } from "@/components/ui/button";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FilterSheetBody,
  filterDialogContentClassName,
  filterDialogFooterClassName,
  filterDialogHeaderClassName,
  filterSheetDescriptionClassName,
  filterSheetFieldClassName,
  filterSheetLabelClassName,
  filterSheetTitleClassName,
} from "@/components/ui/filter-sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClampListPage } from "@/lib/hooks/use-clamp-list-page";
import { toast } from "sonner";
import {
  canOpenTaskFormEditor,
  isMyTasksBoardReadOnlyRole,
} from "@/lib/project-detail-permissions";
import {
  DEFAULT_LIST_PAGE_SIZE,
  type ListPageSize,
} from "@/lib/list-pagination";
import { isAdminOrPmRole } from "@/lib/role-constants";

type ProjectRow = { id: string; name: string; code: string };

type UserRow = { id: string; name: string };

type MyTasksListResponse = {
  data: KanbanTask[];
  meta: { total: number; page: number; take: number; pages: number };
};

type MyTasksTab = "mine" | "related";

const PRIORITY_FILTER_OPTIONS = [
  { value: "", label: "Semua priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function currentMonthRange() {
  const now = new Date();
  const toDateInput = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return {
    from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

export function MyTasksPageClient() {
  const defaultCardDateRange = useMemo(() => currentMonthRange(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = String(
    (session?.user as { role?: string } | undefined)?.role ?? "",
  )
    .trim()
    .toLowerCase();
  const readOnly = isMyTasksBoardReadOnlyRole(role);
  const canOpenTaskEditor = canOpenTaskFormEditor(role);
  const isAdmin = role === "admin";
  const canSeeRelatedTab = isAdminOrPmRole(role);

  const activeTab: MyTasksTab =
    canSeeRelatedTab && searchParams.get("tab") === "related"
      ? "related"
      : "mine";

  const setActiveTab = useCallback(
    (tab: MyTasksTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "related") params.set("tab", "related");
      else params.delete("tab");
      const qs = params.toString();
      router.replace(qs ? `/my-tasks?${qs}` : "/my-tasks", { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (activeTab === "related" && !canSeeRelatedTab) {
      router.replace("/my-tasks", { scroll: false });
    }
  }, [activeTab, canSeeRelatedTab, router]);

  const reminder = useReminderModal();

  /** Session/role dari client; di SSR kosong — defer UI bergantung role untuk hindari hydration mismatch. */
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => {
    setClientReady(true);
  }, []);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedSearch(searchInput.trim()),
      350,
    );
    return () => window.clearTimeout(t);
  }, [searchInput]);

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
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>([]);
  const [draftCardDateFrom, setDraftCardDateFrom] = useState(
    defaultCardDateRange.from,
  );
  const [draftCardDateTo, setDraftCardDateTo] = useState(
    defaultCardDateRange.to,
  );
  const [draftDueFrom, setDraftDueFrom] = useState("");
  const [draftDueTo, setDraftDueTo] = useState("");
  const [draftAssigneeId, setDraftAssigneeId] = useState("");
  const [draftListSortKey, setDraftListSortKey] =
    useState<TaskListSortKey>(DEFAULT_LIST_SORT_KEY);
  const [draftListSortDir, setDraftListSortDir] =
    useState<"asc" | "desc">(DEFAULT_LIST_SORT_DIR);
  const [draftListStale, setDraftListStale] = useState<StalePreset>(
    DEFAULT_LIST_STALE_PRESET,
  );

  const [appliedProjectIds, setAppliedProjectIds] = useState<string[]>([]);
  const [appliedCardDateFrom, setAppliedCardDateFrom] = useState(
    defaultCardDateRange.from,
  );
  const [appliedCardDateTo, setAppliedCardDateTo] = useState(
    defaultCardDateRange.to,
  );
  const [appliedDueFrom, setAppliedDueFrom] = useState("");
  const [appliedDueTo, setAppliedDueTo] = useState("");
  const [appliedAssigneeId, setAppliedAssigneeId] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createProjectId, setCreateProjectId] = useState<string | null>(null);
  const [followUpReferenceTaskIds, setFollowUpReferenceTaskIds] = useState<
    string[]
  >([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);
  const [pendingParkingMove, setPendingParkingMove] = useState<{
    taskId: string;
    status: string;
  } | null>(null);

  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [assigneePickerQuery, setAssigneePickerQuery] = useState("");

  const listFilters = useMemo(
    () => ({
      projectIds: [...appliedProjectIds].sort().join(","),
      cardDateFrom: appliedCardDateFrom,
      cardDateTo: appliedCardDateTo,
      dueFrom: appliedDueFrom,
      dueTo: appliedDueTo,
      assigneeId: isAdmin ? appliedAssigneeId : "",
      search: debouncedSearch,
    }),
    [
      appliedProjectIds,
      appliedCardDateFrom,
      appliedCardDateTo,
      appliedDueFrom,
      appliedDueTo,
      appliedAssigneeId,
      debouncedSearch,
      isAdmin,
    ],
  );

  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState<ListPageSize>(
    DEFAULT_LIST_PAGE_SIZE,
  );

  // --- Tab "Task Terkait" state (independent from Tab 1) ---
  const [relatedSearchInput, setRelatedSearchInput] = useState("");
  const [relatedDebouncedSearch, setRelatedDebouncedSearch] = useState("");
  useEffect(() => {
    const t = window.setTimeout(
      () => setRelatedDebouncedSearch(relatedSearchInput.trim()),
      350,
    );
    return () => window.clearTimeout(t);
  }, [relatedSearchInput]);

  const [relatedBoardView, setRelatedBoardView] = useState<"board" | "list">(
    "board",
  );
  const [relatedSwimlaneMode, setRelatedSwimlaneMode] = useState(false);
  const [relatedListSortKey, setRelatedListSortKey] =
    useState<TaskListSortKey>(DEFAULT_LIST_SORT_KEY);
  const [relatedListSortDir, setRelatedListSortDir] =
    useState<"asc" | "desc">(DEFAULT_LIST_SORT_DIR);
  const [relatedListStale, setRelatedListStale] = useState<StalePreset>(
    DEFAULT_LIST_STALE_PRESET,
  );
  const [relatedFilterOpen, setRelatedFilterOpen] = useState(false);
  const [relatedDraftProjectIds, setRelatedDraftProjectIds] = useState<
    string[]
  >([]);
  const [relatedDraftCardDateFrom, setRelatedDraftCardDateFrom] = useState(
    defaultCardDateRange.from,
  );
  const [relatedDraftCardDateTo, setRelatedDraftCardDateTo] = useState(
    defaultCardDateRange.to,
  );
  const [relatedDraftDueFrom, setRelatedDraftDueFrom] = useState("");
  const [relatedDraftDueTo, setRelatedDraftDueTo] = useState("");
  const [relatedDraftStatus, setRelatedDraftStatus] = useState("");
  const [relatedDraftPriority, setRelatedDraftPriority] = useState("");
  const [relatedDraftListSortKey, setRelatedDraftListSortKey] =
    useState<TaskListSortKey>(DEFAULT_LIST_SORT_KEY);
  const [relatedDraftListSortDir, setRelatedDraftListSortDir] =
    useState<"asc" | "desc">(DEFAULT_LIST_SORT_DIR);
  const [relatedDraftListStale, setRelatedDraftListStale] =
    useState<StalePreset>(DEFAULT_LIST_STALE_PRESET);
  const [relatedAppliedProjectIds, setRelatedAppliedProjectIds] = useState<
    string[]
  >([]);
  const [relatedAppliedCardDateFrom, setRelatedAppliedCardDateFrom] = useState(
    defaultCardDateRange.from,
  );
  const [relatedAppliedCardDateTo, setRelatedAppliedCardDateTo] = useState(
    defaultCardDateRange.to,
  );
  const [relatedAppliedDueFrom, setRelatedAppliedDueFrom] = useState("");
  const [relatedAppliedDueTo, setRelatedAppliedDueTo] = useState("");
  const [relatedAppliedStatus, setRelatedAppliedStatus] = useState("");
  const [relatedAppliedPriority, setRelatedAppliedPriority] = useState("");
  const [relatedListPage, setRelatedListPage] = useState(1);
  const [relatedListPageSize, setRelatedListPageSize] =
    useState<ListPageSize>(DEFAULT_LIST_PAGE_SIZE);

  const relatedListFilters = useMemo(
    () => ({
      projectIds: [...relatedAppliedProjectIds].sort().join(","),
      cardDateFrom: relatedAppliedCardDateFrom,
      cardDateTo: relatedAppliedCardDateTo,
      dueFrom: relatedAppliedDueFrom,
      dueTo: relatedAppliedDueTo,
      status: relatedAppliedStatus,
      priority: relatedAppliedPriority,
      search: relatedDebouncedSearch,
    }),
    [
      relatedAppliedProjectIds,
      relatedAppliedCardDateFrom,
      relatedAppliedCardDateTo,
      relatedAppliedDueFrom,
      relatedAppliedDueTo,
      relatedAppliedStatus,
      relatedAppliedPriority,
      relatedDebouncedSearch,
    ],
  );

  const myBoardKanbanBaseParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (listFilters.projectIds) params.projectIds = listFilters.projectIds;
    if (listFilters.cardDateFrom)
      params.cardDateFrom = listFilters.cardDateFrom;
    if (listFilters.cardDateTo) params.cardDateTo = listFilters.cardDateTo;
    if (listFilters.dueFrom) params.dueFrom = listFilters.dueFrom;
    if (listFilters.dueTo) params.dueTo = listFilters.dueTo;
    if (listFilters.assigneeId) params.assigneeId = listFilters.assigneeId;
    if (listFilters.search) params.search = listFilters.search;
    return params;
  }, [listFilters]);

  const myKanbanBoard = useMyTasksBoardKanbanInfinite({
    baseParams: myBoardKanbanBaseParams,
    enabled: activeTab === "mine" && boardView === "board",
  });

  const relatedBoardKanbanBaseParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (relatedListFilters.projectIds)
      params.projectIds = relatedListFilters.projectIds;
    if (relatedListFilters.cardDateFrom)
      params.cardDateFrom = relatedListFilters.cardDateFrom;
    if (relatedListFilters.cardDateTo)
      params.cardDateTo = relatedListFilters.cardDateTo;
    if (relatedListFilters.dueFrom)
      params.dueFrom = relatedListFilters.dueFrom;
    if (relatedListFilters.dueTo) params.dueTo = relatedListFilters.dueTo;
    if (relatedListFilters.status) params.status = relatedListFilters.status;
    if (relatedListFilters.priority)
      params.priority = relatedListFilters.priority;
    if (relatedListFilters.search) params.search = relatedListFilters.search;
    return params;
  }, [relatedListFilters]);

  const relatedKanbanBoard = useMyRelatedTasksBoardKanbanInfinite({
    baseParams: relatedBoardKanbanBaseParams,
    enabled: activeTab === "related" && relatedBoardView === "board",
  });

  const listQueryFilters = useMemo(
    () => ({
      ...listFilters,
      listSortKey,
      listSortDir,
      listStale,
    }),
    [listFilters, listSortKey, listSortDir, listStale],
  );

  const relatedListQueryFilters = useMemo(
    () => ({
      ...relatedListFilters,
      listSortKey: relatedListSortKey,
      listSortDir: relatedListSortDir,
      listStale: relatedListStale,
    }),
    [
      relatedListFilters,
      relatedListSortKey,
      relatedListSortDir,
      relatedListStale,
    ],
  );

  const listQ = useQuery({
    queryKey: ["tasks", "my", "list", listQueryFilters, listPage, listPageSize],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(listPage),
        take: String(listPageSize),
        sortBy: listSortKey,
        sortDir: listSortDir,
      };
      if (listFilters.projectIds) params.projectIds = listFilters.projectIds;
      if (listFilters.cardDateFrom)
        params.cardDateFrom = listFilters.cardDateFrom;
      if (listFilters.cardDateTo) params.cardDateTo = listFilters.cardDateTo;
      if (listFilters.dueFrom) params.dueFrom = listFilters.dueFrom;
      if (listFilters.dueTo) params.dueTo = listFilters.dueTo;
      if (listFilters.assigneeId) params.assigneeId = listFilters.assigneeId;
      if (listFilters.search) params.search = listFilters.search;
      if (listStale !== "none") params.stalePreset = listStale;
      const res = await api.get<MyTasksListResponse>("/api/tasks/my", {
        params,
      });
      return res.data;
    },
    enabled: activeTab === "mine" && boardView === "list",
    placeholderData: keepPreviousData,
  });

  const relatedListQ = useQuery({
    queryKey: [
      "tasks",
      "my-related",
      "list",
      relatedListQueryFilters,
      relatedListPage,
      relatedListPageSize,
    ],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(relatedListPage),
        take: String(relatedListPageSize),
        sortBy: relatedListSortKey,
        sortDir: relatedListSortDir,
      };
      if (relatedListFilters.projectIds)
        params.projectIds = relatedListFilters.projectIds;
      if (relatedListFilters.cardDateFrom)
        params.cardDateFrom = relatedListFilters.cardDateFrom;
      if (relatedListFilters.cardDateTo)
        params.cardDateTo = relatedListFilters.cardDateTo;
      if (relatedListFilters.dueFrom)
        params.dueFrom = relatedListFilters.dueFrom;
      if (relatedListFilters.dueTo) params.dueTo = relatedListFilters.dueTo;
      if (relatedListFilters.status) params.status = relatedListFilters.status;
      if (relatedListFilters.priority)
        params.priority = relatedListFilters.priority;
      if (relatedListFilters.search) params.search = relatedListFilters.search;
      if (relatedListStale !== "none") params.stalePreset = relatedListStale;
      const res = await api.get<MyTasksListResponse>(
        "/api/tasks/my/related",
        { params },
      );
      return res.data;
    },
    enabled: activeTab === "related" && relatedBoardView === "list",
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    setListPage(1);
  }, [listQueryFilters]);

  useEffect(() => {
    setRelatedListPage(1);
  }, [relatedListQueryFilters]);

  useClampListPage(listQ.data?.meta?.pages, setListPage);
  useClampListPage(relatedListQ.data?.meta?.pages, setRelatedListPage);

  const handleListPageSizeChange = useCallback((next: ListPageSize) => {
    setListPageSize(next);
    setListPage(1);
  }, []);

  const handleRelatedListPageSizeChange = useCallback((next: ListPageSize) => {
    setRelatedListPageSize(next);
    setRelatedListPage(1);
  }, []);

  const handleListSortChange = useCallback(
    (sortKey: TaskListSortKey, sortDir: "asc" | "desc") => {
      setListSortKey(sortKey);
      setListSortDir(sortDir);
      setListPage(1);
    },
    [],
  );

  const handleRelatedListSortChange = useCallback(
    (sortKey: TaskListSortKey, sortDir: "asc" | "desc") => {
      setRelatedListSortKey(sortKey);
      setRelatedListSortDir(sortDir);
      setRelatedListPage(1);
    },
    [],
  );

  const tasksPending =
    activeTab === "mine"
      ? boardView === "board"
        ? myKanbanBoard.isInitialLoading
        : listQ.isPending && !listQ.data
      : relatedBoardView === "board"
        ? relatedKanbanBoard.isInitialLoading
        : relatedListQ.isPending && !relatedListQ.data;

  const boardTasks = useMemo(() => myKanbanBoard.tasks, [myKanbanBoard.tasks]);
  const relatedBoardTasks = useMemo(
    () => relatedKanbanBoard.tasks,
    [relatedKanbanBoard.tasks],
  );

  const listRows = useMemo(
    () =>
      (listQ.data?.data ?? []).map((t) => ({
        ...t,
        updatedAt: t.updatedAt ?? t.createdAt,
      })),
    [listQ.data],
  );

  const relatedListRows = useMemo(
    () =>
      (relatedListQ.data?.data ?? []).map((t) => ({
        ...t,
        updatedAt: t.updatedAt ?? t.createdAt,
      })),
    [relatedListQ.data],
  );

  const tasksForLookup =
    activeTab === "mine"
      ? boardView === "board"
        ? boardTasks
        : listRows
      : relatedBoardView === "board"
        ? relatedBoardTasks
        : relatedListRows;

  function refetchTasks() {
    if (activeTab === "mine") {
      if (boardView === "board") {
        void qc.invalidateQueries({
          queryKey: ["tasks", "my", "kanban-col"],
          exact: false,
        });
      } else {
        void listQ.refetch();
      }
    } else {
      if (relatedBoardView === "board") {
        void qc.invalidateQueries({
          queryKey: ["tasks", "my-related", "kanban-col"],
          exact: false,
        });
      } else {
        void relatedListQ.refetch();
      }
    }
    void reminder.refetch();
  }

  const projectsQ = useQuery({
    queryKey: ["projects", "list"],
    queryFn: async () => {
      const res = await api.get<ProjectRow[]>("/api/projects");
      return res.data;
    },
  });

  const usersQ = useQuery({
    queryKey: ["users", "my-tasks-filter"],
    queryFn: async () => {
      const res = await api.get<UserRow[]>("/api/users");
      return res.data;
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!filterOpen) {
      setAssigneePickerOpen(false);
      setAssigneePickerQuery("");
    }
  }, [filterOpen]);

  const openFilter = useCallback(() => {
    setDraftProjectIds([...appliedProjectIds]);
    setDraftCardDateFrom(appliedCardDateFrom);
    setDraftCardDateTo(appliedCardDateTo);
    setDraftDueFrom(appliedDueFrom);
    setDraftDueTo(appliedDueTo);
    setDraftAssigneeId(appliedAssigneeId);
    setDraftListSortKey(listSortKey);
    setDraftListSortDir(listSortDir);
    setDraftListStale(listStale);
    setFilterOpen(true);
  }, [
    appliedProjectIds,
    appliedCardDateFrom,
    appliedCardDateTo,
    appliedDueFrom,
    appliedDueTo,
    appliedAssigneeId,
    listSortKey,
    listSortDir,
    listStale,
  ]);

  const applyFilters = useCallback(() => {
    setAppliedProjectIds([...draftProjectIds]);
    setAppliedCardDateFrom(draftCardDateFrom.trim());
    setAppliedCardDateTo(draftCardDateTo.trim());
    setAppliedDueFrom(draftDueFrom.trim());
    setAppliedDueTo(draftDueTo.trim());
    setAppliedAssigneeId(isAdmin ? draftAssigneeId : "");
    setListSortKey(draftListSortKey);
    setListSortDir(draftListSortDir);
    setListStale(draftListStale);
    setFilterOpen(false);
  }, [
    draftProjectIds,
    draftCardDateFrom,
    draftCardDateTo,
    draftDueFrom,
    draftDueTo,
    draftAssigneeId,
    draftListSortKey,
    draftListSortDir,
    draftListStale,
    isAdmin,
  ]);

  const clearFilters = useCallback(() => {
    setDraftProjectIds([]);
    setDraftCardDateFrom("");
    setDraftCardDateTo("");
    setDraftDueFrom("");
    setDraftDueTo("");
    setDraftAssigneeId("");
    setDraftListSortKey(DEFAULT_LIST_SORT_KEY);
    setDraftListSortDir(DEFAULT_LIST_SORT_DIR);
    setDraftListStale(DEFAULT_LIST_STALE_PRESET);
    setAppliedProjectIds([]);
    setAppliedCardDateFrom("");
    setAppliedCardDateTo("");
    setAppliedDueFrom("");
    setAppliedDueTo("");
    setAppliedAssigneeId("");
    setListSortKey(DEFAULT_LIST_SORT_KEY);
    setListSortDir(DEFAULT_LIST_SORT_DIR);
    setListStale(DEFAULT_LIST_STALE_PRESET);
    setSearchInput("");
    setDebouncedSearch("");
    setAssigneePickerOpen(false);
    setAssigneePickerQuery("");
    setListPage(1);
  }, []);

  const openRelatedFilter = useCallback(() => {
    setRelatedDraftProjectIds([...relatedAppliedProjectIds]);
    setRelatedDraftCardDateFrom(relatedAppliedCardDateFrom);
    setRelatedDraftCardDateTo(relatedAppliedCardDateTo);
    setRelatedDraftDueFrom(relatedAppliedDueFrom);
    setRelatedDraftDueTo(relatedAppliedDueTo);
    setRelatedDraftStatus(relatedAppliedStatus);
    setRelatedDraftPriority(relatedAppliedPriority);
    setRelatedDraftListSortKey(relatedListSortKey);
    setRelatedDraftListSortDir(relatedListSortDir);
    setRelatedDraftListStale(relatedListStale);
    setRelatedFilterOpen(true);
  }, [
    relatedAppliedProjectIds,
    relatedAppliedCardDateFrom,
    relatedAppliedCardDateTo,
    relatedAppliedDueFrom,
    relatedAppliedDueTo,
    relatedAppliedStatus,
    relatedAppliedPriority,
    relatedListSortKey,
    relatedListSortDir,
    relatedListStale,
  ]);

  const applyRelatedFilters = useCallback(() => {
    setRelatedAppliedProjectIds([...relatedDraftProjectIds]);
    setRelatedAppliedCardDateFrom(relatedDraftCardDateFrom.trim());
    setRelatedAppliedCardDateTo(relatedDraftCardDateTo.trim());
    setRelatedAppliedDueFrom(relatedDraftDueFrom.trim());
    setRelatedAppliedDueTo(relatedDraftDueTo.trim());
    setRelatedAppliedStatus(relatedDraftStatus);
    setRelatedAppliedPriority(relatedDraftPriority);
    setRelatedListSortKey(relatedDraftListSortKey);
    setRelatedListSortDir(relatedDraftListSortDir);
    setRelatedListStale(relatedDraftListStale);
    setRelatedFilterOpen(false);
  }, [
    relatedDraftProjectIds,
    relatedDraftCardDateFrom,
    relatedDraftCardDateTo,
    relatedDraftDueFrom,
    relatedDraftDueTo,
    relatedDraftStatus,
    relatedDraftPriority,
    relatedDraftListSortKey,
    relatedDraftListSortDir,
    relatedDraftListStale,
  ]);

  const clearRelatedFilters = useCallback(() => {
    setRelatedDraftProjectIds([]);
    setRelatedDraftCardDateFrom("");
    setRelatedDraftCardDateTo("");
    setRelatedDraftDueFrom("");
    setRelatedDraftDueTo("");
    setRelatedDraftStatus("");
    setRelatedDraftPriority("");
    setRelatedDraftListSortKey(DEFAULT_LIST_SORT_KEY);
    setRelatedDraftListSortDir(DEFAULT_LIST_SORT_DIR);
    setRelatedDraftListStale(DEFAULT_LIST_STALE_PRESET);
    setRelatedAppliedProjectIds([]);
    setRelatedAppliedCardDateFrom("");
    setRelatedAppliedCardDateTo("");
    setRelatedAppliedDueFrom("");
    setRelatedAppliedDueTo("");
    setRelatedAppliedStatus("");
    setRelatedAppliedPriority("");
    setRelatedListSortKey(DEFAULT_LIST_SORT_KEY);
    setRelatedListSortDir(DEFAULT_LIST_SORT_DIR);
    setRelatedListStale(DEFAULT_LIST_STALE_PRESET);
    setRelatedSearchInput("");
    setRelatedDebouncedSearch("");
    setRelatedListPage(1);
  }, []);

  const relatedFilterCount =
    relatedAppliedProjectIds.length +
    (relatedAppliedCardDateFrom ? 1 : 0) +
    (relatedAppliedCardDateTo ? 1 : 0) +
    (relatedAppliedDueFrom ? 1 : 0) +
    (relatedAppliedDueTo ? 1 : 0) +
    (relatedAppliedStatus ? 1 : 0) +
    (relatedAppliedPriority ? 1 : 0);

  const relatedChipItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (relatedAppliedProjectIds.length > 0) {
      const names = relatedAppliedProjectIds
        .map(
          (id) => projectsQ.data?.find((p) => p.id === id)?.name ?? id.slice(0, 8),
        )
        .join(", ");
      items.push({
        id: "projects",
        label: `${relatedAppliedProjectIds.length} project(s): ${names}`,
      });
    }
    if (relatedAppliedCardDateFrom) {
      items.push({ id: "cardDateFrom", label: `Start Date: ${relatedAppliedCardDateFrom}` });
    }
    if (relatedAppliedCardDateTo) {
      items.push({ id: "cardDateTo", label: `End Date: ${relatedAppliedCardDateTo}` });
    }
    if (relatedAppliedDueFrom) {
      items.push({ id: "dueFrom", label: `Due from ${relatedAppliedDueFrom}` });
    }
    if (relatedAppliedDueTo) {
      items.push({ id: "dueTo", label: `Due to ${relatedAppliedDueTo}` });
    }
    if (relatedAppliedStatus) {
      const label =
        TASK_STATUS_OPTIONS.find((s) => s.value === relatedAppliedStatus)
          ?.label ?? relatedAppliedStatus;
      items.push({ id: "status", label: `Status: ${label}` });
    }
    if (relatedAppliedPriority) {
      items.push({
        id: "priority",
        label: `Priority: ${relatedAppliedPriority}`,
      });
    }
    return items;
  }, [
    relatedAppliedProjectIds,
    relatedAppliedCardDateFrom,
    relatedAppliedCardDateTo,
    relatedAppliedDueFrom,
    relatedAppliedDueTo,
    relatedAppliedStatus,
    relatedAppliedPriority,
    projectsQ.data,
  ]);

  function removeRelatedChip(id: string) {
    if (id === "projects") setRelatedAppliedProjectIds([]);
    if (id === "cardDateFrom") setRelatedAppliedCardDateFrom("");
    if (id === "cardDateTo") setRelatedAppliedCardDateTo("");
    if (id === "dueFrom") setRelatedAppliedDueFrom("");
    if (id === "dueTo") setRelatedAppliedDueTo("");
    if (id === "status") setRelatedAppliedStatus("");
    if (id === "priority") setRelatedAppliedPriority("");
  }

  function toggleRelatedDraftProject(pid: string) {
    setRelatedDraftProjectIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid],
    );
  }

  const filterCount =
    appliedProjectIds.length +
    (appliedCardDateFrom ? 1 : 0) +
    (appliedCardDateTo ? 1 : 0) +
    (appliedDueFrom ? 1 : 0) +
    (appliedDueTo ? 1 : 0) +
    (isAdmin && appliedAssigneeId ? 1 : 0);

  const draftAssigneeLabel = useMemo(() => {
    if (!draftAssigneeId) return "Semua user";
    const u = usersQ.data?.find((x) => x.id === draftAssigneeId);
    return u?.name ?? (draftAssigneeId.length > 10 ? `${draftAssigneeId.slice(0, 8)}…` : draftAssigneeId);
  }, [draftAssigneeId, usersQ.data]);

  const filteredAssigneePickerRows = useMemo(() => {
    const all = usersQ.data ?? [];
    const q = assigneePickerQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter((u) => u.name.toLowerCase().includes(q));
  }, [usersQ.data, assigneePickerQuery]);

  const chipItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (appliedProjectIds.length > 0) {
      const names = appliedProjectIds
        .map(
          (id) => projectsQ.data?.find((p) => p.id === id)?.name ?? id.slice(0, 8),
        )
        .join(", ");
      items.push({
        id: "projects",
        label: `${appliedProjectIds.length} project(s): ${names}`,
      });
    }
    if (appliedCardDateFrom) {
      items.push({ id: "cardDateFrom", label: `Start Date: ${appliedCardDateFrom}` });
    }
    if (appliedCardDateTo) {
      items.push({ id: "cardDateTo", label: `End Date: ${appliedCardDateTo}` });
    }
    if (appliedDueFrom) {
      items.push({ id: "dueFrom", label: `Due from ${appliedDueFrom}` });
    }
    if (appliedDueTo) {
      items.push({ id: "dueTo", label: `Due to ${appliedDueTo}` });
    }
    if (isAdmin && appliedAssigneeId) {
      const u = usersQ.data?.find((x) => x.id === appliedAssigneeId);
      items.push({
        id: "assignee",
        label: `Assignee: ${u?.name ?? appliedAssigneeId}`,
      });
    }
    return items;
  }, [
    appliedProjectIds,
    appliedCardDateFrom,
    appliedCardDateTo,
    appliedDueFrom,
    appliedDueTo,
    appliedAssigneeId,
    isAdmin,
    projectsQ.data,
    usersQ.data,
  ]);

  function removeChip(id: string) {
    if (id === "projects") setAppliedProjectIds([]);
    if (id === "cardDateFrom") setAppliedCardDateFrom("");
    if (id === "cardDateTo") setAppliedCardDateTo("");
    if (id === "dueFrom") setAppliedDueFrom("");
    if (id === "dueTo") setAppliedDueTo("");
    if (id === "assignee") setAppliedAssigneeId("");
  }

  function toggleDraftProject(pid: string) {
    setDraftProjectIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid],
    );
  }

  const mutate = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason?: string;
    }) => {
      await api.patch(`/api/tasks/${id}`, {
        status,
        ...(reason ? { reason } : {}),
      });
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks", "my"] });
      await qc.cancelQueries({ queryKey: ["tasks", "my-related"] });

      const patchList = (old: MyTasksListResponse | undefined) =>
        old && typeof old === "object" && Array.isArray(old.data)
          ? {
              ...old,
              data: old.data.map((t) =>
                t.id === id ? { ...t, status } : t,
              ),
            }
          : old;

      qc.setQueriesData<MyTasksListResponse>(
        { queryKey: ["tasks", "my", "list"], exact: false },
        patchList,
      );
      qc.setQueriesData<MyTasksListResponse>(
        { queryKey: ["tasks", "my-related", "list"], exact: false },
        patchList,
      );
    },
    onError: (err: unknown) => {
      void qc.invalidateQueries({ queryKey: ["tasks", "my"] });
      void qc.invalidateQueries({ queryKey: ["tasks", "my-related"] });
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not update status";
      toast.error(msg);
    },
    onSuccess: () => {
      toast.success("Status updated");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["tasks", "my"] });
      void qc.invalidateQueries({ queryKey: ["tasks", "my-related"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  function requestBoardStatusChange(taskId: string, newStatus: string) {
    const task =
      boardTasks.find((t) => t.id === taskId) ??
      relatedBoardTasks.find((t) => t.id === taskId) ??
      listRows.find((t) => t.id === taskId) ??
      relatedListRows.find((t) => t.id === taskId);
    const currentStatus = task?.status;
    const sprintStatus = task?.sprint?.status;
    if (isTaskStatusLockedBySprint(sprintStatus)) {
      notifySprintLockedStatusBlocked(sprintStatus);
      return;
    }
    if (
      currentStatus &&
      !canChangeTaskStatus(role, currentStatus, newStatus)
    ) {
      notifyTaskStatusChangeBlocked(role, currentStatus, newStatus);
      return;
    }
    if (isParkingLotBoardStatus(newStatus)) {
      setPendingParkingMove({ taskId, status: newStatus });
      return;
    }
    mutate.mutate({ id: taskId, status: newStatus });
  }

  function openFollowUpTask(referenceTaskId: string, sourceProjectId: string) {
    setFollowUpReferenceTaskIds([referenceTaskId]);
    setCreateProjectId(sourceProjectId);
    setCreateModalOpen(true);
  }

  function confirmParkingLotMove(reason: string) {
    if (!pendingParkingMove) return;
    mutate.mutate(
      {
        id: pendingParkingMove.taskId,
        status: pendingParkingMove.status,
        reason,
      },
      { onSettled: () => setPendingParkingMove(null) },
    );
  }

  function taskRowByBoardKey(
    key: string,
    lists: typeof tasksForLookup,
  ): (typeof tasksForLookup)[0] | undefined {
    return lists.find(
      (x) => x.id === key || (x.shareToken != null && x.shareToken === key),
    );
  }

  function openTaskDetail(boardKey: string) {
    const t =
      taskRowByBoardKey(boardKey, tasksForLookup) ??
      taskRowByBoardKey(boardKey, boardTasks) ??
      taskRowByBoardKey(boardKey, listRows) ??
      taskRowByBoardKey(boardKey, relatedBoardTasks) ??
      taskRowByBoardKey(boardKey, relatedListRows);
    setDetailProjectId(t?.project?.id ?? null);
    setDetailTaskId(boardKey);
    setDetailOpen(true);
  }

  function openReminderTask(task: ReminderTaskItem) {
    setDetailProjectId(task.project.id);
    setDetailTaskId(task.id);
    setDetailOpen(true);
  }

  function openEditFromDetail() {
    const id = detailTaskId;
    const pid = detailProjectId;
    setDetailOpen(false);
    if (id && pid) {
      setEditTaskId(id);
      setEditProjectId(pid);
      setEditModalOpen(true);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">My tasks</h2>
            <div className="text-sm text-zinc-600">
              {!clientReady ? (
                <Skeleton className="mt-0.5 h-4 w-[min(100%,28rem)]" />
              ) : activeTab === "related" ? (
                "Task yang Anda buat atau Anda jadi PM reporter-nya — pantau progress di semua status."
              ) : isAdmin ? (
                "Semua task (opsional filter user & proyek). Ubah status di sini tercermin di board proyek."
              ) : (
                "Task yang di-assign ke Anda di proyek yang Anda ikuti. Sinkron dengan board tiap proyek."
              )}
            </div>
          </div>
          {clientReady && canSeeRelatedTab ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as MyTasksTab)}
            >
              <TabsList>
                <TabsTrigger value="mine">Task Saya</TabsTrigger>
                <TabsTrigger value="related">Task Terkait</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5">
            <Button
              type="button"
              variant={
                (activeTab === "mine" ? boardView : relatedBoardView) ===
                "board"
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              className="gap-1 px-2"
              onClick={() => {
                if (activeTab === "mine") setBoardView("board");
                else setRelatedBoardView("board");
              }}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </Button>
            <Button
              type="button"
              variant={
                (activeTab === "mine" ? boardView : relatedBoardView) === "list"
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              className="gap-1 px-2"
              onClick={() => {
                if (activeTab === "mine") {
                  if (boardView !== "list") setListPage(1);
                  setBoardView("list");
                } else {
                  if (relatedBoardView !== "list") setRelatedListPage(1);
                  setRelatedBoardView("list");
                }
              }}
            >
              <List className="h-3.5 w-3.5" />
              List
            </Button>
          </div>
          {(activeTab === "mine" ? boardView : relatedBoardView) === "board" ? (
            <Button
              type="button"
              variant={
                (activeTab === "mine" ? swimlaneMode : relatedSwimlaneMode)
                  ? "default"
                  : "outline"
              }
              size="sm"
              className="gap-1"
              onClick={() => {
                if (activeTab === "mine") setSwimlaneMode((v) => !v);
                else setRelatedSwimlaneMode((v) => !v);
              }}
            >
              <Rows className="h-3.5 w-3.5" />
              Swimlane
            </Button>
          ) : null}
        </div>
      </div>

      {activeTab === "mine" ? (
        <>
          <ResourceListToolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Cari judul task…"
            filterActiveCount={filterCount}
            onOpenFilter={openFilter}
            filterLabel="Filter My tasks"
          />
          <ActiveFilterChips items={chipItems} onRemove={removeChip} />
        </>
      ) : (
        <>
          <ResourceListToolbar
            searchValue={relatedSearchInput}
            onSearchChange={setRelatedSearchInput}
            searchPlaceholder="Cari judul task…"
            filterActiveCount={relatedFilterCount}
            onOpenFilter={openRelatedFilter}
            filterLabel="Filter Task Terkait"
          />
          <ActiveFilterChips
            items={relatedChipItems}
            onRemove={removeRelatedChip}
          />
        </>
      )}

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className={filterDialogContentClassName}>
          <DialogHeader className={filterDialogHeaderClassName}>
            <DialogTitle className={filterSheetTitleClassName}>
              Filter My tasks
            </DialogTitle>
            <DialogDescription className={filterSheetDescriptionClassName}>
              Proyek, periode tanggal kartu, dan due date{isAdmin ? ", serta assignee (admin)" : ""}.
              Kosongkan proyek untuk semua proyek yang Anda ikuti
              {isAdmin ? " atau seluruh sistem (admin)" : ""}.
            </DialogDescription>
          </DialogHeader>
          <FilterSheetBody className="px-6 py-5">
            <div className={filterSheetFieldClassName}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label className={filterSheetLabelClassName}>Proyek</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setDraftProjectIds(
                        (projectsQ.data ?? []).map((p) => p.id),
                      )
                    }
                  >
                    Semua
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDraftProjectIds([])}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <div className="max-h-[min(16rem,calc(90dvh-20rem))] space-y-2 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50/40 p-2 sm:max-h-60">
                {(projectsQ.data ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Tidak ada proyek.
                  </p>
                ) : (
                  (projectsQ.data ?? []).map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={draftProjectIds.includes(p.id)}
                        onCheckedChange={() => toggleDraftProject(p.id)}
                      />
                      <span className="truncate">
                        {p.name}{" "}
                        <span className="text-muted-foreground">({p.code})</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className={cn(filterSheetFieldClassName, "grid gap-3 sm:grid-cols-2")}>
              <div className="space-y-1.5">
                <Label className={filterSheetLabelClassName}>Start Date</Label>
                <Input
                  type="date"
                  value={draftCardDateFrom}
                  onChange={(e) => setDraftCardDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={filterSheetLabelClassName}>End Date</Label>
                <Input
                  type="date"
                  value={draftCardDateTo}
                  onChange={(e) => setDraftCardDateTo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className={cn(filterSheetFieldClassName, "grid gap-3 sm:grid-cols-2")}>
              <div className="space-y-1.5">
                <Label className={filterSheetLabelClassName}>Due from</Label>
                <Input
                  type="date"
                  value={draftDueFrom}
                  onChange={(e) => setDraftDueFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={filterSheetLabelClassName}>Due to</Label>
                <Input
                  type="date"
                  value={draftDueTo}
                  onChange={(e) => setDraftDueTo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            {isAdmin ? (
              <div className={filterSheetFieldClassName}>
                <Label className={filterSheetLabelClassName}>
                  Assignee (filter)
                </Label>
                <Popover
                  open={assigneePickerOpen}
                  onOpenChange={(open) => {
                    setAssigneePickerOpen(open);
                    if (!open) setAssigneePickerQuery("");
                  }}
                >
                  <PopoverTrigger
                    type="button"
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-full min-w-0 justify-between gap-2 font-normal"
                        disabled={usersQ.isPending}
                      />
                    }
                  >
                    <span
                      className={cn(
                        "truncate text-left text-sm",
                        usersQ.isPending || usersQ.isError
                          ? "text-muted-foreground"
                          : "text-foreground",
                      )}
                    >
                      {usersQ.isPending
                        ? "Memuat…"
                        : usersQ.isError
                          ? "Gagal memuat user"
                          : draftAssigneeLabel}
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="z-[200] w-[min(100vw-2rem,22rem)] border-zinc-200 p-0 shadow-lg ring-zinc-200/60"
                    sideOffset={4}
                  >
                    <div className="border-b border-zinc-100 p-2">
                      <Input
                        type="search"
                        value={assigneePickerQuery}
                        onChange={(e) =>
                          setAssigneePickerQuery(e.target.value)
                        }
                        placeholder="Cari nama…"
                        className="h-8 text-xs"
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                    <div
                      className="max-h-56 overflow-y-auto p-1"
                      role="listbox"
                      aria-label="Pilih assignee"
                    >
                      {usersQ.isError ? (
                        <p className="text-destructive px-2 py-3 text-center text-xs">
                          Gagal memuat daftar user.
                        </p>
                      ) : (usersQ.data?.length ?? 0) === 0 ? (
                        <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                          Tidak ada user.
                        </p>
                      ) : filteredAssigneePickerRows.length === 0 ? (
                        <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                          Tidak ada yang cocok.
                        </p>
                      ) : (
                        <ul className="space-y-0.5">
                          <li>
                            <button
                              type="button"
                              role="option"
                              aria-selected={draftAssigneeId === ""}
                              className={cn(
                                "hover:bg-muted/80 flex w-full rounded px-2 py-2 text-left text-sm",
                                draftAssigneeId === "" &&
                                  "bg-muted/70 font-medium text-foreground",
                              )}
                              onClick={() => {
                                setDraftAssigneeId("");
                                setAssigneePickerOpen(false);
                              }}
                            >
                              Semua user
                            </button>
                          </li>
                          {filteredAssigneePickerRows.map((u) => (
                            <li key={u.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={draftAssigneeId === u.id}
                                className={cn(
                                  "hover:bg-muted/80 flex w-full rounded px-2 py-2 text-left text-sm",
                                  draftAssigneeId === u.id &&
                                    "bg-muted/70 font-medium text-foreground",
                                )}
                                onClick={() => {
                                  setDraftAssigneeId(u.id);
                                  setAssigneePickerOpen(false);
                                }}
                              >
                                <span className="min-w-0 flex-1 truncate">
                                  {u.name}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
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
          <div
            className={cn(
              filterDialogFooterClassName,
              "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Clear all
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFilterOpen(false)}
              >
                Batal
              </Button>
              <Button type="button" onClick={applyFilters}>
                Terapkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={relatedFilterOpen} onOpenChange={setRelatedFilterOpen}>
        <DialogContent className={filterDialogContentClassName}>
          <DialogHeader className={filterDialogHeaderClassName}>
            <DialogTitle className={filterSheetTitleClassName}>
              Filter Task Terkait
            </DialogTitle>
            <DialogDescription className={filterSheetDescriptionClassName}>
              Task yang Anda buat (dibuat oleh) atau yang Anda jadi PM reporter-nya.
              Filter proyek, status,
              priority, tanggal kartu, dan due date.
            </DialogDescription>
          </DialogHeader>
          <FilterSheetBody className="px-6 py-5">
            <div className={filterSheetFieldClassName}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label className={filterSheetLabelClassName}>Proyek</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setRelatedDraftProjectIds(
                        (projectsQ.data ?? []).map((p) => p.id),
                      )
                    }
                  >
                    Semua
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRelatedDraftProjectIds([])}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <div className="max-h-[min(16rem,calc(90dvh-20rem))] space-y-2 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50/40 p-2 sm:max-h-60">
                {(projectsQ.data ?? []).map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={relatedDraftProjectIds.includes(p.id)}
                      onCheckedChange={() => toggleRelatedDraftProject(p.id)}
                    />
                    <span className="truncate">
                      {p.name}{" "}
                      <span className="text-muted-foreground">({p.code})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div
              className={cn(
                filterSheetFieldClassName,
                "grid gap-3 sm:grid-cols-2",
              )}
            >
              <div className="space-y-1.5">
                <Label className={filterSheetLabelClassName}>Status</Label>
                <Select
                  value={relatedDraftStatus || "__all__"}
                  onValueChange={(v) =>
                    setRelatedDraftStatus(!v || v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua status</SelectItem>
                    {TASK_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={filterSheetLabelClassName}>Priority</Label>
                <Select
                  value={relatedDraftPriority || "__all__"}
                  onValueChange={(v) =>
                    setRelatedDraftPriority(!v || v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Semua priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_FILTER_OPTIONS.map((p) => (
                      <SelectItem
                        key={p.value || "__all__"}
                        value={p.value || "__all__"}
                      >
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div
              className={cn(
                filterSheetFieldClassName,
                "grid gap-3 sm:grid-cols-2",
              )}
            >
              <div className="space-y-1.5">
                <Label className={filterSheetLabelClassName}>Due from</Label>
                <Input
                  type="date"
                  value={relatedDraftDueFrom}
                  onChange={(e) => setRelatedDraftDueFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={filterSheetLabelClassName}>Due to</Label>
                <Input
                  type="date"
                  value={relatedDraftDueTo}
                  onChange={(e) => setRelatedDraftDueTo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div
              className={cn(
                filterSheetFieldClassName,
                "grid gap-3 sm:grid-cols-2",
              )}
            >
              <div className="space-y-1.5">
                <Label className={filterSheetLabelClassName}>Start Date</Label>
                <Input
                  type="date"
                  value={relatedDraftCardDateFrom}
                  onChange={(e) => setRelatedDraftCardDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={filterSheetLabelClassName}>End Date</Label>
                <Input
                  type="date"
                  value={relatedDraftCardDateTo}
                  onChange={(e) => setRelatedDraftCardDateTo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <BoardListSortFilterFields
              sortKey={relatedDraftListSortKey as ListSortKey}
              sortDir={relatedDraftListSortDir}
              stale={relatedDraftListStale}
              onSortKeyChange={(v) => setRelatedDraftListSortKey(v)}
              onSortDirChange={setRelatedDraftListSortDir}
              onStaleChange={setRelatedDraftListStale}
            />
          </FilterSheetBody>
          <div
            className={cn(
              filterDialogFooterClassName,
              "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <Button type="button" variant="ghost" onClick={clearRelatedFilters}>
              Clear all
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRelatedFilterOpen(false)}
              >
                Batal
              </Button>
              <Button type="button" onClick={applyRelatedFilters}>
                Terapkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {editTaskId && editProjectId && canOpenTaskEditor ? (
        <TaskFormSheet
          mode="edit"
          open={editModalOpen}
          onOpenChange={(o) => {
            setEditModalOpen(o);
            if (!o) {
              setEditTaskId(null);
              setEditProjectId(null);
            }
          }}
          projectId={editProjectId}
          taskId={editTaskId}
          onSuccess={() => refetchTasks()}
        />
      ) : null}

      {createProjectId && canOpenTaskEditor ? (
        <TaskFormSheet
          mode="create"
          open={createModalOpen}
          onOpenChange={(o) => {
            setCreateModalOpen(o);
            if (!o) {
              setCreateProjectId(null);
              setFollowUpReferenceTaskIds([]);
            }
          }}
          projectId={createProjectId}
          initialReferenceTaskIds={followUpReferenceTaskIds}
          onSuccess={() => refetchTasks()}
        />
      ) : null}

      <ReminderModal
        isOpen={reminder.isOpen}
        onClose={reminder.onClose}
        onSnooze={reminder.onSnooze}
        deadlineTasks={reminder.deadlineTasks}
        awaitingTasks={reminder.awaitingTasks}
        isLoading={reminder.isLoading}
        onOpenTask={openReminderTask}
      />

      {detailTaskId ? (
        <TaskDetailSheet
          taskId={detailTaskId}
          projectId={detailProjectId ?? ""}
          open={detailOpen}
          onOpenChange={(o) => {
            setDetailOpen(o);
            if (!o) {
              setDetailTaskId(null);
              setDetailProjectId(null);
              void reminder.refetch();
            }
          }}
          onUpdated={() => refetchTasks()}
          presentation="trackly"
          onRequestEdit={canOpenTaskEditor ? openEditFromDetail : undefined}
          onRequestCreateFollowUp={
            canOpenTaskEditor ? openFollowUpTask : undefined
          }
        />
      ) : null}

      <ParkingLotReasonModal
        open={pendingParkingMove != null}
        targetStatus={
          pendingParkingMove &&
          isParkingLotBoardStatus(pendingParkingMove.status)
            ? pendingParkingMove.status
            : null
        }
        onConfirm={confirmParkingLotMove}
        onCancel={() => {
          if (!mutate.isPending) setPendingParkingMove(null);
        }}
        isPending={mutate.isPending}
      />

      {tasksPending ? (
        <Skeleton className="h-[420px] w-full rounded-lg" />
      ) : activeTab === "mine" ? (
        boardView === "list" ? (
          (listQ.data?.meta.total ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 py-16 text-center">
              <p className="text-sm font-medium text-zinc-700">
                Tidak ada task untuk filter ini
              </p>
              <p className="mt-1 max-w-sm text-xs text-zinc-500">
                Sesuaikan filter, atau buka{" "}
                <Link href="/projects" className="text-primary underline">
                  Projects
                </Link>{" "}
                untuk board per proyek.
              </p>
            </div>
          ) : (
            <>
              <BoardTaskListView
                tasks={listRows}
                readOnly={readOnly}
                onOpenTask={openTaskDetail}
                serverSort={{
                  sortKey: listSortKey,
                  sortDir: listSortDir,
                  onSortChange: handleListSortChange,
                }}
              />
              <ListPaginationBar
                total={listQ.data?.meta.total ?? 0}
                page={listPage}
                pageSize={listPageSize}
                onPageChange={setListPage}
                onPageSizeChange={handleListPageSizeChange}
                disabled={listQ.isFetching}
              />
            </>
          )
        ) : boardTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 py-16 text-center">
            <p className="text-sm font-medium text-zinc-700">Belum ada task</p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              Jika Anda non-admin, pastikan ada penugasan di anggota task. Admin:
              coba longgarkan filter assignee / proyek.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <KanbanBoard
              tasks={boardTasks}
              readOnly={readOnly}
              swimlaneMode={swimlaneMode}
              showProjectOnCard
              onOpenTask={openTaskDetail}
              columnTotals={myKanbanBoard.columnTotals}
              columnInfinite={myKanbanBoard.columnInfinite}
              onMove={(taskId, newStatus) =>
                requestBoardStatusChange(taskId, newStatus)
              }
            />
          </div>
        )
      ) : relatedBoardView === "list" ? (
        (relatedListQ.data?.meta.total ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 py-16 text-center">
            <p className="text-sm font-medium text-zinc-700">
              Tidak ada task terkait untuk filter ini
            </p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              Task yang Anda buat atau jadi PM reporter-nya akan muncul di sini.
            </p>
          </div>
        ) : (
          <>
            <BoardTaskListView
              tasks={relatedListRows}
              readOnly={readOnly}
              onOpenTask={openTaskDetail}
              serverSort={{
                sortKey: relatedListSortKey,
                sortDir: relatedListSortDir,
                onSortChange: handleRelatedListSortChange,
              }}
            />
            <ListPaginationBar
              total={relatedListQ.data?.meta.total ?? 0}
              page={relatedListPage}
              pageSize={relatedListPageSize}
              onPageChange={setRelatedListPage}
              onPageSizeChange={handleRelatedListPageSizeChange}
              disabled={relatedListQ.isFetching}
            />
          </>
        )
      ) : relatedBoardTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 py-16 text-center">
          <p className="text-sm font-medium text-zinc-700">
            Belum ada task terkait
          </p>
          <p className="mt-1 max-w-sm text-xs text-zinc-500">
            Task yang Anda buat atau jadi PM reporter-nya akan muncul di tab ini.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <KanbanBoard
            tasks={relatedBoardTasks}
            readOnly={readOnly}
            swimlaneMode={relatedSwimlaneMode}
            showProjectOnCard
            onOpenTask={openTaskDetail}
            columnTotals={relatedKanbanBoard.columnTotals}
            columnInfinite={relatedKanbanBoard.columnInfinite}
            onMove={(taskId, newStatus) =>
              requestBoardStatusChange(taskId, newStatus)
            }
          />
        </div>
      )}
    </div>
  );
}
