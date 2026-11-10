"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canAssignFormEntry,
  formatDate,
  operationalAssigneeCandidates,
  stepFor,
  userById,
  visibleProjects,
} from "@/lib/prototype/domain";
import {
  simproFinanceFormRows,
  type SimproFinanceFormType,
} from "@/lib/prototype/simpro-forms";
import type {
  FormEntry,
  FormEntryStatus,
  Project,
  StepForm,
} from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  NativeSelect,
  PageHeader,
  UserAvatar,
} from "../ui";
import { SurveyFormDialog } from "../forms";
import { ProjectAccordion } from "./project-accordion";
import { FormEntryPage } from "./form-entry-page";
import { useViewPreference, ViewToggle } from "../view-toggle";

type DisplayStatus =
  | "empty"
  | "submitted"
  | "need_revision"
  | "done"
  | "cancelled";

const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
  empty: "Belum diisi",
  submitted: "Submitted",
  need_revision: "Perlu revisi",
  done: "Selesai",
  cancelled: "Dibatalkan",
};

const DISPLAY_STATUS_CLASS: Record<DisplayStatus, string> = {
  empty: "bg-slate-100 text-slate-600 ring-slate-200",
  submitted: "bg-violet-100 text-violet-700 ring-violet-200",
  need_revision: "bg-rose-100 text-rose-700 ring-rose-200",
  done: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
};

function entryDisplayStatus(status: FormEntryStatus): DisplayStatus {
  if (status === "approved") return "done";
  if (status === "submitted") return "submitted";
  if (status === "need_revision") return "need_revision";
  if (status === "cancelled") return "cancelled";
  return "empty";
}

function legacyDisplayStatus(status: StepForm["status"]): DisplayStatus {
  if (status === "approved") return "done";
  if (status === "submitted") return "submitted";
  if (status === "need_revision") return "need_revision";
  return "empty";
}

function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1",
        DISPLAY_STATUS_CLASS[status],
      )}
    >
      {DISPLAY_STATUS_LABEL[status]}
    </span>
  );
}

type FormRow = {
  kind: "entry" | "legacy" | "finance";
  id: string;
  project?: Project;
  category: "Project";
  contextName: string;
  contextCode: string;
  formName: string;
  title: string;
  assigneeId?: string;
  status: DisplayStatus;
  submittedAt?: string;
  dueDate?: string;
  reviewComment?: string;
  entry?: FormEntry;
  form?: StepForm;
  type?: SimproFinanceFormType;
  href?: string;
};

function FormRowAssignControl({ row }: { row: FormRow }) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [userId, setUserId] = useState("");
  const entry = row.entry;
  if (
    !entry ||
    entry.status !== "unassigned" ||
    !currentUser ||
    !canAssignFormEntry(currentUser)
  ) {
    return null;
  }
  const candidates = row.project
    ? operationalAssigneeCandidates(store, currentUser, row.project)
    : [];
  if (candidates.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <NativeSelect
        value={userId}
        onChange={setUserId}
        className="h-7 w-[130px] text-[10px]"
      >
        <option value="">Pilih assignee</option>
        {candidates.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </NativeSelect>
      <Button
        size="xs"
        variant="outline"
        disabled={!userId}
        onClick={() => {
          store.assignFormEntry(entry.id, userId);
          toast.success("Entri form di-assign.");
          setUserId("");
        }}
      >
        Assign
      </Button>
    </div>
  );
}

function FormItem({
  row,
  onOpen,
}: {
  row: FormRow;
  onOpen: () => void;
}) {
  const store = usePrototypeStore();
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-2 rounded-lg p-3 shadow-sm ring-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{row.title}</p>
          <p className="text-muted-foreground mt-0.5 text-[10px]">
            {row.formName} · {row.contextCode}
          </p>
          <p className="text-muted-foreground truncate text-[10px]">
            {row.contextName}
          </p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground">Assignee</span>
        <UserAvatar user={userById(store, row.assigneeId)} size="sm" showName />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground">Due</span>
        <span>{formatDate(row.dueDate)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground">Submitted</span>
        <span>{formatDate(row.submittedAt)}</span>
      </div>
      <FormRowAssignControl row={row} />
      {row.reviewComment ? (
        <p className="text-muted-foreground line-clamp-2 rounded bg-muted/40 p-1.5 text-[10px]">
          {row.reviewComment}
        </p>
      ) : null}
      <Button className="mt-auto w-full" size="sm" variant="outline" onClick={onOpen}>
        Buka form
      </Button>
    </div>
  );
}

export function SimproFormsPage() {
  const store = usePrototypeStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryId = searchParams.get("entry");
  const currentUser = userById(store, store.currentUserId);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [view, setView] = useViewPreference("forms");

  const rows = useMemo<FormRow[]>(() => {
    if (!currentUser) return [];
    const projects = visibleProjects(store);
    const visibleIds = new Set(projects.map((project) => project.id));
    const result: FormRow[] = [];

    for (const entry of store.formEntries) {
      if (!entry.projectId) continue;
      if (!visibleIds.has(entry.projectId)) continue;
      if (
        (currentUser.role === "assignee" ||
          currentUser.role === "finance" ||
          currentUser.role === "media") &&
        entry.assigneeId !== currentUser.id
      ) {
        continue;
      }
      const project = projects.find((item) => item.id === entry.projectId);
      const step = stepFor(store, entry.projectId, entry.stepKey);
      if (!project || !step) continue;
      result.push({
        kind: "entry",
        id: entry.id,
        project,
        category: "Project" as const,
        contextName: project.name,
        contextCode: project.code,
        formName: step.formTemplate?.title ?? step.name,
        title: entry.title,
        assigneeId: entry.assigneeId,
        status: entryDisplayStatus(entry.status),
        submittedAt: entry.submittedAt,
        dueDate: entry.dueDate,
        reviewComment: entry.reviewComment,
        entry,
        href: `/forms?entry=${entry.id}`,
      });
    }

    for (const form of store.forms) {
      if (form.type !== "survey") continue;
      if (currentUser.role === "finance") continue;
      if (!visibleIds.has(form.projectId)) continue;
      if (currentUser.role === "assignee" && form.assigneeId !== currentUser.id) {
        continue;
      }
      const project = projects.find((item) => item.id === form.projectId);
      const hasSurveyStage = store.steps.some(
        (step) =>
          step.projectId === form.projectId &&
          (step.legacyKey === "survey" || step.financeKind === "survey"),
      );
      if (!project || !hasSurveyStage) continue;
      result.push({
        kind: "legacy",
        id: form.id,
        project,
        category: "Project" as const,
        contextName: project.name,
        contextCode: project.code,
        formName: "Form Survey",
        title: "Form Survey",
        assigneeId: form.assigneeId,
        status: legacyDisplayStatus(form.status),
        submittedAt: form.submittedAt,
        reviewComment: form.reviewComment,
        form,
      });
    }

    for (const row of simproFinanceFormRows(store, currentUser)) {
      result.push({
        kind: "finance",
        id: row.form.id,
        project: row.project,
        category: "Project" as const,
        contextName: row.project.name,
        contextCode: row.project.code,
        formName: row.formName,
        title: row.formName,
        assigneeId: row.form.assigneeId,
        status: legacyDisplayStatus(row.form.status),
        submittedAt: row.form.submittedAt,
        reviewComment: row.form.reviewComment,
        form: row.form,
        type: row.form.type as SimproFinanceFormType,
      });
    }

    return result;
  }, [store, currentUser]);

  const typeOptions = useMemo(
    () => [...new Set(rows.map((row) => row.formName))].sort(),
    [rows],
  );

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      if (!row.project) continue;
      map.set(row.project.id, row.project.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (projectFilter && row.project?.id !== projectFilter) return false;
        if (typeFilter && row.formName !== typeFilter) return false;
        if (statusFilter) {
          if (statusFilter === "review") {
            if (row.status !== "submitted") return false;
          } else if (row.status !== statusFilter) {
            return false;
          }
        }
        if (
          search &&
          !`${row.contextName} ${row.contextCode} ${row.title}`
            .toLowerCase()
            .includes(search.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [rows, projectFilter, typeFilter, statusFilter, search],
  );

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { key: string; name: string; code: string; color: string; rows: FormRow[] }
    >();
    for (const row of filtered) {
      if (!row.project) continue;
      const key = row.project.id;
      const group = map.get(key) ?? {
        key,
        name: row.project.name,
        code: row.project.code,
        color: row.project.coverColor,
        rows: [],
      };
      group.rows.push(row);
      map.set(key, group);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  if (!currentUser) return null;

  if (entryId) {
    return (
      <FormEntryPage entryId={entryId} onBack={() => router.push("/forms")} />
    );
  }

  const toggleGroup = (id: string) => {
    setCollapsed((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const openRow = (row: FormRow) => {
    if (row.kind === "legacy") {
      setOpenFormId(row.form?.id ?? null);
      return;
    }
    if (row.kind === "finance" && row.project && row.type) {
      router.push(
        currentUser?.role === "media"
          ? `/forms/finance/${row.project.id}/${row.type}`
          : `/crm/projects/${row.project.id}/forms/${row.type}`,
      );
      return;
    }
    if (row.entry) router.push(`/forms?entry=${row.entry.id}`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Forms"
        description="Form Survey, Form, dan Form Keuangan yang dapat Anda isi atau review. Badge menghitung form yang perlu Anda isi."
        actions={<ViewToggle value={view} onChange={setView} />}
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_160px_160px]">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari proyek atau formâ€¦"
            className="pl-8"
          />
        </div>
        <NativeSelect value={projectFilter} onChange={setProjectFilter}>
          <option value="">Semua konteks</option>
          {projectOptions.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={typeFilter} onChange={setTypeFilter}>
          <option value="">Semua jenis</option>
          {typeOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={statusFilter} onChange={setStatusFilter}>
          <option value="">Semua status</option>
          <option value="review">Menunggu review</option>
          {(["empty", "submitted", "need_revision", "done", "cancelled"] as DisplayStatus[]).map(
            (status) => (
              <option key={status} value={status}>
                {DISPLAY_STATUS_LABEL[status]}
              </option>
            ),
          )}
        </NativeSelect>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada form"
          description="Form akan muncul setelah proyek memakai tahap Form dan entri di-assign."
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Tidak ada form yang cocok"
          description="Ubah pencarian atau filter konteks, jenis form, dan status."
        />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Form</th>
                <th className="px-3 py-2">Konteks</th>
                <th className="px-3 py-2">Assignee</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Submit</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={`${row.kind}-${row.id}`} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.title}</p>
                    <p className="text-muted-foreground text-[10px]">{row.formName}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.contextName}</p>
                    <p className="text-muted-foreground text-[10px]">{row.contextCode}</p>
                  </td>
                  <td className="px-3 py-2">
                    <UserAvatar user={userById(store, row.assigneeId)} size="sm" showName />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2">{formatDate(row.dueDate)}</td>
                  <td className="px-3 py-2">{formatDate(row.submittedAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <FormRowAssignControl row={row} />
                      <Button size="sm" variant="outline" onClick={() => openRow(row)}>
                        Buka
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ key, name, code, color, rows: groupRows }) => {
            const open = !collapsed.includes(key);
            const typeGroups = [...new Set(groupRows.map((row) => row.formName))];
            return (
              <ProjectAccordion
                key={key}
                projectId={key}
                name={name}
                code={code}
                color={color}
                count={groupRows.length}
                unit="form"
                open={open}
                onToggle={() => toggleGroup(key)}
              >
                <div className="space-y-4 p-3">
                  {typeGroups.map((formName) => {
                    const typeRows = groupRows.filter(
                      (row) => row.formName === formName,
                    );
                    return (
                      <section key={formName} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-semibold">{formName}</h3>
                          <span className="text-muted-foreground text-[10px]">
                            {typeRows.length} form
                          </span>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {typeRows.map((row) => (
                            <FormItem
                              key={`${row.kind}-${row.id}`}
                              row={row}
                              onOpen={() => openRow(row)}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </ProjectAccordion>
            );
          })}
        </div>
      )}

      {openFormId ? (
        <SurveyFormDialog
          open={Boolean(openFormId)}
          onOpenChange={(open) => {
            if (!open) setOpenFormId(null);
          }}
          formId={openFormId}
        />
      ) : null}
    </div>
  );
}
