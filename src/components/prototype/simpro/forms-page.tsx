"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  formatDate,
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

type FormRow =
  | {
      kind: "entry";
      id: string;
      project: Project;
      formName: string;
      title: string;
      assigneeId?: string;
      status: DisplayStatus;
      submittedAt?: string;
      reviewComment?: string;
      entry: FormEntry;
    }
  | {
      kind: "legacy";
      id: string;
      project: Project;
      formName: string;
      title: string;
      assigneeId?: string;
      status: DisplayStatus;
      submittedAt?: string;
      reviewComment?: string;
      form: StepForm;
    }
  | {
      kind: "finance";
      id: string;
      project: Project;
      formName: string;
      title: string;
      assigneeId?: string;
      status: DisplayStatus;
      submittedAt?: string;
      reviewComment?: string;
      form: StepForm;
      type: SimproFinanceFormType;
    };

function rowPitching(store: ReturnType<typeof usePrototypeStore.getState>, projectId: string) {
  return store.pitchings.find(
    (pitching) => pitching.projectId === projectId && pitching.status === "won",
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
  const pitching = rowPitching(store, row.project.id);
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-2 rounded-lg p-3 shadow-sm ring-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">
            {pitching?.title ?? row.title}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[10px]">
            {row.formName} · {row.project.code}
          </p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground">Assignee</span>
        <UserAvatar user={userById(store, row.assigneeId)} size="sm" showName />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground">Submitted</span>
        <span>{formatDate(row.submittedAt)}</span>
      </div>
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

  const rows = useMemo<FormRow[]>(() => {
    if (!currentUser) return [];
    const projects = visibleProjects(store);
    const visibleIds = new Set(projects.map((project) => project.id));
    const result: FormRow[] = [];

    for (const entry of store.formEntries) {
      if (currentUser.role === "finance") continue;
      if (!entry.projectId) continue;
      if (!visibleIds.has(entry.projectId)) continue;
      if (currentUser.role === "assignee" && entry.assigneeId !== currentUser.id) {
        continue;
      }
      const project = projects.find((item) => item.id === entry.projectId);
      const step = stepFor(store, entry.projectId, entry.stepKey);
      if (!project || !step) continue;
      result.push({
        kind: "entry",
        id: entry.id,
        project,
        formName: step.formTemplate?.title ?? step.name,
        title: entry.title,
        assigneeId: entry.assigneeId,
        status: entryDisplayStatus(entry.status),
        submittedAt: entry.submittedAt,
        reviewComment: entry.reviewComment,
        entry,
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
    const map = new Map<string, Project>();
    for (const row of rows) map.set(row.project.id, row.project);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (projectFilter && row.project.id !== projectFilter) return false;
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
          !`${row.project.name} ${row.project.code} ${row.title}`
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
    const map = new Map<string, { project: Project; rows: FormRow[] }>();
    for (const row of filtered) {
      const group = map.get(row.project.id) ?? { project: row.project, rows: [] };
      group.rows.push(row);
      map.set(row.project.id, group);
    }
    return [...map.values()].sort((a, b) =>
      a.project.name.localeCompare(b.project.name),
    );
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
      setOpenFormId(row.form.id);
      return;
    }
    if (row.kind === "finance") {
      router.push(`/crm/projects/${row.project.id}/forms/${row.type}`);
      return;
    }
    router.push(`/forms?entry=${row.entry.id}`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Forms"
        description="Form Survey, Form, dan Form Keuangan (RAB/BAST/Invoice) yang dapat Anda isi atau review, dikelompokkan per proyek dan jenis form. Badge menghitung form yang perlu Anda isi."
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_160px_160px]">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari proyek atau form…"
            className="pl-8"
          />
        </div>
        <NativeSelect value={projectFilter} onChange={setProjectFilter}>
          <option value="">Semua proyek</option>
          {projectOptions.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
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
          description="Ubah pencarian atau filter proyek, jenis form, dan status."
        />
      ) : (
        <div className="space-y-3">
          {groups.map(({ project, rows: projectRows }) => {
            const open = !collapsed.includes(project.id);
            const typeGroups = [...new Set(projectRows.map((row) => row.formName))];
            return (
              <ProjectAccordion
                key={project.id}
                projectId={project.id}
                name={project.name}
                code={project.code}
                color={project.coverColor}
                count={projectRows.length}
                unit="form"
                open={open}
                onToggle={() => toggleGroup(project.id)}
              >
                <div className="space-y-4 p-3">
                  {typeGroups.map((formName) => {
                    const typeRows = projectRows.filter(
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
