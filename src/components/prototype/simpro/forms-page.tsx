"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import { formatDate, userById, visibleProjects } from "@/lib/prototype/domain";
import { FORM_STATUS_LABEL } from "@/lib/prototype/types";
import {
  EmptyState,
  FormStatusBadge,
  NativeSelect,
  PageHeader,
  SectionCard,
  UserAvatar,
} from "../ui";
import { SurveyFormDialog } from "../forms";

export function SimproFormsPage() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [openFormId, setOpenFormId] = useState<string | null>(null);

  const forms = useMemo(() => {
    if (!currentUser) return [];
    const projects = visibleProjects(store);
    return store.forms
      .filter((form) => form.type === "survey")
      .filter((form) => projects.some((project) => project.id === form.projectId))
      .filter((form) => {
        if (currentUser.role === "assignee") return form.assigneeId === currentUser.id;
        return true;
      })
      .filter((form) => {
        if (status && form.status !== status) return false;
        const project = store.projects.find((item) => item.id === form.projectId);
        if (search && !`${project?.name} ${project?.code}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
  }, [store, currentUser, search, status]);

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Forms"
        description="Form Survey yang di-assign. Form finance dikelola di CRM."
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari proyek…"
            className="pl-8"
          />
        </div>
        <NativeSelect value={status} onChange={setStatus}>
          <option value="">Semua status</option>
          {Object.entries(FORM_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {forms.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Tidak ada form"
          description="Form Survey akan muncul setelah di-assign oleh Manager/Admin."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {forms.map((form) => {
            const project = store.projects.find((item) => item.id === form.projectId);
            return (
              <SectionCard
                key={form.id}
                title={project?.name ?? "Proyek"}
                description={`${project?.code ?? ""} · Survey`}
                actions={<FormStatusBadge status={form.status} />}
              >
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Assignee</span>
                    <UserAvatar user={userById(store, form.assigneeId)} size="sm" showName />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Foto</span>
                    <span>{form.photos?.length ?? 0} foto</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span>{formatDate(form.submittedAt)}</span>
                  </div>
                  {form.reviewComment ? (
                    <p className="text-muted-foreground rounded bg-muted/40 p-2 text-[11px]">
                      {form.reviewComment}
                    </p>
                  ) : null}
                  <Button className="w-full" size="sm" variant="outline" onClick={() => setOpenFormId(form.id)}>
                    Buka form
                  </Button>
                </div>
              </SectionCard>
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
