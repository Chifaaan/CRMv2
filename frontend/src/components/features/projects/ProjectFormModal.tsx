"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FolderPlus, Save } from "lucide-react";
import { api } from "@/lib/api/client";
import { uploadFile } from "@/lib/upload";
import { useSession } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ProjectMemberPickerList,
  type ProjectMemberPickerUser,
} from "@/components/features/projects/ProjectMemberPickerList";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { canPickProjectMembersInProjectForm } from "@/lib/project-detail-permissions";
import {
  FormDraftKeys,
  clearFormDraft,
  loadFormDraftEnvelope,
} from "@/lib/form-draft-storage";
import { useDebouncedFormDraftSave } from "@/lib/hooks/use-debounced-form-draft-save";
import {
  COVER_COLORS,
  PROJECT_PHASE_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  type ProjectMemberRoleValue,
} from "./project-form-constants";
import { isAdminOrPmRole } from "@/lib/role-constants";

const schema = z.object({
  name: z.string().min(1, "Project name is required"),
  /** Hanya untuk tampilan edit (read-only); create tidak mengirim ke API. */
  code: z.string().optional(),
  description: z.string().optional(),
  clientId: z.string().optional(),
  parentId: z.string().optional(),
  phase: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  budget: z.string().optional(),
  actualCost: z.string().optional(),
  coverColor: z.string().optional(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type ClientRow = { id: string; companyName: string };
type ProjectOption = { id: string; name: string; code: string };
type UserRow = ProjectMemberPickerUser & {
  /** Client org id when `role === "client"`; used to hide users auto-linked to the project client. */
  clientId: string | null;
};

type ProjectDetailForm = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  phase: string | null;
  priority: string | null;
  clientId: string | null;
  parentId: string | null;
  startDate: string | null;
  endDate: string | null;
  actualEndDate: string | null;
  budget: unknown;
  actualCost: unknown;
  tags: string[];
  coverColor: string | null;
  /** Returned by API; banner file upload UI is not wired yet. */
  coverImageUrl?: string | null;
  members: {
    projectRole: string;
    user: { id: string; name: string; image: string | null };
  }[];
};

function dateInput(v: string | null | undefined) {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  const ymd = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (ymd) return ymd[1];
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    return format(d, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

function datePayloadField(v: string | undefined | null) {
  const t = v?.trim();
  return t ? t : undefined;
}

function decStr(v: unknown) {
  if (v == null || v === "") return "";
  return String(v);
}

/** Project member role is derived from the user’s app role (no per-project role picker). */
function projectRoleFromAppRole(role: string): ProjectMemberRoleValue {
  const r = role.toLowerCase();
  if (isAdminOrPmRole(r)) return "PM";
  if (r === "viewer") return "VIEWER";
  if (r === "client") return "CLIENT";
  return "DEVELOPER";
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  projectId?: string;
  excludeProjectId?: string;
  onSuccess?: () => void;
};

function BannerPickZone({
  onFile,
  hasPreview,
}: {
  onFile: (f: File) => void;
  hasPreview: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f && f.type.startsWith("image/")) onFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed px-4 py-4 transition-colors",
        dragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/30 bg-muted/40 hover:bg-muted/60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
      <span className="text-xs text-muted-foreground">
        {hasPreview
          ? "Seret atau klik untuk ganti gambar banner"
          : "Seret atau klik untuk pilih gambar banner"}
      </span>
    </div>
  );
}

export function ProjectFormModal({
  open,
  onOpenChange,
  mode,
  projectId,
  excludeProjectId,
  onSuccess,
}: Props) {
  const { data: session } = useSession();
  const sessionUserId = session?.user?.id ?? "";
  const appRole =
    (session?.user as { role?: string } | undefined)?.role ?? "developer";
  const canPickMembersForProjectForm = canPickProjectMembersInProjectForm(appRole);

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedClientMemberIds, setSelectedClientMemberIds] = useState<string[]>([]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  /** Untuk revokeObjectURL saat ganti preview / tutup modal — cegah leak & state tertukar antar proyek. */
  const bannerObjectUrlRef = useRef<string | null>(null);

  function revokeBannerObjectUrl() {
    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
      bannerObjectUrlRef.current = null;
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      clientId: "__none__",
      parentId: "__none__",
      phase: "",
      priority: "medium",
      status: "planning",
      startDate: "",
      endDate: "",
      actualEndDate: "",
      budget: "",
      actualCost: "",
      coverColor: COVER_COLORS[0],
      tags: "",
    },
  });

  const clientsQ = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await api.get<ClientRow[]>("/api/clients");
      return res.data;
    },
    enabled: open,
  });

  const projectsQ = useQuery({
    queryKey: ["projects", "parent-options"],
    queryFn: async () => {
      const res = await api.get<ProjectOption[]>("/api/projects");
      return res.data;
    },
    enabled: open,
  });

  const usersQ = useQuery({
    queryKey: ["users", "project-form"],
    queryFn: async () => {
      const res = await api.get<UserRow[]>("/api/users");
      return res.data;
    },
    enabled: open && canPickMembersForProjectForm,
    retry: false,
  });

  const detailQ = useQuery({
    queryKey: ["project", projectId, "form-modal"],
    queryFn: async () => {
      const res = await api.get<ProjectDetailForm>(`/api/projects/${projectId}`);
      return res.data;
    },
    enabled: open && mode === "edit" && Boolean(projectId),
  });

  const canPickMembers =
    canPickMembersForProjectForm && Boolean(usersQ.data?.length) && !usersQ.isError;

  const clientIdWatch = form.watch("clientId");

  const projectClientId =
    clientIdWatch && clientIdWatch !== "__none__" ? clientIdWatch : null;

  /** Team members: everyone except users belonging to the project's client org */
  const teamMemberChoices = useMemo(() => {
    const list = usersQ.data ?? [];
    return list.filter((u) => {
      if (projectClientId && u.role === "client" && u.clientId === projectClientId) {
        return false;
      }
      return true;
    });
  }, [usersQ.data, projectClientId]);

  /** Client members: only users from the project's selected client org */
  const clientMemberChoices = useMemo(() => {
    if (!projectClientId) return [];
    return (usersQ.data ?? []).filter(
      (u) => u.role === "client" && u.clientId === projectClientId,
    );
  }, [usersQ.data, projectClientId]);

  useEffect(() => {
    if (!open || !usersQ.data?.length) return;
    setSelectedMemberIds((prev) =>
      prev.filter((id) => {
        const u = usersQ.data!.find((x) => x.id === id);
        if (!u) return false;
        if (projectClientId && u.role === "client" && u.clientId === projectClientId) {
          return false;
        }
        return true;
      }),
    );
    setSelectedClientMemberIds((prev) =>
      prev.filter((id) => {
        const u = usersQ.data!.find((x) => x.id === id);
        if (!u) return false;
        return u.role === "client" && u.clientId === projectClientId;
      }),
    );
  }, [open, projectClientId, usersQ.data]);

  /** Tutup modal: bersihkan banner agar tidak “nyangkut” ke sesi edit berikutnya. */
  useEffect(() => {
    if (open) return;
    revokeBannerObjectUrl();
    setBannerFile(null);
    setBannerPreview(null);
  }, [open]);

  /** Edit proyek lain (projectId berubah): reset banner sebelum detail baru selesai dimuat. */
  useEffect(() => {
    if (!open || mode !== "edit" || !projectId) return;
    revokeBannerObjectUrl();
    setBannerFile(null);
    setBannerPreview(null);
  }, [open, mode, projectId]);

  useEffect(() => {
    if (!open) return;
    if (mode !== "create") return;
    const env = loadFormDraftEnvelope(FormDraftKeys.projectCreate())?.payload;
    revokeBannerObjectUrl();
    const createDefaults = {
      name: "",
      code: "",
      description: "",
      clientId: "__none__" as string,
      parentId: "__none__" as string,
      phase: "",
      priority: "medium",
      status: "planning",
      startDate: "",
      endDate: "",
      actualEndDate: "",
      budget: "",
      actualCost: "",
      coverColor: COVER_COLORS[0],
      tags: "",
    };
    if (env && typeof env === "object") {
      const raw = env as {
        values?: Partial<FormValues>;
        extras?: {
          selectedMemberIds?: string[];
          selectedClientMemberIds?: string[];
        };
      };
      if (raw.values && typeof raw.values === "object") {
        form.reset({ ...createDefaults, ...raw.values });
      } else {
        form.reset(createDefaults);
      }
      const team =
        raw.extras && Array.isArray(raw.extras.selectedMemberIds)
          ? raw.extras.selectedMemberIds
          : sessionUserId
            ? [sessionUserId]
            : [];
      const clientMem =
        raw.extras && Array.isArray(raw.extras.selectedClientMemberIds)
          ? raw.extras.selectedClientMemberIds
          : [];
      setSelectedMemberIds(team);
      setSelectedClientMemberIds(clientMem);
      setBannerFile(null);
      setBannerPreview(null);
      return;
    }
    form.reset(createDefaults);
    setSelectedMemberIds(sessionUserId ? [sessionUserId] : []);
    setSelectedClientMemberIds([]);
    setBannerFile(null);
    setBannerPreview(null);
  }, [open, mode, form, sessionUserId]);

  useEffect(() => {
    if (!open || mode !== "edit" || !detailQ.data || !projectId) return;
    const p = detailQ.data;
    if (p.id !== projectId) return;

    function applyMembersFromProject() {
      const pClientId = p.clientId ?? null;
      const allMemberIds = p.members.map((m) => m.user.id);
      const clientMemberIds = allMemberIds.filter((id) => {
        const u = usersQ.data?.find((x) => x.id === id);
        return u?.role === "client" && u?.clientId === pClientId;
      });
      setSelectedMemberIds(
        allMemberIds.filter((id) => !clientMemberIds.includes(id)),
      );
      setSelectedClientMemberIds(clientMemberIds);
    }

    const env = loadFormDraftEnvelope(
      FormDraftKeys.projectEdit(projectId),
    )?.payload;
    if (env && typeof env === "object") {
      const raw = env as {
        values?: Partial<FormValues>;
        extras?: {
          selectedMemberIds?: string[];
          selectedClientMemberIds?: string[];
        };
      };
      if (raw.values && typeof raw.values === "object") {
        form.reset({
          name: p.name,
          code: p.code,
          description: p.description ?? "",
          clientId: p.clientId ?? "__none__",
          parentId: p.parentId ?? "__none__",
          phase: p.phase ?? "",
          priority: p.priority ?? "medium",
          status: p.status,
          startDate: dateInput(p.startDate),
          endDate: dateInput(p.endDate),
          actualEndDate: dateInput(p.actualEndDate),
          budget: decStr(p.budget),
          actualCost: decStr(p.actualCost),
          coverColor: p.coverColor?.trim() || COVER_COLORS[0],
          tags: (p.tags ?? []).join(", "),
          ...raw.values,
        });
        if (
          raw.extras &&
          Array.isArray(raw.extras.selectedMemberIds) &&
          Array.isArray(raw.extras.selectedClientMemberIds)
        ) {
          setSelectedMemberIds(raw.extras.selectedMemberIds);
          setSelectedClientMemberIds(raw.extras.selectedClientMemberIds);
        } else {
          applyMembersFromProject();
        }
        revokeBannerObjectUrl();
        setBannerFile(null);
        setBannerPreview(p.coverImageUrl ?? null);
        return;
      }
    }

    form.reset({
      name: p.name,
      code: p.code,
      description: p.description ?? "",
      clientId: p.clientId ?? "__none__",
      parentId: p.parentId ?? "__none__",
      phase: p.phase ?? "",
      priority: p.priority ?? "medium",
      status: p.status,
      startDate: dateInput(p.startDate),
      endDate: dateInput(p.endDate),
      actualEndDate: dateInput(p.actualEndDate),
      budget: decStr(p.budget),
      actualCost: decStr(p.actualCost),
      coverColor: p.coverColor?.trim() || COVER_COLORS[0],
      tags: (p.tags ?? []).join(", "),
    });
    applyMembersFromProject();
    revokeBannerObjectUrl();
    setBannerFile(null);
    setBannerPreview(p.coverImageUrl ?? null);
  }, [open, mode, projectId, detailQ.data, form, usersQ.data]);

  const projectDraftKey =
    open && mode === "create"
      ? FormDraftKeys.projectCreate()
      : open && mode === "edit" && projectId
        ? FormDraftKeys.projectEdit(projectId)
        : null;

  const wfProject = form.watch();

  useDebouncedFormDraftSave(
    Boolean(projectDraftKey),
    projectDraftKey,
    () => {
      const v = form.getValues();
      const extrasCount =
        selectedMemberIds.length + selectedClientMemberIds.length;
      const has =
        !!(v.name ?? "").trim() ||
        !!(v.description ?? "").trim() ||
        !!(v.tags ?? "").trim() ||
        extrasCount > (sessionUserId ? 1 : 0) ||
        ((v.clientId ?? "") !== "" && v.clientId !== "__none__") ||
        ((v.parentId ?? "") !== "" && v.parentId !== "__none__") ||
        !!(v.phase ?? "").trim() ||
        !!(v.coverColor ?? "").trim() ||
        !!(v.budget ?? "").trim() ||
        !!(v.actualCost ?? "").trim();
      if (!has) return undefined;
      return {
        values: form.getValues(),
        extras: {
          selectedMemberIds: [...selectedMemberIds],
          selectedClientMemberIds: [...selectedClientMemberIds],
        },
      };
    },
    [
      wfProject,
      selectedMemberIds,
      selectedClientMemberIds,
      sessionUserId,
    ],
  );

  const parentChoices = useMemo(() => {
    const list = projectsQ.data ?? [];
    return excludeProjectId
      ? list.filter((p) => p.id !== excludeProjectId)
      : list;
  }, [projectsQ.data, excludeProjectId]);

  const projectStatusSelectItems = useMemo(
    () =>
      PROJECT_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
    [],
  );
  const projectPhaseSelectItems = useMemo(
    () => [
      { value: "__empty__", label: "— Select Phase —" },
      ...PROJECT_PHASE_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
    ],
    [],
  );
  const projectPrioritySelectItems = useMemo(
    () =>
      PROJECT_PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
    [],
  );
  const clientSelectItems = useMemo(() => {
    const rows = clientsQ.data ?? [];
    return [
      { value: "__none__", label: "— No client —" },
      ...rows.map((c) => ({ value: c.id, label: c.companyName })),
    ];
  }, [clientsQ.data]);
  const parentSelectItems = useMemo(
    () => [
      { value: "__none__", label: "— No parent (Top-level) —" },
      ...parentChoices.map((p) => ({ value: p.id, label: p.name })),
    ],
    [parentChoices],
  );

  function setMemberChecked(userId: string, checked: boolean) {
    setSelectedMemberIds((prev) => {
      if (checked) {
        return prev.includes(userId) ? prev : [...prev, userId];
      }
      return prev.filter((id) => id !== userId);
    });
  }

  function setClientMemberChecked(userId: string, checked: boolean) {
    setSelectedClientMemberIds((prev) => {
      if (checked) {
        return prev.includes(userId) ? prev : [...prev, userId];
      }
      return prev.filter((id) => id !== userId);
    });
  }

  async function onSubmit(values: FormValues) {
    const tagList = values.tags
      ? values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const membersPayload =
      canPickMembersForProjectForm && canPickMembers && usersQ.data
        ? [...new Set([...selectedMemberIds, ...selectedClientMemberIds])].map(
            (userId) => {
              const u = usersQ.data.find((x) => x.id === userId);
              return {
                userId,
                projectRole: projectRoleFromAppRole(u?.role ?? "developer"),
              };
            },
          )
        : undefined;

    try {
      let coverImageUrl: string | undefined;
      if (bannerFile) {
        const { url } = await uploadFile(bannerFile, "project-banners");
        coverImageUrl = url;
      } else if (mode === "edit" && bannerPreview === null) {
        coverImageUrl = "";
      }

      const payload: Record<string, unknown> = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        phase: values.phase?.trim() || undefined,
        priority: values.priority || "medium",
        status: values.status || "planning",
        startDate: datePayloadField(values.startDate),
        endDate: datePayloadField(values.endDate),
        actualEndDate: datePayloadField(values.actualEndDate),
        budget: values.budget?.trim()
          ? Number(values.budget)
          : undefined,
        actualCost: values.actualCost?.trim()
          ? Number(values.actualCost)
          : undefined,
        coverColor: values.coverColor?.trim() || undefined,
        tags: tagList,
      };
      if (coverImageUrl !== undefined) {
        payload.coverImageUrl = coverImageUrl;
      }
      if (mode === "edit") {
        payload.clientId =
          values.clientId && values.clientId !== "__none__"
            ? values.clientId
            : null;
        payload.parentId =
          values.parentId && values.parentId !== "__none__"
            ? values.parentId
            : null;
      } else {
        if (values.clientId && values.clientId !== "__none__") {
          payload.clientId = values.clientId;
        }
        if (values.parentId && values.parentId !== "__none__") {
          payload.parentId = values.parentId;
        }
      }
      if (membersPayload !== undefined) {
        payload.members = membersPayload;
      }

      if (mode === "create") {
        await api.post("/api/projects", payload);
        toast.success(`Project "${values.name.trim()}" created successfully.`);
        clearFormDraft(FormDraftKeys.projectCreate());
      } else if (projectId) {
        await api.patch(`/api/projects/${projectId}`, payload);
        toast.success(`Project "${values.name.trim()}" updated.`);
        clearFormDraft(FormDraftKeys.projectEdit(projectId));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Could not save project");
    }
  }

  const editLoading =
    mode === "edit" && open && detailQ.isPending && !detailQ.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92vh,calc(100%-2rem))] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>
            {mode === "edit" ? "Edit Project" : "New Project"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {editLoading ? (
            <div className="space-y-3 px-6 py-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
                <section className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Project Information
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="pf-name">
                      Project Name{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="pf-name"
                      placeholder="e.g. E-Commerce Platform v2"
                      {...form.register("name")}
                    />
                    {form.formState.errors.name ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    ) : null}
                  </div>
                  {mode === "edit" ? (
                    <div className="space-y-2">
                      <Label htmlFor="pf-code">Project code</Label>
                      <Input
                        id="pf-code"
                        readOnly
                        disabled
                        className="font-mono uppercase"
                        value={form.watch("code") ?? ""}
                      />
                      <p className="text-xs text-muted-foreground">
                        Kode dibuat otomatis saat proyek pertama kali disimpan dan
                        tidak dapat diubah.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Kode proyek akan dibuat otomatis (unik) saat Anda
                      menyimpan.
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="pf-desc">Description</Label>
                    <Textarea
                      id="pf-desc"
                      rows={3}
                      placeholder="Briefly describe the project scope and objectives…"
                      {...form.register("description")}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={form.watch("status") || "planning"}
                        onValueChange={(v) =>
                          form.setValue("status", v ?? "planning")
                        }
                        items={projectStatusSelectItems}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {projectStatusSelectItems.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Phase</Label>
                      <Select
                        value={form.watch("phase") || "__empty__"}
                        onValueChange={(v) =>
                          form.setValue(
                            "phase",
                            v === "__empty__" ? "" : (v ?? ""),
                          )
                        }
                        items={projectPhaseSelectItems}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="— Select Phase —" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectPhaseSelectItems.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={form.watch("priority") || "medium"}
                        onValueChange={(v) =>
                          form.setValue("priority", v ?? "medium")
                        }
                        items={projectPrioritySelectItems}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {projectPrioritySelectItems.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Client, Parent &amp; Timeline
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Client</Label>
                      <Select
                        value={form.watch("clientId") || "__none__"}
                        onValueChange={(v) =>
                          form.setValue("clientId", v ?? "__none__")
                        }
                        items={clientSelectItems}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="— No client —" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientSelectItems.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Parent Project</Label>
                      <Select
                        value={form.watch("parentId") || "__none__"}
                        onValueChange={(v) =>
                          form.setValue("parentId", v ?? "__none__")
                        }
                        items={parentSelectItems}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="— No parent (Top-level) —" />
                        </SelectTrigger>
                        <SelectContent>
                          {parentSelectItems.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div
                    className="grid gap-4 sm:grid-cols-3"
                    key={
                      mode === "edit" && detailQ.data
                        ? `tl-${detailQ.dataUpdatedAt}`
                        : "tl-create"
                    }
                  >
                    <div className="space-y-2">
                      <Label htmlFor="pf-start">Start Date</Label>
                      <Input
                        id="pf-start"
                        name="startDate"
                        type="date"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore
                        value={form.watch("startDate") ?? ""}
                        onChange={(e) =>
                          form.setValue("startDate", e.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pf-end">Target End Date</Label>
                      <Input
                        id="pf-end"
                        name="endDate"
                        type="date"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore
                        value={form.watch("endDate") ?? ""}
                        onChange={(e) =>
                          form.setValue("endDate", e.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pf-actual-end">Actual End Date</Label>
                      <Input
                        id="pf-actual-end"
                        name="actualEndDate"
                        type="date"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore
                        value={form.watch("actualEndDate") ?? ""}
                        onChange={(e) =>
                          form.setValue("actualEndDate", e.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Budget
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pf-budget">
                        Estimated Budget (IDR)
                      </Label>
                      <Input
                        id="pf-budget"
                        type="number"
                        min={0}
                        placeholder="0"
                        {...form.register("budget")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pf-actual-cost">
                        Actual Cost (IDR)
                      </Label>
                      <Input
                        id="pf-actual-cost"
                        type="number"
                        min={0}
                        placeholder="0"
                        {...form.register("actualCost")}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Tags
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="pf-tags">
                      Tags{" "}
                      <span className="font-normal text-muted-foreground">
                        (comma-separated)
                      </span>
                    </Label>
                    <Input
                      id="pf-tags"
                      placeholder="e.g. web, mobile, api"
                      {...form.register("tags")}
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Banner
                  </p>
                  {/* Banner image drop zone */}
                  <div>
                    <Label className="mb-2 block text-sm">Gambar banner</Label>
                    {bannerPreview ? (
                      <div className="relative mb-2 overflow-hidden rounded-lg border border-border">
                        <img
                          src={bannerPreview}
                          alt="Banner preview"
                          className="h-28 w-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white hover:bg-black/80"
                          onClick={() => {
                            revokeBannerObjectUrl();
                            setBannerFile(null);
                            setBannerPreview(null);
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    ) : null}
                    <BannerPickZone
                      onFile={(f) => {
                        revokeBannerObjectUrl();
                        const objectUrl = URL.createObjectURL(f);
                        bannerObjectUrlRef.current = objectUrl;
                        setBannerFile(f);
                        setBannerPreview(objectUrl);
                      }}
                      hasPreview={!!bannerPreview}
                    />
                  </div>
                  <p className="pt-1 text-xs font-medium text-muted-foreground">
                    Warna banner (digunakan jika tidak ada gambar)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COVER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={cn(
                          "size-8 rounded-full border-2 border-transparent shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          form.watch("coverColor") === c &&
                            "ring-2 ring-offset-2 ring-zinc-900",
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                        onClick={() => form.setValue("coverColor", c)}
                      />
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Team Members
                  </p>
                  {!canPickMembersForProjectForm ? (
                    <p className="text-sm text-muted-foreground">
                      Hanya <strong>Admin</strong> dan <strong>PM</strong> yang dapat
                      menambah atau mengubah anggota tim dan anggota client pada proyek ini.
                    </p>
                  ) : usersQ.isError ? (
                    <p className="text-sm text-muted-foreground">
                      Direktori anggota tidak dimuat. Pembuat proyek tetap
                      ditambahkan otomatis.
                    </p>
                  ) : (
                    <ProjectMemberPickerList
                      users={teamMemberChoices}
                      selectedIds={selectedMemberIds}
                      onCheckedChange={setMemberChecked}
                    />
                  )}
                </section>

                {canPickMembersForProjectForm && projectClientId ? (
                  <section className="space-y-3">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Client Members
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pilih pengguna dari client ini yang akan menjadi member
                      project.
                    </p>
                    {usersQ.isError ? null : (
                      <ProjectMemberPickerList
                        users={clientMemberChoices}
                        selectedIds={selectedClientMemberIds}
                        onCheckedChange={setClientMemberChecked}
                        maxHeightClassName="max-h-40"
                        checkedRowClassName="bg-violet-50 dark:bg-violet-950/20"
                        avatarFallbackClassName="bg-violet-100 text-violet-700"
                      />
                    )}
                  </section>
                ) : null}
              </div>

              <DialogFooter className="m-0 shrink-0 rounded-none border-t bg-muted/30 px-6 py-4 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || editLoading}
                  className="gap-1.5"
                >
                  {mode === "edit" ? (
                    <Save className="size-4" />
                  ) : (
                    <FolderPlus className="size-4" />
                  )}
                  {form.formState.isSubmitting
                    ? "Saving…"
                    : mode === "edit"
                      ? "Save Changes"
                      : "Create Project"}
                </Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
