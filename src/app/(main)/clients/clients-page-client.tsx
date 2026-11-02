"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  Globe,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ActiveFilterChips } from "@/components/features/crud/active-filter-chips";
import {
  FormGroup,
  FormRow,
  FormSectionTitle,
} from "@/components/features/crud/form-layout";
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
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ClientPortalUserDetailDialog,
  type PortalUserDetailRow,
} from "@/components/features/clients/client-portal-user-detail-dialog";
import {
  cmpOptionalStringDir,
  toggleColumnSort,
} from "@/lib/column-sort";
import type { SortDirection } from "@/lib/column-sort";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { uploadFile } from "@/lib/upload";
import { ImageDropZone } from "@/components/ui/image-drop-zone";
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
import {
  DEFAULT_LIST_PAGE_SIZE,
  type ListPageSize,
} from "@/lib/list-pagination";
import { useClampListPage } from "@/lib/hooks/use-clamp-list-page";
import { toast } from "sonner";
import {
  FormDraftKeys,
  clearFormDraft,
  loadFormDraftEnvelope,
} from "@/lib/form-draft-storage";
import { useDebouncedFormDraftSave } from "@/lib/hooks/use-debounced-form-draft-save";
import { isAdminOrPmRole } from "@/lib/role-constants";

type ClientRow = {
  id: string;
  companyName: string;
  industry: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  logo: string | null;
  notes: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type ProjectRow = {
  id: string;
  name: string;
  code: string;
  status?: string;
  clientId?: string | null;
  coverColor?: string | null;
};

/** Human-facing ref for list row (pagination order). */
function formatClientOrdinal(n: number) {
  return `CLT-${String(n).padStart(3, "0")}`;
}

const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "Education",
  "Retail & E-Commerce",
  "Manufacturing",
  "Government",
  "Logistics",
  "Media & Entertainment",
  "Telecommunications",
  "Real Estate",
  "Other",
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "prospect", label: "Prospect" },
] as const;

function isPresetIndustry(s: string) {
  return INDUSTRY_OPTIONS.includes(s as (typeof INDUSTRY_OPTIONS)[number]);
}

const CLIENTS_STATUS_FILTER_ITEMS = [
  { value: "__all__", label: "All status" },
  ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
];
const CLIENTS_INDUSTRY_FILTER_ITEMS = [
  { value: "__all__", label: "All industries" },
  ...INDUSTRY_OPTIONS.map((i) => ({ value: i, label: i })),
];
const CLIENT_FORM_STATUS_ITEMS = STATUS_OPTIONS.map((s) => ({
  value: s.value,
  label: s.label,
}));
const CLIENT_FORM_INDUSTRY_ITEMS = [
  { value: "__empty__", label: "—" },
  ...INDUSTRY_OPTIONS.map((i) => ({ value: i, label: i })),
  { value: "__other__", label: "Other (type below)" },
];

const emptyForm = {
  companyName: "",
  industry: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  website: "",
  notes: "",
  status: "prospect",
};

function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
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

function statusLabel(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

function clientStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "prospect":
      return "secondary";
    case "inactive":
      return "outline";
    default:
      return "outline";
  }
}

function truncateUrl(s: string, max: number) {
  const t = s.replace(/^https?:\/\//i, "");
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}


export function ClientsPageClient() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const canMutate = isAdminOrPmRole(role);
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<ClientRow | null>(null);
  const [detailListOrdinal, setDetailListOrdinal] = useState<number | null>(
    null,
  );
  const [clientDetailTab, setClientDetailTab] = useState<
    "overview" | "portal-users"
  >("overview");
  const [portalUserDetail, setPortalUserDetail] =
    useState<PortalUserDetailRow | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [industryCustom, setIndustryCustom] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [appliedStatus, setAppliedStatus] = useState<string>("");
  const [appliedIndustry, setAppliedIndustry] = useState<string>("");
  const [draftStatus, setDraftStatus] = useState<string>("");
  const [draftIndustry, setDraftIndustry] = useState<string>("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ListPageSize>(
    DEFAULT_LIST_PAGE_SIZE,
  );
  const [clientSortCol, setClientSortCol] = useState<string>("companyName");
  const [clientSortDir, setClientSortDir] = useState<SortDirection>("asc");
  const [portalSortCol, setPortalSortCol] = useState<string>("name");
  const [portalSortDir, setPortalSortDir] = useState<SortDirection>("asc");

  const q = useQuery({
    queryKey: [
      "clients",
      "paged",
      page,
      pageSize,
      search,
      appliedStatus,
      appliedIndustry,
      clientSortCol,
      clientSortDir,
    ],
    queryFn: async () => {
      const res = await api.get<{
        data: ClientRow[];
        meta: { total: number; page: number; take: number; pages: number };
      }>("/api/clients", {
        params: {
          page: String(page),
          take: String(pageSize),
          sortBy: clientSortCol,
          sortDir: clientSortDir,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(appliedStatus ? { status: appliedStatus } : {}),
          ...(appliedIndustry ? { industry: appliedIndustry } : {}),
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    setPage(1);
  }, [
    search,
    appliedStatus,
    appliedIndustry,
    pageSize,
    clientSortCol,
    clientSortDir,
  ]);

  function onClientTableSort(columnKey: string) {
    const next = toggleColumnSort(clientSortCol, clientSortDir, columnKey);
    setClientSortCol(next.key);
    setClientSortDir(next.dir);
    setPage(1);
  }

  function onPortalSort(columnKey: string) {
    const next = toggleColumnSort(portalSortCol, portalSortDir, columnKey);
    setPortalSortCol(next.key);
    setPortalSortDir(next.dir);
  }

  const meta = q.data?.meta;
  const rows = q.data?.data ?? [];
  const total = meta?.total ?? 0;

  useClampListPage(meta?.pages, setPage);

  function openClientDetail(c: ClientRow, listOrdinal: number) {
    setDetailClient(c);
    setDetailListOrdinal(listOrdinal);
  }

  function closeClientDetail() {
    setDetailClient(null);
    setDetailListOrdinal(null);
  }

  const projectsQ = useQuery({
    queryKey: ["projects", "clients-detail"],
    queryFn: async () => {
      const res = await api.get<ProjectRow[]>("/api/projects");
      return res.data;
    },
    enabled: !!detailClient,
  });

  const portalUsersQ = useQuery({
    queryKey: ["clients", detailClient?.id, "portal-users"],
    queryFn: async () => {
      const res = await api.get<PortalUserDetailRow[]>(
        `/api/clients/${detailClient!.id}/portal-users`,
      );
      return res.data;
    },
    enabled: !!detailClient,
  });

  const portalUsersSorted = useMemo(() => {
    const dir = portalSortDir;
    const rows = [...(portalUsersQ.data ?? [])];
    rows.sort((a, b) => {
      switch (portalSortCol) {
        case "email":
          return cmpOptionalStringDir(a.email, b.email, dir);
        case "role":
          return cmpOptionalStringDir(a.role, b.role, dir);
        case "status":
          return cmpOptionalStringDir(a.status, b.status, dir);
        case "name":
        default:
          return cmpOptionalStringDir(a.name, b.name, dir);
      }
    });
    return rows;
  }, [portalUsersQ.data, portalSortCol, portalSortDir]);

  const filterCount =
    (appliedStatus ? 1 : 0) + (appliedIndustry ? 1 : 0);

  const linkedProjects = useMemo(() => {
    if (!detailClient || !projectsQ.data) return [];
    return projectsQ.data.filter((p) => p.clientId === detailClient.id);
  }, [detailClient, projectsQ.data]);

  const chipItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (appliedStatus) {
      items.push({
        id: "status",
        label: `Status: ${statusLabel(appliedStatus)}`,
      });
    }
    if (appliedIndustry) {
      items.push({
        id: "industry",
        label: `Industry: ${appliedIndustry}`,
      });
    }
    return items;
  }, [appliedStatus, appliedIndustry]);

  function openFilterSheet() {
    setDraftStatus(appliedStatus);
    setDraftIndustry(appliedIndustry);
    setFilterOpen(true);
  }

  function applyFilters() {
    setAppliedStatus(draftStatus);
    setAppliedIndustry(draftIndustry);
    setFilterOpen(false);
  }

  function resetFiltersInSheet() {
    setDraftStatus("");
    setDraftIndustry("");
  }

  function removeChip(id: string) {
    if (id === "status") setAppliedStatus("");
    if (id === "industry") setAppliedIndustry("");
  }

  function resetLogoState() {
    setLogoFile(null);
    setLogoRemoved(false);
    setLogoPreview(null);
  }

  function openCreate() {
    setEditing(null);
    const env = loadFormDraftEnvelope(FormDraftKeys.clientCreate())?.payload;
    if (env && typeof env === "object") {
      const raw = env as {
        form?: Partial<typeof emptyForm> & typeof emptyForm;
        industryCustom?: boolean;
        logoRemoved?: boolean;
        logoPreviewPersist?: string | null;
      };
      resetLogoState();
      if (raw.form) {
        setForm({ ...emptyForm, ...raw.form });
        setIndustryCustom(Boolean(raw.industryCustom));
        setLogoRemoved(Boolean(raw.logoRemoved));
        if (
          raw.logoPreviewPersist &&
          !raw.logoPreviewPersist.startsWith("blob:")
        ) {
          setLogoPreview(raw.logoPreviewPersist);
        }
      } else {
        setForm(emptyForm);
        setIndustryCustom(false);
        resetLogoState();
      }
      setDialogOpen(true);
      return;
    }
    setForm(emptyForm);
    setIndustryCustom(false);
    resetLogoState();
    setDialogOpen(true);
  }

  function openEdit(row: ClientRow) {
    setEditing(row);
    const env = loadFormDraftEnvelope(FormDraftKeys.clientEdit(row.id))?.payload;
    resetLogoState();
    if (env && typeof env === "object") {
      const raw = env as {
        form?: Partial<typeof emptyForm> & typeof emptyForm;
        industryCustom?: boolean;
        logoRemoved?: boolean;
        logoPreviewPersist?: string | null;
      };
      if (raw.form) {
        setForm({
          companyName: raw.form.companyName ?? row.companyName,
          industry: raw.form.industry ?? row.industry ?? "",
          contactPerson: raw.form.contactPerson ?? row.contactPerson ?? "",
          contactEmail: raw.form.contactEmail ?? row.contactEmail ?? "",
          contactPhone: raw.form.contactPhone ?? row.contactPhone ?? "",
          address: raw.form.address ?? row.address ?? "",
          website: raw.form.website ?? row.website ?? "",
          notes: raw.form.notes ?? row.notes ?? "",
          status: raw.form.status ?? row.status,
        });
        const ind = raw.form.industry ?? row.industry ?? "";
        setIndustryCustom(
          typeof raw.industryCustom === "boolean"
            ? raw.industryCustom
            : !!ind && !isPresetIndustry(ind),
        );
        setLogoRemoved(Boolean(raw.logoRemoved));
        if (raw.logoRemoved) {
          setLogoPreview(null);
        } else if (
          raw.logoPreviewPersist &&
          !raw.logoPreviewPersist.startsWith("blob:")
        ) {
          setLogoPreview(raw.logoPreviewPersist);
        } else {
          setLogoPreview(row.logo);
        }
        setDialogOpen(true);
        return;
      }
    }
    const ind = row.industry ?? "";
    setForm({
      companyName: row.companyName,
      industry: ind,
      contactPerson: row.contactPerson ?? "",
      contactEmail: row.contactEmail ?? "",
      contactPhone: row.contactPhone ?? "",
      address: row.address ?? "",
      website: row.website ?? "",
      notes: row.notes ?? "",
      status: row.status,
    });
    setIndustryCustom(!!ind && !isPresetIndustry(ind));
    setLogoPreview(row.logo);
    setDialogOpen(true);
  }

  const saveM = useMutation({
    mutationFn: async () => {
      let logo: string | undefined;
      if (logoFile) {
        const { url } = await uploadFile(logoFile, "client-logos");
        logo = url;
      } else if (editing && logoRemoved) {
        logo = "";
      }

      const payload: Record<string, unknown> = {
        companyName: form.companyName.trim(),
        industry: form.industry.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        address: form.address.trim() || undefined,
        website: form.website.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
      };
      if (logo !== undefined) {
        payload.logo = logo;
      }
      const w = form.website.trim();
      if (w && !/^https?:\/\/.+/i.test(w)) {
        throw new Error("Website must start with http:// or https://");
      }
      const em = form.contactEmail.trim();
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        throw new Error("Enter a valid contact email");
      }
      if (editing) {
        await api.patch(`/api/clients/${editing.id}`, payload);
      } else {
        await api.post("/api/clients", payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      clearFormDraft(
        editing
          ? FormDraftKeys.clientEdit(editing.id)
          : FormDraftKeys.clientCreate(),
      );
      setDialogOpen(false);
      toast.success(editing ? "Client updated" : "Client created");
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const clientDraftKey: string | null = dialogOpen
    ? editing
      ? FormDraftKeys.clientEdit(editing.id)
      : FormDraftKeys.clientCreate()
    : null;

  useDebouncedFormDraftSave(Boolean(clientDraftKey), clientDraftKey, () => {
      const has =
        form.companyName.trim().length > 0 ||
        form.industry.trim().length > 0 ||
        form.contactPerson.trim().length > 0 ||
        form.contactEmail.trim().length > 0 ||
        form.contactPhone.trim().length > 0 ||
        form.address.trim().length > 0 ||
        form.website.trim().length > 0 ||
        form.notes.trim().length > 0 ||
        industryCustom ||
        logoRemoved;
      if (!has) return undefined;
      return {
        form,
        industryCustom,
        logoRemoved,
        logoPreviewPersist:
          logoPreview && !logoPreview.startsWith("blob:")
            ? logoPreview
            : null,
      };
    },
    [form, industryCustom, logoRemoved, logoPreview],
  );

  const delM = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/clients/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setDeleteId(null);
      toast.success("Client removed");
    },
    onError: () => toast.error("Delete failed"),
  });

  function renderClientCard(c: ClientRow, listOrdinal: number) {
    const displayCode = formatClientOrdinal(listOrdinal);
    return (
      <div
        key={c.id}
        tabIndex={0}
        className={cn(
          "group bg-card flex flex-col gap-3 rounded-xl border border-border p-5 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md",
          "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        onClick={() => openClientDetail(c, listOrdinal)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openClientDetail(c, listOrdinal);
          }
        }}
        role="group"
        aria-label={`${c.companyName}, ${displayCode}. Open details.`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="border-border bg-muted flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-md border">
            {c.logo ? (
              <img
                src={c.logo}
                alt=""
                className="size-full object-contain"
              />
            ) : (
              <span className="text-primary text-lg font-bold tracking-tight">
                {companyInitials(c.companyName)}
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-col items-end gap-1">
            <Badge variant={clientStatusBadgeVariant(c.status)} className="font-normal capitalize">
              {statusLabel(c.status)}
            </Badge>
            {c.industry ? (
              <span className="text-muted-foreground max-w-[160px] truncate text-xs">
                {c.industry}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <h3 className="text-base leading-tight font-semibold">
            {c.companyName}
          </h3>
          {c.contactPerson ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <User className="size-3.5 shrink-0" />
              <span className="truncate">{c.contactPerson}</span>
            </div>
          ) : null}
          {c.contactEmail ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{c.contactEmail}</span>
            </div>
          ) : null}
          {c.contactPhone ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Phone className="size-3.5 shrink-0" />
              <span className="truncate">{c.contactPhone}</span>
            </div>
          ) : null}
          {c.website ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Globe className="size-3.5 shrink-0" />
              <a
                href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary truncate hover:underline"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {truncateUrl(c.website, 35)}
              </a>
            </div>
          ) : null}
        </div>
        <div className="border-border flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-muted-foreground font-mono text-xs tracking-wide">
            {displayCode}
          </span>
          <div
            className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {canMutate ? (
              <>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  title="Edit client"
                  aria-label="Edit client"
                  onClick={() => openEdit(c)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  title="Delete client"
                  aria-label="Delete client"
                  onClick={() => setDeleteId(c.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Clients
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage client accounts and linked projects
          </p>
        </div>
        {canMutate ? (
          <Button onClick={openCreate} className="shrink-0 gap-2">
            <Building2 className="size-4" />
            Add Client
          </Button>
        ) : null}
      </div>

      <ResourceListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by company, contact, or email…"
        filterActiveCount={filterCount}
        onOpenFilter={openFilterSheet}
        filterLabel="Filter clients"
      >
        <div className="bg-muted/60 flex rounded-lg p-0.5 ring-1 ring-border/60">
          <Button
            type="button"
            variant={viewMode === "card" ? "secondary" : "ghost"}
            size="icon-sm"
            className="size-9 rounded-md"
            onClick={() => setViewMode("card")}
            aria-label="Card view"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            type="button"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon-sm"
            className="size-9 rounded-md"
            onClick={() => setViewMode("table")}
            aria-label="Table view"
          >
            <List className="size-4" />
          </Button>
        </div>
      </ResourceListToolbar>

      <ActiveFilterChips items={chipItems} onRemove={removeChip} />

      {total === 0 && !q.isFetching ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
          {search.trim() || appliedStatus || appliedIndustry ? (
            "No clients match your filters"
          ) : (
            <div className="space-y-4">
              <p>No clients yet</p>
              {canMutate ? (
                <Button onClick={openCreate} className="gap-2">
                  <Building2 className="size-4" />
                  Add Client
                </Button>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <>
          {viewMode === "card" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {rows.map((c, i) =>
                renderClientCard(c, (page - 1) * pageSize + i + 1),
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableTableHead
                      label="Company"
                      columnKey="companyName"
                      activeSortKey={clientSortCol}
                      sortDirection={clientSortDir}
                      onSort={onClientTableSort}
                    />
                    <SortableTableHead
                      label="Contact"
                      columnKey="contactPerson"
                      activeSortKey={clientSortCol}
                      sortDirection={clientSortDir}
                      onSort={onClientTableSort}
                    />
                    <SortableTableHead
                      label="Industry"
                      columnKey="industry"
                      activeSortKey={clientSortCol}
                      sortDirection={clientSortDir}
                      onSort={onClientTableSort}
                    />
                    <SortableTableHead
                      label="Status"
                      columnKey="status"
                      activeSortKey={clientSortCol}
                      sortDirection={clientSortDir}
                      onSort={onClientTableSort}
                    />
                    <SortableTableHead
                      label="Since"
                      columnKey="createdAt"
                      activeSortKey={clientSortCol}
                      sortDirection={clientSortDir}
                      onSort={onClientTableSort}
                      className="whitespace-nowrap"
                    />
                    <TableHead className="w-32 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c, i) => {
                    const ord = (page - 1) * pageSize + i + 1;
                    const rowCode = formatClientOrdinal(ord);
                    return (
                      <TableRow
                        key={c.id}
                        tabIndex={0}
                        className={cn(
                          "group border-b border-border/80 cursor-pointer outline-none hover:bg-muted/40",
                          "focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                        )}
                        onClick={() => openClientDetail(c, ord)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openClientDetail(c, ord);
                          }
                        }}
                        aria-label={`${c.companyName}, ${rowCode}. Open details.`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="border-border bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border text-xs font-semibold">
                              {c.logo ? (
                                <img
                                  src={c.logo}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                companyInitials(c.companyName)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {c.companyName}
                              </p>
                              <p className="text-muted-foreground font-mono text-[11px] tracking-wide">
                                {rowCode}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] space-y-0.5 text-sm">
                            <p className="truncate font-medium">
                              {c.contactPerson ?? "—"}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {c.contactEmail ?? "—"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[160px] truncate">
                          {c.industry ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={clientStatusBadgeVariant(c.status)}
                            className="font-normal capitalize"
                          >
                            {statusLabel(c.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                          {fmtShortDate(c.createdAt)}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                            {canMutate ? (
                              <>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label="Edit client"
                                  onClick={() => openEdit(c)}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  aria-label="Delete client"
                                  onClick={() => setDeleteId(c.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-foreground/10">
            <ListPaginationBar
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={q.isFetching}
            />
          </div>
        </>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              This client will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && delM.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className={filterSheetContentClassName}>
          <SheetHeader className={filterSheetHeaderClassName}>
            <SheetTitle className={filterSheetTitleClassName}>
              Filter klien
            </SheetTitle>
            <SheetDescription className={filterSheetDescriptionClassName}>
              Persempit daftar berdasarkan status dan industri.
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
                items={CLIENTS_STATUS_FILTER_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENTS_STATUS_FILTER_ITEMS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={filterSheetFieldClassName}>
              <Label className={filterSheetLabelClassName}>Industri</Label>
              <Select
                value={draftIndustry || "__all__"}
                onValueChange={(v) =>
                  setDraftIndustry(v === "__all__" ? "" : (v ?? ""))
                }
                items={CLIENTS_INDUSTRY_FILTER_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All industries" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENTS_INDUSTRY_FILTER_ITEMS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
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

      <Dialog
        open={!!detailClient}
        onOpenChange={(o) => {
          if (!o) {
            closeClientDetail();
            setClientDetailTab("overview");
            setPortalUserDetail(null);
          }
        }}
      >
        <DialogContent
          showCloseButton
          className="flex h-[min(88vh,680px)] max-h-[min(88vh,680px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          {detailClient ? (
            <>
              <DialogHeader className="border-border shrink-0 space-y-1.5 border-b px-6 pt-5 pb-4">
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  Client details
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  Company overview, portal users, and linked projects.
                </DialogDescription>
              </DialogHeader>
              <Tabs
                value={clientDetailTab}
                onValueChange={(v) =>
                  setClientDetailTab(v as "overview" | "portal-users")
                }
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="border-border shrink-0 border-b px-6 pt-3 pb-2">
                  <TabsList variant="line" className="w-full justify-start gap-1">
                    <TabsTrigger value="overview" className="px-3">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="portal-users"
                      className="inline-flex items-center gap-2 px-3"
                    >
                      <span>Portal users</span>
                      {detailClient ? (
                        portalUsersQ.isPending ? (
                          <Badge
                            variant="secondary"
                            className="text-muted-foreground h-5 min-w-[1.25rem] justify-center rounded-full px-1.5 font-mono text-[10px] tabular-nums"
                            aria-hidden
                          >
                            …
                          </Badge>
                        ) : portalUsersQ.isSuccess ? (
                          <Badge
                            variant="secondary"
                            className="h-5 min-w-[1.25rem] justify-center rounded-full px-1.5 font-mono text-[11px] font-medium tabular-nums"
                            aria-label={`${portalUsersQ.data.length} portal users`}
                          >
                            {portalUsersQ.data.length}
                          </Badge>
                        ) : null
                      ) : null}
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="overview"
                  className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5 data-[state=inactive]:hidden"
                >
                  <div className="space-y-7">
                    <div className="flex flex-wrap gap-4">
                      <div className="border-border bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                        {detailClient.logo ? (
                          <img
                            src={detailClient.logo}
                            alt=""
                            className="size-full object-contain"
                          />
                        ) : (
                          <span className="text-primary text-xl font-bold">
                            {companyInitials(detailClient.companyName)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <h2 className="text-lg font-semibold">
                          {detailClient.companyName}
                        </h2>
                        <p className="text-muted-foreground font-mono text-xs tracking-wide">
                          {detailListOrdinal != null
                            ? formatClientOrdinal(detailListOrdinal)
                            : `REF-${detailClient.id.slice(-6)}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={clientStatusBadgeVariant(
                              detailClient.status,
                            )}
                            className="font-normal capitalize"
                          >
                            {statusLabel(detailClient.status)}
                          </Badge>
                          {detailClient.industry ? (
                            <Badge variant="outline" className="font-normal">
                              {detailClient.industry}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-foreground mb-2.5 text-sm font-semibold tracking-tight">
                        Contact information
                      </h4>
                      <div className="space-y-2.5 text-sm leading-relaxed">
                        {detailClient.contactPerson ? (
                          <div className="flex items-center gap-2">
                            <User className="text-muted-foreground size-4 shrink-0" />
                            <span>{detailClient.contactPerson}</span>
                          </div>
                        ) : null}
                        {detailClient.contactEmail ? (
                          <div className="flex items-center gap-2">
                            <Mail className="text-muted-foreground size-4 shrink-0" />
                            <a
                              href={`mailto:${detailClient.contactEmail}`}
                              className="text-primary hover:underline"
                            >
                              {detailClient.contactEmail}
                            </a>
                          </div>
                        ) : null}
                        {detailClient.contactPhone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="text-muted-foreground size-4 shrink-0" />
                            <span>{detailClient.contactPhone}</span>
                          </div>
                        ) : null}
                        {detailClient.website ? (
                          <div className="flex items-center gap-2">
                            <Globe className="text-muted-foreground size-4 shrink-0" />
                            <a
                              href={
                                detailClient.website.startsWith("http")
                                  ? detailClient.website
                                  : `https://${detailClient.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary break-all hover:underline"
                            >
                              {detailClient.website}
                            </a>
                          </div>
                        ) : null}
                        {detailClient.address ? (
                          <div className="flex items-start gap-2">
                            <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                            <span>{detailClient.address}</span>
                          </div>
                        ) : null}
                        {!detailClient.contactPerson &&
                        !detailClient.contactEmail &&
                        !detailClient.contactPhone &&
                        !detailClient.website &&
                        !detailClient.address ? (
                          <p className="text-muted-foreground text-sm">
                            No contact information provided.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-foreground mb-2.5 text-sm font-semibold tracking-tight">
                        Dates
                      </h4>
                      <div className="text-muted-foreground space-y-2.5 text-sm leading-relaxed">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="size-4 shrink-0" />
                          <span>
                            Added {fmtShortDate(detailClient.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="size-4 shrink-0" />
                          <span>
                            Updated {fmtShortDate(detailClient.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {detailClient.notes ? (
                      <div>
                        <h4 className="text-foreground mb-2.5 text-sm font-semibold tracking-tight">
                          Notes
                        </h4>
                        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                          {detailClient.notes}
                        </p>
                      </div>
                    ) : null}

                    <div>
                      <h4 className="text-foreground mb-2.5 flex items-center gap-2 text-sm font-semibold tracking-tight">
                        Linked projects
                        <Badge variant="secondary" className="font-normal">
                          {linkedProjects.length}
                        </Badge>
                      </h4>
                      {linkedProjects.length === 0 ? (
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          No projects linked to this client yet.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {linkedProjects.map((p) => (
                            <Link
                              key={p.id}
                              href={`/projects/${p.id}`}
                              className="hover:bg-muted/80 flex items-center gap-3 rounded-lg border border-border px-4 py-3 transition-colors"
                            >
                              <div
                                className="size-2.5 shrink-0 rounded-full"
                                style={{
                                  background:
                                    p.coverColor ?? "var(--primary)",
                                }}
                              />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{p.name}</p>
                                <p className="text-muted-foreground text-xs">
                                  {p.code} · {p.status ?? "—"}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent
                  value="portal-users"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-4 pb-3 data-[state=inactive]:hidden"
                >
                  <p className="text-muted-foreground mb-3 shrink-0 text-sm leading-relaxed">
                    Users linked to this client company (typically client-role
                    portal accounts). Select a row to view the full profile.
                  </p>
                  <div
                    className="border-border bg-muted/15 min-h-0 flex-1 overflow-y-auto overscroll-y-contain rounded-lg border"
                    role="region"
                    aria-label="Portal users"
                  >
                    {portalUsersQ.isLoading ? (
                      <p className="text-muted-foreground px-4 py-12 text-center text-sm">
                        Loading…
                      </p>
                    ) : portalUsersQ.isError ? (
                      <p className="text-destructive px-4 py-12 text-center text-sm leading-relaxed">
                        Could not load portal users.
                      </p>
                    ) : !portalUsersQ.data?.length ? (
                      <p className="text-muted-foreground px-4 py-12 text-center text-sm leading-relaxed">
                        No portal users linked to this client yet.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader className="bg-muted/35">
                          <TableRow className="hover:bg-transparent">
                            <SortableTableHead
                              label="Name"
                              columnKey="name"
                              activeSortKey={portalSortCol}
                              sortDirection={portalSortDir}
                              onSort={onPortalSort}
                              className="h-11 py-2.5 font-medium"
                            />
                            <SortableTableHead
                              label="Email"
                              columnKey="email"
                              activeSortKey={portalSortCol}
                              sortDirection={portalSortDir}
                              onSort={onPortalSort}
                              className="h-11 py-2.5 font-medium"
                            />
                            <SortableTableHead
                              label="Role"
                              columnKey="role"
                              activeSortKey={portalSortCol}
                              sortDirection={portalSortDir}
                              onSort={onPortalSort}
                              className="h-11 py-2.5 font-medium"
                            />
                            <SortableTableHead
                              label="Status"
                              columnKey="status"
                              activeSortKey={portalSortCol}
                              sortDirection={portalSortDir}
                              onSort={onPortalSort}
                              className="h-11 py-2.5 font-medium"
                            />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {portalUsersSorted.map((u) => (
                            <TableRow
                              key={u.id}
                              className="hover:bg-muted/60 cursor-pointer border-border/80"
                              onClick={() => setPortalUserDetail(u)}
                            >
                              <TableCell className="py-2.5 font-medium">
                                {u.name}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate py-2.5">
                                {u.email}
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Badge
                                  variant={memberRoleBadgeVariant(u.role)}
                                  className="font-normal"
                                >
                                  {memberRoleLabel(u.role)}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Badge
                                  variant={userStatusBadgeVariant(u.status)}
                                  className={cn(
                                    "font-normal capitalize",
                                    userStatusBadgeClassName(u.status),
                                  )}
                                >
                                  {userStatusLabel(u.status)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter className="border-border bg-muted/30 mx-0 mb-0 shrink-0 gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 w-full px-5 sm:w-auto"
                  onClick={() => {
                    closeClientDetail();
                    setClientDetailTab("overview");
                    setPortalUserDetail(null);
                  }}
                >
                  Close
                </Button>
                {canMutate ? (
                  <Button
                    type="button"
                    className="min-h-10 w-full gap-2 px-5 sm:w-auto"
                    onClick={() => {
                      const c = detailClient;
                      closeClientDetail();
                      setClientDetailTab("overview");
                      setPortalUserDetail(null);
                      openEdit(c);
                    }}
                  >
                    <Pencil className="size-4 shrink-0" />
                    Edit client
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ClientPortalUserDetailDialog
        open={!!portalUserDetail}
        onOpenChange={(open) => !open && setPortalUserDetail(null)}
        user={portalUserDetail}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton
          className="flex max-h-[min(90vh,820px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <DialogHeader className="border-border shrink-0 space-y-1 border-b px-6 py-4">
            <DialogTitle>
              {editing ? "Edit Client" : "Add New Client"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update company profile, contacts, and logo."
                : "Add a new client record."}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <FormSectionTitle>Company Information</FormSectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormGroup className="sm:col-span-2">
                <Label htmlFor="cc-name">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cc-name"
                  placeholder="e.g. PT Maju Teknologi"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyName: e.target.value }))
                  }
                />
              </FormGroup>
              <FormGroup className="sm:col-span-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v ?? f.status }))
                  }
                  items={CLIENT_FORM_STATUS_ITEMS}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_FORM_STATUS_ITEMS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormGroup>
            </div>
            <FormRow className="mt-4">
              <FormGroup>
                <Label>Industry</Label>
                <Select
                  value={
                    industryCustom ||
                    (form.industry && !isPresetIndustry(form.industry))
                      ? "__other__"
                      : isPresetIndustry(form.industry)
                        ? form.industry
                        : "__empty__"
                  }
                  onValueChange={(v) => {
                    if (v === "__other__") {
                      setIndustryCustom(true);
                      setForm((f) =>
                        isPresetIndustry(f.industry)
                          ? { ...f, industry: "" }
                          : { ...f },
                      );
                    } else if (v === "__empty__") {
                      setIndustryCustom(false);
                      setForm((f) => ({ ...f, industry: "" }));
                    } else {
                      setIndustryCustom(false);
                      setForm((f) => ({ ...f, industry: v ?? "" }));
                    }
                  }}
                  items={CLIENT_FORM_INDUSTRY_ITEMS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_FORM_INDUSTRY_ITEMS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {industryCustom ||
                (form.industry.length > 0 &&
                  !isPresetIndustry(form.industry)) ? (
                  <Input
                    className="mt-2"
                    placeholder="Industry name"
                    value={form.industry}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, industry: e.target.value }))
                    }
                  />
                ) : null}
              </FormGroup>
              <FormGroup>
                <Label htmlFor="cc-website">Website</Label>
                <Input
                  id="cc-website"
                  type="url"
                  placeholder="https://example.com"
                  value={form.website}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, website: e.target.value }))
                  }
                />
              </FormGroup>
            </FormRow>
            <FormGroup className="mt-4">
              <Label htmlFor="cc-address">Address</Label>
              <Textarea
                id="cc-address"
                rows={2}
                placeholder="Full company address…"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </FormGroup>

            <FormSectionTitle>Primary Contact</FormSectionTitle>
            <FormRow>
              <FormGroup>
                <Label htmlFor="cc-person">Contact Person</Label>
                <Input
                  id="cc-person"
                  placeholder="e.g. Budi Santoso"
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactPerson: e.target.value }))
                  }
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="cc-phone">Contact Phone</Label>
                <Input
                  id="cc-phone"
                  type="tel"
                  placeholder="e.g. +62 812 3456 7890"
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactPhone: e.target.value }))
                  }
                />
              </FormGroup>
            </FormRow>
            <FormGroup className="mt-4">
              <Label htmlFor="cc-email">Contact Email</Label>
              <Input
                id="cc-email"
                type="email"
                placeholder="e.g. budi@company.com"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactEmail: e.target.value }))
                }
              />
            </FormGroup>

            <FormSectionTitle>Notes</FormSectionTitle>
            <FormGroup>
              <Label htmlFor="cc-notes">Internal Notes</Label>
              <Textarea
                id="cc-notes"
                rows={3}
                placeholder="Any internal notes about this client…"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </FormGroup>

            <FormSectionTitle>Logo</FormSectionTitle>
            <ImageDropZone
              preview={logoPreview}
              initials={companyInitials(form.companyName || "?")}
              label="logo"
              hint="JPG, PNG, atau WebP. Ditampilkan di kartu client."
              size={80}
              shape="square"
              onFile={(f) => {
                setLogoFile(f);
                setLogoRemoved(false);
                setLogoPreview(URL.createObjectURL(f));
              }}
              canRemove={!!(editing && (editing.logo || logoFile))}
              onRemove={() => {
                setLogoFile(null);
                setLogoRemoved(true);
                setLogoPreview(null);
              }}
            />
          </div>
          <div className="bg-muted/40 flex shrink-0 justify-end gap-2 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!form.companyName.trim() || saveM.isPending}
              onClick={() => saveM.mutate()}
            >
              {saveM.isPending
                ? "Saving…"
                : editing
                  ? "Save Changes"
                  : "Add Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
