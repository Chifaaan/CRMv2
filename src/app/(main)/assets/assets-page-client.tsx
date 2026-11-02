"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { ActiveFilterChips } from "@/components/features/crud/active-filter-chips";
import { ResourceListToolbar } from "@/components/features/crud/resource-list-toolbar";
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
import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cmpOptionalDateDir, cmpOptionalStringDir, toggleColumnSort } from "@/lib/column-sort";
import type { SortDirection } from "@/lib/column-sort";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import {
  FormDraftKeys,
  clearFormDraft,
  loadFormDraftEnvelope,
} from "@/lib/form-draft-storage";
import { useDebouncedFormDraftSave } from "@/lib/hooks/use-debounced-form-draft-save";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isAdminOrPmRole } from "@/lib/role-constants";

type AssetRow = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  serialNumber: string | null;
  status: string;
  notes: string | null;
  vendor: string | null;
  purchaseDate: string | null;
  purchasePrice: unknown;
  assignedTo: string | null;
  projectId: string | null;
  warrantyExpiry: string | null;
  image: string | null;
  createdAt?: string;
  assignedUser?: { id: string; name: string } | null;
};

type ProjectOption = { id: string; name: string; code?: string };

type UserOption = { id: string; name: string };

const STATUS_OPTIONS = [
  "available",
  "assigned",
  "maintenance",
  "retired",
] as const;

const ASSET_FORM_STATUS_ITEMS = STATUS_OPTIONS.map((s) => ({
  value: s,
  label: s,
}));

const emptyForm = {
  name: "",
  category: "",
  description: "",
  serialNumber: "",
  status: "available",
  notes: "",
  vendor: "",
  purchaseDate: "",
  purchasePrice: "",
  warrantyExpiry: "",
  assignedTo: "",
  projectId: "",
};

function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function fmtShortDate(iso: string | undefined | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function fmtMoney(v: unknown) {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function assetStatusClass(status: string) {
  switch (status) {
    case "available":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
    case "assigned":
      return "bg-sky-500/15 text-sky-900 dark:text-sky-200";
    case "maintenance":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
    case "retired":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (86400 * 1000));
}

export function AssetsPageClient() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const canMutate = isAdminOrPmRole(role);
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [appliedStatus, setAppliedStatus] = useState<string>("");
  const [appliedCategory, setAppliedCategory] = useState<string>("");
  const [appliedAssignedTo, setAppliedAssignedTo] = useState<string>("");
  const [draftStatus, setDraftStatus] = useState<string>("");
  const [draftCategory, setDraftCategory] = useState<string>("");
  const [draftAssignedTo, setDraftAssignedTo] = useState<string>("");

  const [search, setSearch] = useState("");

  const [assetSortKey, setAssetSortKey] = useState<string>("name");
  const [assetSortDir, setAssetSortDir] = useState<SortDirection>("asc");

  const q = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await api.get<AssetRow[]>("/api/assets");
      return res.data;
    },
  });

  const usersQ = useQuery({
    queryKey: ["users", "for-assets"],
    queryFn: async () => {
      const res = await api.get<UserOption[]>("/api/users");
      return res.data;
    },
    enabled: canMutate,
  });

  const projectsQ = useQuery({
    queryKey: ["projects", "for-assets"],
    queryFn: async () => {
      const res = await api.get<ProjectOption[]>("/api/projects");
      return res.data;
    },
    enabled: canMutate,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of q.data ?? []) {
      if (a.category?.trim()) set.add(a.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [q.data]);

  const assetsStatusFilterItems = useMemo(
    () => [
      { value: "__all__", label: "Semua status" },
      ...STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
    ],
    [],
  );
  const assetsCategoryFilterItems = useMemo(
    () => [
      { value: "__all__", label: "Semua kategori" },
      ...categories.map((c) => ({ value: c, label: c })),
    ],
    [categories],
  );
  const assetsAssignedFilterItems = useMemo(
    () => [
      { value: "__all__", label: "Semua" },
      ...(usersQ.data ?? []).map((u) => ({
        value: u.id,
        label: u.name,
      })),
    ],
    [usersQ.data],
  );
  const assetFormAssignedItems = useMemo(
    () => [
      { value: "__none__", label: "Tidak ditugaskan" },
      ...(usersQ.data ?? []).map((u) => ({
        value: u.id,
        label: u.name,
      })),
    ],
    [usersQ.data],
  );
  const assetFormProjectItems = useMemo(
    () => [
      { value: "__none__", label: "Tanpa proyek" },
      ...(projectsQ.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.name}${p.code ? ` (${p.code})` : ""}`,
      })),
    ],
    [projectsQ.data],
  );

  const filterCount =
    (appliedStatus ? 1 : 0) +
    (appliedCategory ? 1 : 0) +
    (appliedAssignedTo ? 1 : 0);

  const stats = useMemo(() => {
    const rows = q.data ?? [];
    let inUse = 0;
    let available = 0;
    let warrantySoon = 0;
    for (const a of rows) {
      if (a.status === "assigned") inUse += 1;
      if (a.status === "available") available += 1;
      const days = daysUntil(a.warrantyExpiry);
      if (days != null && days >= 0 && days <= 30) warrantySoon += 1;
    }
    return {
      total: rows.length,
      inUse,
      available,
      warrantySoon,
    };
  }, [q.data]);

  const filtered = useMemo(() => {
    let rows = q.data ?? [];
    const s = search.trim().toLowerCase();
    if (s) {
      rows = rows.filter(
        (a) =>
          a.name.toLowerCase().includes(s) ||
          (a.serialNumber?.toLowerCase().includes(s) ?? false) ||
          (a.vendor?.toLowerCase().includes(s) ?? false) ||
          (a.category?.toLowerCase().includes(s) ?? false) ||
          (a.description?.toLowerCase().includes(s) ?? false),
      );
    }
    if (appliedStatus) {
      rows = rows.filter((a) => a.status === appliedStatus);
    }
    if (appliedCategory) {
      rows = rows.filter((a) => (a.category ?? "") === appliedCategory);
    }
    if (appliedAssignedTo) {
      rows = rows.filter((a) => a.assignedTo === appliedAssignedTo);
    }
    return rows;
  }, [q.data, search, appliedStatus, appliedCategory, appliedAssignedTo]);

  const sortedFiltered = useMemo(() => {
    const dir = assetSortDir;
    const rows = [...filtered];
    rows.sort((a, b) => {
      switch (assetSortKey) {
        case "category":
          return cmpOptionalStringDir(a.category, b.category, dir);
        case "assigned": {
          const la = a.assignedUser?.name ?? "";
          const lb = b.assignedUser?.name ?? "";
          return cmpOptionalStringDir(la, lb, dir);
        }
        case "status":
          return cmpOptionalStringDir(a.status, b.status, dir);
        case "warranty":
          return cmpOptionalDateDir(a.warrantyExpiry, b.warrantyExpiry, dir);
        case "purchase": {
          const na =
            typeof a.purchasePrice === "number"
              ? a.purchasePrice
              : parseFloat(String(a.purchasePrice ?? ""));
          const nb =
            typeof b.purchasePrice === "number"
              ? b.purchasePrice
              : parseFloat(String(b.purchasePrice ?? ""));
          const va = Number.isFinite(na) ? na : null;
          const vb = Number.isFinite(nb) ? nb : null;
          if (va == null && vb == null)
            return cmpOptionalDateDir(a.purchaseDate, b.purchaseDate, dir);
          if (va == null) return dir === "asc" ? 1 : -1;
          if (vb == null) return dir === "asc" ? -1 : 1;
          const raw = va - vb;
          return dir === "asc" ? raw : -raw;
        }
        case "name":
        default:
          return cmpOptionalStringDir(a.name, b.name, dir);
      }
    });
    return rows;
  }, [filtered, assetSortKey, assetSortDir]);

  function onAssetSort(key: string) {
    const next = toggleColumnSort(assetSortKey, assetSortDir, key);
    setAssetSortKey(next.key);
    setAssetSortDir(next.dir);
  }

  const userNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of usersQ.data ?? []) {
      m.set(u.id, u.name);
    }
    return m;
  }, [usersQ.data]);

  const chipItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (appliedStatus) {
      items.push({ id: "status", label: `Status: ${appliedStatus}` });
    }
    if (appliedCategory) {
      items.push({ id: "category", label: `Kategori: ${appliedCategory}` });
    }
    if (appliedAssignedTo) {
      items.push({
        id: "assigned",
        label: `Ditugaskan: ${userNameById.get(appliedAssignedTo) ?? appliedAssignedTo}`,
      });
    }
    return items;
  }, [appliedStatus, appliedCategory, appliedAssignedTo, userNameById]);

  function openFilterSheet() {
    setDraftStatus(appliedStatus);
    setDraftCategory(appliedCategory);
    setDraftAssignedTo(appliedAssignedTo);
    setFilterOpen(true);
  }

  function applyFilters() {
    setAppliedStatus(draftStatus);
    setAppliedCategory(draftCategory);
    setAppliedAssignedTo(draftAssignedTo);
    setFilterOpen(false);
  }

  function resetFiltersInSheet() {
    setDraftStatus("");
    setDraftCategory("");
    setDraftAssignedTo("");
  }

  function removeChip(id: string) {
    if (id === "status") setAppliedStatus("");
    if (id === "category") setAppliedCategory("");
    if (id === "assigned") setAppliedAssignedTo("");
  }

  function openCreate() {
    setEditing(null);
    const env = loadFormDraftEnvelope(FormDraftKeys.assetCreate())?.payload;
    if (env && typeof env === "object") {
      const raw = env as { form?: Partial<typeof emptyForm> };
      if (raw.form) {
        setForm({ ...emptyForm, ...raw.form });
        setDialogOpen(true);
        return;
      }
    }
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(row: AssetRow) {
    setEditing(row);
    const env = loadFormDraftEnvelope(FormDraftKeys.assetEdit(row.id))?.payload;
    if (env && typeof env === "object") {
      const raw = env as { form?: Partial<typeof emptyForm> };
      if (raw.form) {
        setForm({
          name: raw.form.name ?? row.name,
          category: raw.form.category ?? row.category ?? "",
          description: raw.form.description ?? row.description ?? "",
          serialNumber: raw.form.serialNumber ?? row.serialNumber ?? "",
          status: raw.form.status ?? row.status,
          notes: raw.form.notes ?? row.notes ?? "",
          vendor: raw.form.vendor ?? row.vendor ?? "",
          purchaseDate:
            raw.form.purchaseDate ?? toDateInput(row.purchaseDate),
          purchasePrice:
            raw.form.purchasePrice ??
            (row.purchasePrice != null && row.purchasePrice !== ""
              ? String(row.purchasePrice)
              : ""),
          warrantyExpiry:
            raw.form.warrantyExpiry ?? toDateInput(row.warrantyExpiry),
          assignedTo: raw.form.assignedTo ?? row.assignedTo ?? "",
          projectId: raw.form.projectId ?? row.projectId ?? "",
        });
        setDialogOpen(true);
        return;
      }
    }
    setForm({
      name: row.name,
      category: row.category ?? "",
      description: row.description ?? "",
      serialNumber: row.serialNumber ?? "",
      status: row.status,
      notes: row.notes ?? "",
      vendor: row.vendor ?? "",
      purchaseDate: toDateInput(row.purchaseDate),
      purchasePrice:
        row.purchasePrice != null && row.purchasePrice !== ""
          ? String(row.purchasePrice)
          : "",
      warrantyExpiry: toDateInput(row.warrantyExpiry),
      assignedTo: row.assignedTo ?? "",
      projectId: row.projectId ?? "",
    });
    setDialogOpen(true);
  }

  const saveM = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        serialNumber: form.serialNumber.trim() || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
        vendor: form.vendor.trim() || undefined,
        purchaseDate: form.purchaseDate || undefined,
        purchasePrice: form.purchasePrice.trim()
          ? Number(form.purchasePrice)
          : undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        assignedTo: form.assignedTo || null,
        projectId: form.projectId || null,
      };
      if (editing) {
        await api.patch(`/api/assets/${editing.id}`, payload);
      } else {
        const createPayload = { ...payload };
        if (createPayload.assignedTo === null)
          delete createPayload.assignedTo;
        if (createPayload.projectId === null) delete createPayload.projectId;
        await api.post("/api/assets", createPayload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      clearFormDraft(
        editing
          ? FormDraftKeys.assetEdit(editing.id)
          : FormDraftKeys.assetCreate(),
      );
      setDialogOpen(false);
      toast.success(editing ? "Asset updated" : "Asset created");
    },
    onError: () => toast.error("Save failed"),
  });

  const assetDraftKey: string | null = dialogOpen
    ? editing
      ? FormDraftKeys.assetEdit(editing.id)
      : FormDraftKeys.assetCreate()
    : null;

  useDebouncedFormDraftSave(Boolean(assetDraftKey), assetDraftKey, () => {
      const filled = Object.values(form).some((v) => String(v).trim().length > 0);
      if (!filled) return undefined;
      return { form };
    },
    [form],
  );

  const delM = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/assets/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      setDeleteId(null);
      toast.success("Asset removed");
    },
    onError: () => toast.error("Delete failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Assets
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Lacak perangkat keras, lisensi, dan garansi tim Anda.
          </p>
        </div>
        {canMutate ? (
          <Button onClick={openCreate} className="shrink-0 gap-2">
            <Package className="size-4" />
            Add asset
          </Button>
        ) : null}
      </div>

      {stats.warrantySoon > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <span className="font-medium">
            {stats.warrantySoon} aset
          </span>{" "}
          memiliki garansi yang akan berakhir dalam 30 hari ke depan.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Total assets
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {stats.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              In use
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-sky-700 dark:text-sky-300">
              {stats.inUse}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Available
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {stats.available}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Warranty expiring
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-800 dark:text-amber-200">
              {stats.warrantySoon}
            </p>
          </CardContent>
        </Card>
      </div>

      <ResourceListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, serial, vendor, category…"
        filterActiveCount={filterCount}
        onOpenFilter={openFilterSheet}
        filterLabel="Filter assets"
      />

      <ActiveFilterChips items={chipItems} onRemove={removeChip} />

      {sortedFiltered.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
          {q.data?.length
            ? "Tidak ada aset yang cocok dengan pencarian atau filter."
            : "Belum ada aset. Tambahkan aset pertama Anda."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableTableHead
                  label="Asset"
                  columnKey="name"
                  activeSortKey={assetSortKey}
                  sortDirection={assetSortDir}
                  onSort={onAssetSort}
                />
                <SortableTableHead
                  label="Category"
                  columnKey="category"
                  activeSortKey={assetSortKey}
                  sortDirection={assetSortDir}
                  onSort={onAssetSort}
                />
                <SortableTableHead
                  label="Assigned to"
                  columnKey="assigned"
                  activeSortKey={assetSortKey}
                  sortDirection={assetSortDir}
                  onSort={onAssetSort}
                />
                <SortableTableHead
                  label="Status"
                  columnKey="status"
                  activeSortKey={assetSortKey}
                  sortDirection={assetSortDir}
                  onSort={onAssetSort}
                />
                <SortableTableHead
                  label="Warranty"
                  columnKey="warranty"
                  activeSortKey={assetSortKey}
                  sortDirection={assetSortDir}
                  onSort={onAssetSort}
                  className="whitespace-nowrap"
                />
                <SortableTableHead
                  label="Purchase"
                  columnKey="purchase"
                  activeSortKey={assetSortKey}
                  sortDirection={assetSortDir}
                  onSort={onAssetSort}
                  className="whitespace-nowrap"
                />
                {canMutate ? (
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiltered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.name}</p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {a.serialNumber ?? "—"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[140px] truncate">
                    {a.category ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm">
                    {a.assignedUser?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${assetStatusClass(a.status)}`}
                    >
                      {a.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                    {fmtShortDate(a.warrantyExpiry)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                    {fmtMoney(a.purchasePrice)}
                  </TableCell>
                  {canMutate ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Edit asset"
                          onClick={() => openEdit(a)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          aria-label="Delete asset"
                          onClick={() => setDeleteId(a.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus aset?</AlertDialogTitle>
            <AlertDialogDescription>
              Data aset akan dihapus permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && delM.mutate(deleteId)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className={filterSheetContentClassName}>
          <SheetHeader className={filterSheetHeaderClassName}>
            <SheetTitle className={filterSheetTitleClassName}>
              Filter aset
            </SheetTitle>
            <SheetDescription className={filterSheetDescriptionClassName}>
              Kombinasikan status, kategori, dan penanggung jawab.
            </SheetDescription>
          </SheetHeader>
          <FilterSheetBody>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Status</Label>
              <Select
                value={draftStatus || "__all__"}
                onValueChange={(v) =>
                  setDraftStatus(v === "__all__" ? "" : (v ?? ""))
                }
                items={assetsStatusFilterItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  {assetsStatusFilterItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Kategori</Label>
              <Select
                value={draftCategory || "__all__"}
                onValueChange={(v) =>
                  setDraftCategory(v === "__all__" ? "" : (v ?? ""))
                }
                items={assetsCategoryFilterItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua kategori" />
                </SelectTrigger>
                <SelectContent>
                  {assetsCategoryFilterItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canMutate ? (
              <div className={filterSheetFieldClassName}>
                <Label className={filterSheetLabelClassName}>
                  Ditugaskan ke
                </Label>
                <Select
                  value={draftAssignedTo || "__all__"}
                  onValueChange={(v) =>
                    setDraftAssignedTo(v === "__all__" ? "" : (v ?? ""))
                  }
                  items={assetsAssignedFilterItems}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetsAssignedFilterItems.map((it) => (
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton
          className="flex max-h-[min(90vh,800px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <DialogHeader className="border-border shrink-0 space-y-1 border-b px-6 py-4">
            <DialogTitle>
              {editing ? "Edit asset" : "New asset"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui detail aset, penugasan, dan garansi."
                : "Catat aset baru beserta informasi pembelian dan garansi."}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="as-name">Name</Label>
                  <Input
                    id="as-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="as-cat">Category</Label>
                  <Input
                    id="as-cat"
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, status: v ?? f.status }))
                    }
                    items={ASSET_FORM_STATUS_ITEMS}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_FORM_STATUS_ITEMS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="as-serial">Serial number</Label>
                  <Input
                    id="as-serial"
                    value={form.serialNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, serialNumber: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="as-desc">Description</Label>
                  <Textarea
                    id="as-desc"
                    rows={2}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Purchase & vendor
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="as-pdate">Purchase date</Label>
                    <Input
                      id="as-pdate"
                      type="date"
                      value={form.purchaseDate}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          purchaseDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="as-price">Purchase price</Label>
                    <Input
                      id="as-price"
                      inputMode="decimal"
                      value={form.purchasePrice}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          purchasePrice: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="as-vendor">Vendor</Label>
                    <Input
                      id="as-vendor"
                      value={form.vendor}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, vendor: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="as-warranty">Warranty expiry</Label>
                    <Input
                      id="as-warranty"
                      type="date"
                      value={form.warrantyExpiry}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          warrantyExpiry: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {canMutate ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Assignment
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Assigned to</Label>
                      <Select
                        value={form.assignedTo || "__none__"}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            assignedTo: v === "__none__" ? "" : (v ?? ""),
                          }))
                        }
                        items={assetFormAssignedItems}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tidak ditugaskan" />
                        </SelectTrigger>
                        <SelectContent>
                          {assetFormAssignedItems.map((it) => (
                            <SelectItem key={it.value} value={it.value}>
                              {it.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Project</Label>
                      <Select
                        value={form.projectId || "__none__"}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            projectId: v === "__none__" ? "" : (v ?? ""),
                          }))
                        }
                        items={assetFormProjectItems}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tanpa proyek" />
                        </SelectTrigger>
                        <SelectContent>
                          {assetFormProjectItems.map((it) => (
                            <SelectItem key={it.value} value={it.value}>
                              {it.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="as-notes">Notes</Label>
                <Textarea
                  id="as-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          {canMutate ? (
            <div className="bg-muted/40 flex shrink-0 justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={!form.name.trim() || saveM.isPending}
                onClick={() => saveM.mutate()}
              >
                {saveM.isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
