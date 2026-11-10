"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import {
  DEFAULT_LIST_PAGE_SIZE,
  type ListPageSize,
} from "@/lib/list-pagination";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  calculateJourneyProgress,
  canCreateProject,
  userById,
  visibleProjects,
} from "@/lib/prototype/domain";
import { PHASE_LABEL, PRIORITY_LABEL } from "@/lib/prototype/types";
import {
  AvatarStack,
  EmptyState,
  NativeSelect,
  PageHeader,
  ProgressBar,
} from "../ui";
import { ProjectCard, projectTeam } from "../project-card";
import { useViewPreference, ViewToggle } from "../view-toggle";

export function CrmProjects() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const projects = visibleProjects(store);
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ListPageSize>(DEFAULT_LIST_PAGE_SIZE);
  const [view, setView] = useViewPreference("crm-projects");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (query) {
        const haystack =
          `${project.name} ${project.code} ${project.client}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (status && project.status !== status) return false;
      if (priority && project.priority !== priority) return false;
      if (templateFilter && project.templateId !== templateFilter) return false;
      if (phase) {
        const active = store.steps.filter(
          (step) => step.projectId === project.id && step.status === "active",
        );
        if (!active.some((step) => step.phase === phase)) return false;
      }
      return true;
    });
  }, [
    projects,
    search,
    status,
    priority,
    phase,
    templateFilter,
    store,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, phase, templateFilter, status, priority, pageSize]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const paged = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  if (!currentUser) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description="Semua proyek yang dapat Anda akses, lengkap dengan journey dan progress pekerjaan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            {canCreateProject(currentUser) ? (
              <Link href="/crm/projects/new">
                <Button>
                  <Plus className="size-4" /> Proyek baru
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_130px_130px_130px_130px]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari proyek…"
            className="pl-8"
          />
        </div>
        <NativeSelect value={phase} onChange={setPhase}>
          <option value="">Semua fase</option>
          {Object.entries(PHASE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={templateFilter} onChange={setTemplateFilter}>
          <option value="">Semua template</option>
          {store.templates
            .filter((template) => template.status === "active" || template.legacy)
            .map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
        </NativeSelect>
        <NativeSelect value={status} onChange={setStatus}>
          <option value="">Semua status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </NativeSelect>
        <NativeSelect value={priority} onChange={setPriority}>
          <option value="">Semua prioritas</option>
          {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={search ? "Tidak ada hasil" : "Tidak ada proyek"}
          description={
            search
              ? "Tidak ada proyek yang cocok dengan pencarian."
              : "Ubah filter atau buat proyek baru."
          }
        />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Proyek</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Group</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Fase</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Anggota</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((project) => {
                const activeStep = store.steps.find(
                  (step) =>
                    step.projectId === project.id && step.status === "active",
                );
                const journey = calculateJourneyProgress(store, project.id);
                const group = project.groupId
                  ? store.groups.find((item) => item.id === project.groupId)
                  : undefined;
                const team = projectTeam(project.id, store);
                return (
                  <tr
                    key={project.id}
                    className="hover:bg-muted/40 cursor-pointer border-b last:border-0"
                    onClick={() => {
                      window.location.href = `/crm/projects/${project.id}`;
                    }}
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium">{project.name}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {project.code}
                      </p>
                    </td>
                    <td className="px-3 py-2">{project.client || "—"}</td>
                    <td className="px-3 py-2">{group?.name ?? "—"}</td>
                    <td className="px-3 py-2 capitalize">{project.status}</td>
                    <td className="px-3 py-2">
                      {activeStep ? PHASE_LABEL[activeStep.phase] : "—"}
                    </td>
                    <td className="w-[150px] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={journey} className="flex-1" />
                        <span className="tabular-nums">{journey}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <AvatarStack users={team} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              href={`/crm/projects/${project.id}`}
              draggable={false}
            />
          ))}
        </div>
      )}

      <ListPaginationBar
        total={filtered.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        disabled={filtered.length === 0}
      />
    </div>
  );
}
