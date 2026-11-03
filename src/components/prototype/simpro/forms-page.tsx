"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  formatDate,
  roleCanAccessCrm,
  userById,
  visibleProjects,
} from "@/lib/prototype/domain";
import {
  crmFormHref,
  FORM_DISPLAY_STATUS_LABEL,
  FORM_DISPLAY_STATUS_ORDER,
  formDisplayStatus,
  SIMPRO_FORM_TYPES,
  simproFormType,
  type FormDisplayStatus,
  type SimproFormType,
} from "@/lib/prototype/form-types";
import type { Project, StepForm } from "@/lib/prototype/types";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  NativeSelect,
  PageHeader,
  UserAvatar,
} from "../ui";
import { SurveyFormDialog } from "../forms";
import { ProjectAccordion } from "./project-accordion";

const STATUS_CLASS: Record<FormDisplayStatus, string> = {
  empty: "bg-slate-100 text-slate-600 ring-slate-200",
  submitted: "bg-violet-100 text-violet-700 ring-violet-200",
  need_revision: "bg-rose-100 text-rose-700 ring-rose-200",
  done: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

function FormDisplayStatusBadge({ status }: { status: FormDisplayStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1",
        STATUS_CLASS[status],
      )}
    >
      {FORM_DISPLAY_STATUS_LABEL[status]}
    </span>
  );
}

type FormRow = {
  form: StepForm;
  project: Project;
  type: SimproFormType;
};

function FormItem({
  row,
  onOpen,
  canOpenCrm,
}: {
  row: FormRow;
  onOpen: () => void;
  canOpenCrm: boolean;
}) {
  const store = usePrototypeStore();
  const { form, project, type } = row;
  const assignee = userById(store, form.assigneeId);
  const pitching = store.pitchings.find(
    (item) => item.projectId === project.id && item.status === "won",
  );
  const displayStatus = formDisplayStatus(form.status);

  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-2 rounded-lg p-3 shadow-sm ring-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">
            {pitching?.title ?? `${type.label} ${project.code}`}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[10px]">
            {type.label} · {project.code}
          </p>
        </div>
        <FormDisplayStatusBadge status={displayStatus} />
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground">Assignee</span>
        <UserAvatar user={assignee} size="sm" showName />
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground">Submitted</span>
        <span>{formatDate(form.submittedAt)}</span>
      </div>

      {form.reviewComment ? (
        <p className="text-muted-foreground line-clamp-2 rounded bg-muted/40 p-1.5 text-[10px]">
          {form.reviewComment}
        </p>
      ) : null}

      <Button
        className="mt-auto w-full"
        size="sm"
        variant="outline"
        disabled={type.open === "crm" && !canOpenCrm}
        title={
          type.open === "crm" && !canOpenCrm
            ? "Form RAB dikelola di CRM"
            : undefined
        }
        onClick={onOpen}
      >
        Buka form
      </Button>
    </div>
  );
}

export function SimproFormsPage() {
  const store = usePrototypeStore();
  const router = useRouter();
  const currentUser = userById(store, store.currentUserId);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [openFormId, setOpenFormId] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!currentUser) return [];
    const projects = visibleProjects(store);
    const visibleIds = new Set(projects.map((project) => project.id));
    return store.forms
      .filter((form) => Boolean(simproFormType(form.type)))
      .filter((form) => visibleIds.has(form.projectId))
      .filter((form) => {
        if (currentUser.role === "assignee") {
          return form.assigneeId === currentUser.id;
        }
        return true;
      })
      .filter((form) =>
        store.steps.some(
          (step) =>
            step.projectId === form.projectId &&
            (step.financeKind === form.type || step.legacyKey === form.type),
        ),
      )
      .map((form) => {
        const project = projects.find((item) => item.id === form.projectId);
        const type = simproFormType(form.type);
        if (!project || !type) return null;
        return { form, project, type };
      })
      .filter((row): row is FormRow => Boolean(row));
  }, [store, currentUser]);

  const projectOptions = useMemo(() => {
    const map = new Map<string, Project>();
    for (const row of rows) map.set(row.project.id, row.project);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (projectFilter && row.project.id !== projectFilter) return false;
        if (typeFilter && row.type.key !== typeFilter) return false;
        if (
          statusFilter &&
          formDisplayStatus(row.form.status) !== statusFilter
        ) {
          return false;
        }
        if (
          search &&
          !`${row.project.name} ${row.project.code}`
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
      { project: Project; rows: FormRow[] }
    >();
    for (const row of filtered) {
      const group = map.get(row.project.id) ?? {
        project: row.project,
        rows: [],
      };
      group.rows.push(row);
      map.set(row.project.id, group);
    }
    return [...map.values()].sort((a, b) =>
      a.project.name.localeCompare(b.project.name),
    );
  }, [filtered]);

  if (!currentUser) return null;

  if (currentUser.role === "finance") {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Finance menggunakan CRM"
        description="Form RAB, BAST, dan Invoice berada di CRM."
      />
    );
  }

  const canOpenCrm = roleCanAccessCrm(currentUser.role);

  const toggleGroup = (id: string) => {
    setCollapsed((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const openRow = (row: FormRow) => {
    if (row.type.open === "dialog") {
      setOpenFormId(row.form.id);
      return;
    }
    const href = crmFormHref(row.project.id, row.type.key);
    if (href && canOpenCrm) router.push(href);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Forms"
        description="Form Survey dan RAB yang terkait dengan proyek Anda, dikelompokkan per proyek."
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_150px_150px]">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari proyek…"
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
          {SIMPRO_FORM_TYPES.map((type) => (
            <option key={type.key} value={type.key}>
              {type.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={statusFilter} onChange={setStatusFilter}>
          <option value="">Semua status</option>
          {FORM_DISPLAY_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {FORM_DISPLAY_STATUS_LABEL[status]}
            </option>
          ))}
        </NativeSelect>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada form"
          description="Form Survey dan RAB akan muncul setelah proyek memakai tahap form tersebut dan form di-assign."
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
                  {SIMPRO_FORM_TYPES.map((type) => {
                    const typeRows = projectRows.filter(
                      (row) => row.type.key === type.key,
                    );
                    if (typeRows.length === 0) return null;
                    return (
                      <section key={type.key} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h3 className="text-xs font-semibold">{type.label}</h3>
                            <p className="text-muted-foreground text-[10px]">
                              {type.description}
                            </p>
                          </div>
                          <span className="text-muted-foreground shrink-0 text-[10px]">
                            {typeRows.length} form
                          </span>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {typeRows.map((row) => (
                            <FormItem
                              key={row.form.id}
                              row={row}
                              canOpenCrm={canOpenCrm}
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
