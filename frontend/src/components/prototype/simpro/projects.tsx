"use client";

import { useMemo, useState } from "react";
import { FolderKanban, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import { canCreateProject, userById, visibleProjects } from "@/lib/prototype/domain";
import { PHASE_LABEL, PRIORITY_LABEL } from "@/lib/prototype/types";
import { EmptyState, NativeSelect, PageHeader } from "../ui";
import { ProjectCard } from "../project-card";
import { ProjectDialog } from "../dialogs";

export function SimproProjects() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const projects = visibleProjects(store);
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (query) {
        const haystack = `${project.name} ${project.code} ${project.client}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (status && project.status !== status) return false;
      if (priority && project.priority !== priority) return false;
      if (phase) {
        const active = store.steps.filter(
          (step) => step.projectId === project.id && step.status === "active",
        );
        if (!active.some((step) => step.phase === phase)) return false;
      }
      return true;
    });
  }, [projects, search, status, priority, phase, store.steps]);

  if (!currentUser) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description="Kelola proyek dan pantau progress pekerjaan di SIMPRO."
        actions={
          canCreateProject(currentUser) ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" /> New Project
            </Button>
          ) : null
        }
      />

      <div className="grid gap-2 md:grid-cols-[1fr_160px_160px_160px]">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, code, or client…"
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
          title="Tidak ada proyek"
          description="Ubah filter atau buat proyek baru."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              href={`/projects/${project.id}`}
              includeFinance={false}
            />
          ))}
        </div>
      )}

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
