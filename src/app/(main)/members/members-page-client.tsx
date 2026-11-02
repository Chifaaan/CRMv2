"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Eye,
  Building2,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ActiveFilterChips } from "@/components/features/crud/active-filter-chips";
import { ResourceListToolbar } from "@/components/features/crud/resource-list-toolbar";
import {
  MemberModal,
  type MemberRow,
} from "@/components/features/members/MemberModal";
import { MemberImportDialog } from "@/components/features/members/MemberImportDialog";
import { CompanyManageDialog } from "@/components/features/members/CompanyManageDialog";
import { ClientPortalUserDetailDialog } from "@/components/features/clients/client-portal-user-detail-dialog";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/api/client";
import { useSession } from "@/lib/auth-client";
import {
  memberRoleBadgeVariant,
  memberRoleLabel,
  userStatusBadgeClassName,
  userStatusBadgeVariant,
  userStatusLabel,
} from "@/lib/user-status-badge";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/lib/column-sort";
import { toggleColumnSort } from "@/lib/column-sort";
import { SortableNativeTh } from "@/components/ui/sortable-table-head";
import { toast } from "sonner";
import {
  DEFAULT_LIST_PAGE_SIZE,
  type ListPageSize,
} from "@/lib/list-pagination";
import { useClampListPage } from "@/lib/hooks/use-clamp-list-page";
import { APP_ROLES } from "@/lib/role-constants";

const ROLES = APP_ROLES;
const STATUSES = ["active", "inactive", "invited"] as const;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function formatRelativeLogin(iso: string | null | undefined) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return d.toLocaleDateString();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const MEMBERS_ROLE_FILTER_ITEMS = [
  { value: "__all__", label: "All roles" },
  ...ROLES.map((r) => ({ value: r, label: memberRoleLabel(r) })),
];
const MEMBERS_STATUS_FILTER_ITEMS = [
  { value: "__all__", label: "All status" },
  ...STATUSES.map((s) => ({ value: s, label: userStatusLabel(s) })),
];

const MEMBERS_SORT_KEYS = [
  "name",
  "role",
  "department",
  "company",
  "status",
  "lastLogin",
] as const;
type MembersSortKey = (typeof MEMBERS_SORT_KEYS)[number];

function memberSortApiField(key: string): MembersSortKey {
  return MEMBERS_SORT_KEYS.includes(key as MembersSortKey)
    ? (key as MembersSortKey)
    : "name";
}

export function MembersPageClient() {
  const { data: session } = useSession();
  const actorId = session?.user?.id ?? "";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMember, setModalMember] = useState<MemberRow | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const [appliedRole, setAppliedRole] = useState<string>("");
  const [appliedStatus, setAppliedStatus] = useState<string>("");
  const [appliedCompany, setAppliedCompany] = useState<string>("");
  const [draftRole, setDraftRole] = useState<string>("");
  const [draftStatus, setDraftStatus] = useState<string>("");
  const [draftCompany, setDraftCompany] = useState<string>("");
  const [sortCol, setSortCol] = useState<string>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const [deleteTarget, setDeleteTarget] = useState<MemberRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<MemberRow | null>(
    null,
  );
  const [detailTarget, setDetailTarget] = useState<MemberRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [companyManageOpen, setCompanyManageOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ListPageSize>(
    DEFAULT_LIST_PAGE_SIZE,
  );

  const sortByApi = memberSortApiField(sortCol);

  const companiesQ = useQuery({
    queryKey: ["users", "meta", "company-options"],
    queryFn: async () => {
      const res = await api.get<string[]>("/api/users/meta/company-options");
      return res.data;
    },
  });

  const q = useQuery({
    queryKey: [
      "users",
      "admin-list",
      page,
      pageSize,
      search,
      appliedRole,
      appliedStatus,
      appliedCompany,
      sortByApi,
      sortDir,
    ],
    queryFn: async () => {
      const res = await api.get<{
        data: MemberRow[];
        meta: { total: number; page: number; take: number; pages: number };
      }>("/api/users", {
        params: {
          page: String(page),
          take: String(pageSize),
          sortBy: sortByApi,
          sortDir,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(appliedRole ? { role: appliedRole } : {}),
          ...(appliedStatus ? { status: appliedStatus } : {}),
          ...(appliedCompany ? { company: appliedCompany } : {}),
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    setPage(1);
  }, [search, appliedRole, appliedStatus, appliedCompany, pageSize, sortByApi, sortDir]);

  const meta = q.data?.meta;
  const rows = q.data?.data ?? [];
  const total = meta?.total ?? 0;

  useClampListPage(meta?.pages, setPage);

  const MEMBERS_COMPANY_ITEMS = useMemo(() => {
    const opts = companiesQ.data ?? [];
    return [
      { value: "__all__", label: "All companies" },
      ...opts.map((c) => ({ value: c, label: c })),
    ];
  }, [companiesQ.data]);

  const chipItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (appliedRole) {
      items.push({
        id: "role",
        label: `Role: ${memberRoleLabel(appliedRole)}`,
      });
    }
    if (appliedStatus) {
      items.push({
        id: "status",
        label: `Status: ${userStatusLabel(appliedStatus)}`,
      });
    }
    if (appliedCompany) {
      items.push({
        id: "company",
        label: `Company: ${appliedCompany}`,
      });
    }
    return items;
  }, [appliedRole, appliedStatus, appliedCompany]);

  const filterCount =
    (appliedRole ? 1 : 0) +
    (appliedStatus ? 1 : 0) +
    (appliedCompany ? 1 : 0);

  function headerSort(columnKey: string) {
    const next = toggleColumnSort(sortCol, sortDir, columnKey);
    setSortCol(next.key);
    setSortDir(next.dir);
    setPage(1);
  }

  function openFilterSheet() {
    setDraftRole(appliedRole);
    setDraftStatus(appliedStatus);
    setDraftCompany(appliedCompany);
    setFilterOpen(true);
  }

  function applyFilters() {
    setAppliedRole(draftRole);
    setAppliedStatus(draftStatus);
    setAppliedCompany(draftCompany);
    setFilterOpen(false);
  }

  function resetFiltersInSheet() {
    setDraftRole("");
    setDraftStatus("");
    setDraftCompany("");
  }

  function removeChip(id: string) {
    if (id === "role") setAppliedRole("");
    if (id === "status") setAppliedStatus("");
    if (id === "company") setAppliedCompany("");
  }

  const patchStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/api/users/${id}/status`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "admin-list"] });
      qc.invalidateQueries({ queryKey: ["users", "for-assets"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Could not update status"),
  });

  const importM = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{
        created: number;
        failed: { line: number; email?: string; error: string }[];
      }>("/api/users/import", fd);
      return res.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["users", "admin-list"] });
      void qc.invalidateQueries({ queryKey: ["users", "for-assets"] });
      setImportOpen(false);
      if (data.failed.length === 0) {
        toast.success(
          `Berhasil mengimpor ${data.created} pengguna. Password default: 123123123. Status bawaan inactive.`,
        );
        return;
      }
      const sample = data.failed
        .slice(0, 6)
        .map((e) => `Baris ${e.line}${e.email ? ` (${e.email})` : ""}: ${e.error}`)
        .join("\n");
      toast.message(
        `Impor: ${data.created} berhasil, ${data.failed.length} gagal`,
        { description: sample, duration: 12_000 },
      );
    },
    onError: () => toast.error("Gagal mengimpor Excel (.xlsx)"),
  });

  const delM = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "admin-list"] });
      qc.invalidateQueries({ queryKey: ["users", "for-assets"] });
      setDeleteTarget(null);
      toast.success("Member deleted");
    },
    onError: () => toast.error("Could not delete member"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Members
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage team member accounts, roles, and access
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0 gap-2 sm:w-auto"
            onClick={() => setCompanyManageOpen(true)}
          >
            <Building2 className="size-4" />
            Kelola Company
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0 gap-2 sm:w-auto"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="size-4" />
            Import XLSX
          </Button>
          <Button
            onClick={() => {
              setModalMember(null);
              setModalOpen(true);
            }}
            className="w-full shrink-0 gap-2 sm:w-auto"
          >
            <UserPlus className="size-4" />
            Add Member
          </Button>
        </div>
      </div>

      <ResourceListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, or username…"
        filterActiveCount={filterCount}
        onOpenFilter={openFilterSheet}
        filterLabel="Filter members"
      />

      <ActiveFilterChips items={chipItems} onRemove={removeChip} />

      {total === 0 && !q.isFetching ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
          {search.trim() ||
          appliedRole ||
          appliedStatus ||
          appliedCompany ? (
            "No members match your filters"
          ) : (
            <div className="space-y-4">
              <p>No members yet</p>
              <Button
                onClick={() => {
                  setModalMember(null);
                  setModalOpen(true);
                }}
                className="gap-2"
              >
                <UserPlus className="size-4" />
                Add Member
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-foreground/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted/40 border-b text-left">
                  <SortableNativeTh
                    label="Member"
                    columnKey="name"
                    activeSortKey={sortCol}
                    sortDirection={sortDir}
                    onSort={headerSort}
                    className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase"
                  />
                  <SortableNativeTh
                    label="Role"
                    columnKey="role"
                    activeSortKey={sortCol}
                    sortDirection={sortDir}
                    onSort={headerSort}
                    className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase"
                  />
                  <SortableNativeTh
                    label="Company"
                    columnKey="company"
                    activeSortKey={sortCol}
                    sortDirection={sortDir}
                    onSort={headerSort}
                    className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase"
                  />
                  <SortableNativeTh
                    label="Department / Position"
                    columnKey="department"
                    activeSortKey={sortCol}
                    sortDirection={sortDir}
                    onSort={headerSort}
                    className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase"
                  />
                  <SortableNativeTh
                    label="Status"
                    columnKey="status"
                    activeSortKey={sortCol}
                    sortDirection={sortDir}
                    onSort={headerSort}
                    className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase"
                  />
                  <SortableNativeTh
                    label="Last Login"
                    columnKey="lastLogin"
                    activeSortKey={sortCol}
                    sortDirection={sortDir}
                    onSort={headerSort}
                    className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase"
                  />
                  <th className="text-muted-foreground w-36 px-4 py-3 text-xs font-medium tracking-wide uppercase" />
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr
                    key={u.id}
                    className="group border-b border-border/80 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <UserProfileTrigger userId={u.id}>
                          <Avatar className="h-9 w-9">
                            {u.image ? (
                              <AvatarImage src={u.image} alt="" />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {initials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                        </UserProfileTrigger>
                        <div className="min-w-0">
                          <UserProfileTrigger userId={u.id} className="block max-w-full rounded-sm">
                            <p className="truncate font-medium">{u.name}</p>
                          </UserProfileTrigger>
                          <p className="text-muted-foreground truncate text-xs">
                            {u.username ?? "—"} · {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge
                        variant={memberRoleBadgeVariant(u.role)}
                        className="font-normal"
                      >
                        {memberRoleLabel(u.role)}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground max-w-[160px] px-4 py-3 align-middle text-sm">
                      <span className="line-clamp-2 text-foreground">
                        {u.company ?? "—"}
                      </span>
                    </td>
                    <td className="text-muted-foreground max-w-[200px] px-4 py-3 align-middle">
                      <div className="flex flex-col gap-0.5 text-sm">
                        {u.position ? (
                          <span className="text-foreground">{u.position}</span>
                        ) : null}
                        {u.department ? (
                          <span className="text-xs">{u.department}</span>
                        ) : null}
                        {!u.position && !u.department ? (
                          <span>—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge
                        variant={userStatusBadgeVariant(u.status)}
                        className={cn(
                          "font-normal capitalize",
                          userStatusBadgeClassName(u.status),
                        )}
                      >
                        {userStatusLabel(u.status)}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 align-middle text-xs whitespace-nowrap">
                      {formatRelativeLogin(u.lastLogin)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Aksi member"
                          >
                            <MoreVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[11.5rem]">
                            <DropdownMenuItem
                              onClick={() => setDetailTarget(u)}
                            >
                              <Eye className="mr-2 size-3.5" />
                              Lihat Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setModalMember(u);
                                setModalOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 size-3.5" />
                              Edit
                            </DropdownMenuItem>
                            {u.status === "active" ? (
                              <DropdownMenuItem
                                onClick={() => setDeactivateTarget(u)}
                              >
                                <UserX className="mr-2 size-3.5" />
                                Nonaktifkan
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  patchStatus.mutate({
                                    id: u.id,
                                    status: "active",
                                  })
                                }
                                disabled={patchStatus.isPending}
                              >
                                <UserCheck className="mr-2 size-3.5" />
                                Aktifkan
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={u.id === actorId}
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="mr-2 size-3.5" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPaginationBar
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            disabled={q.isFetching}
          />
        </div>
      )}

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className={filterSheetContentClassName}>
          <SheetHeader className={filterSheetHeaderClassName}>
            <SheetTitle className={filterSheetTitleClassName}>
              Filter pengguna
            </SheetTitle>
            <SheetDescription className={filterSheetDescriptionClassName}>
              Saring berdasarkan perusahaan, peran global, dan status akun.
            </SheetDescription>
          </SheetHeader>
          <FilterSheetBody>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Perusahaan</Label>
              <Select
                value={draftCompany || "__all__"}
                onValueChange={(v) =>
                  setDraftCompany(v === "__all__" ? "" : (v ?? ""))
                }
                items={MEMBERS_COMPANY_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBERS_COMPANY_ITEMS.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Peran</Label>
              <Select
                value={draftRole || "__all__"}
                onValueChange={(v) =>
                  setDraftRole(v === "__all__" ? "" : (v ?? ""))
                }
                items={MEMBERS_ROLE_FILTER_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBERS_ROLE_FILTER_ITEMS.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Status</Label>
              <Select
                value={draftStatus || "__all__"}
                onValueChange={(v) =>
                  setDraftStatus(v === "__all__" ? "" : (v ?? ""))
                }
                items={MEMBERS_STATUS_FILTER_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBERS_STATUS_FILTER_ITEMS.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FilterSheetBody>
          <SheetFooter
            className={cn(filterSheetFooterClassName, "flex-col sm:flex-row")}
          >
            <Button
              type="button"
              variant="outline"
              className="min-h-10 flex-1 sm:min-w-0"
              onClick={resetFiltersInSheet}
            >
              Reset
            </Button>
            <Button
              type="button"
              className="min-h-10 flex-1 sm:min-w-0"
              onClick={applyFilters}
            >
              Terapkan
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <MemberModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        member={modalMember}
      />

      <ClientPortalUserDetailDialog
        open={!!detailTarget}
        onOpenChange={(open) => !open && setDetailTarget(null)}
        user={detailTarget}
        title="Detail member"
        description="Informasi profil dan akun member."
      />

      <MemberImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        importing={importM.isPending}
        onImport={(file) => importM.mutate(file)}
      />

      <CompanyManageDialog
        open={companyManageOpen}
        onOpenChange={setCompanyManageOpen}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete member</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete{" "}
              <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteTarget && delM.mutate(deleteTarget.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate member</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate <strong>{deactivateTarget?.name}</strong>? They will
              no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-600/90"
              onClick={() => {
                if (deactivateTarget) {
                  patchStatus.mutate({
                    id: deactivateTarget.id,
                    status: "inactive",
                  });
                  setDeactivateTarget(null);
                }
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
