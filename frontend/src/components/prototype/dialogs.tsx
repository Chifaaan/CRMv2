"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canAssignTask,
  canReviewTask,
  formatDate,
  formatDateTime,
  isGroupableProject,
  taskTransition,
  userById,
} from "@/lib/prototype/domain";
import { putPrototypeFile } from "@/lib/prototype/files";
import {
  PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  type Pitching,
  type Priority,
  type Project,
  type TaskStatus,
} from "@/lib/prototype/types";
import {
  Field,
  NativeSelect,
  PriorityBadge,
  TaskStatusBadge,
  UserAvatar,
} from "./ui";
import { cn } from "@/lib/utils";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const EMPTY_PROJECT_IDS: string[] = [];

const COVER_COLORS = [
  "#9f1239",
  "#1e40af",
  "#7c3aed",
  "#0f766e",
  "#b45309",
  "#0369a1",
  "#be123c",
  "#4d7c0f",
];

export function ProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}) {
  const store = usePrototypeStore();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0]);

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setClient(project?.client ?? "");
    setDescription(project?.description ?? "");
    setPriority(project?.priority ?? "medium");
    setStartDate(project?.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setTargetEndDate(project?.targetEndDate?.slice(0, 10) ?? "");
    setCoverColor(project?.coverColor ?? COVER_COLORS[0]);
  }, [open, project]);

  const save = () => {
    if (!name.trim()) {
      toast.error("Nama proyek wajib diisi.");
      return;
    }
    const input = {
      name: name.trim(),
      client: client.trim(),
      description: description.trim(),
      priority,
      startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : "",
      targetEndDate: targetEndDate
        ? new Date(`${targetEndDate}T00:00:00`).toISOString()
        : "",
      coverColor,
    };
    if (project) {
      store.updateProject(project.id, input);
      toast.success("Proyek diperbarui.");
    } else {
      store.createProject(input);
      toast.success("Proyek dibuat. Journey dimulai dari Pitching.");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Proyek" : "Proyek Baru"}</DialogTitle>
          <DialogDescription>
            {project
              ? "Perbarui informasi dasar proyek."
              : "Journey 6 step akan dibuat otomatis dan dimulai dari Pitching."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama proyek" className="sm:col-span-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Connector Member System" />
          </Field>
          <Field label="Klien">
            <Input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Nama klien" />
          </Field>
          <Field label="Prioritas">
            <NativeSelect value={priority} onChange={(value) => setPriority(value as Priority)}>
              {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Tanggal mulai">
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field label="Target selesai">
            <Input type="date" value={targetEndDate} onChange={(event) => setTargetEndDate(event.target.value)} />
          </Field>
          <Field label="Deskripsi" className="sm:col-span-2">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Ringkasan proyek" />
          </Field>
          <Field label="Warna cover" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {COVER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCoverColor(color)}
                  className={cn(
                    "size-8 rounded-full ring-2 ring-offset-2",
                    coverColor === color ? "ring-foreground" : "ring-transparent",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Pilih warna ${color}`}
                />
              ))}
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={save}>{project ? "Simpan" : "Buat proyek"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PitchingDialog({
  open,
  onOpenChange,
  projectId,
  pitching,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  pitching?: Pitching;
}) {
  const store = usePrototypeStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [roles, setRoles] = useState<{ label: string; requestedUserId: string }[]>([]);

  const assignees = useMemo(
    () => store.users.filter((user) => user.role === "assignee"),
    [store.users],
  );

  useEffect(() => {
    if (!open) return;
    setTitle(pitching?.title ?? "");
    setDescription(pitching?.description ?? "");
    const currentRoles = pitching
      ? store.pitchingRoles
          .filter((role) => role.pitchingId === pitching.id)
          .map((role) => ({
            label: role.label,
            requestedUserId: role.requestedUserId ?? "",
          }))
      : [];
    setRoles(currentRoles.length > 0 ? currentRoles : [{ label: "Pembuat PPT", requestedUserId: "" }]);
  }, [open, pitching, store.pitchingRoles]);

  const save = () => {
    if (!title.trim()) {
      toast.error("Judul pitching wajib diisi.");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      roles: roles
        .filter((role) => role.label.trim())
        .map((role) => ({
          label: role.label.trim(),
          requestedUserId: role.requestedUserId || undefined,
        })),
    };
    if (pitching) store.updatePitching(pitching.id, payload);
    else store.addPitching(projectId, payload);
    toast.success(pitching ? "Pitching diperbarui." : "Pitching dibuat dan task masuk Backlog.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{pitching ? "Edit Pitching" : "Pitching Baru"}</DialogTitle>
          <DialogDescription>
            Setiap role dengan assignee akan membuat task di SIMPRO dengan status Backlog.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Judul pitching">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Konsep Portal Member" />
          </Field>
          <Field label="Deskripsi">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
          </Field>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Role dan requested assignee</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRoles((current) => [...current, { label: "", requestedUserId: "" }])}
              >
                <Plus className="size-3.5" /> Role
              </Button>
            </div>
            {roles.map((role, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={role.label}
                  onChange={(event) =>
                    setRoles((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Label role"
                  className="flex-1"
                />
                <NativeSelect
                  value={role.requestedUserId}
                  onChange={(value) =>
                    setRoles((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, requestedUserId: value }
                          : item,
                      ),
                    )
                  }
                  className="w-[180px]"
                >
                  <option value="">Tanpa assignee</option>
                  {assignees.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </NativeSelect>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Hapus role"
                  onClick={() => setRoles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={save}>{pitching ? "Simpan" : "Buat pitching"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GroupDialog({
  open,
  onOpenChange,
  group,
  initialProjectIds = EMPTY_PROJECT_IDS,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: { id: string; name: string; description: string };
  initialProjectIds?: string[];
}) {
  const store = usePrototypeStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const availableProjects = store.projects.filter(isGroupableProject);
  const toggleProject = (projectId: string) => {
    setSelectedProjects((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    );
  };

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? "");
    setDescription(group?.description ?? "");
    setSaving(false);
    if (group) {
      setSelectedProjects([]);
      return;
    }
    const availableIds = new Set(
      store.projects.filter(isGroupableProject).map((project) => project.id),
    );
    setSelectedProjects(
      initialProjectIds.filter((projectId) => availableIds.has(projectId)),
    );
  }, [open, group, initialProjectIds, store.projects]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Nama group wajib diisi.");
      return;
    }
    if (!group && selectedProjects.length < 2) {
      toast.error("Group minimal berisi 2 proyek.");
      return;
    }
    setSaving(true);
    try {
      // Simulasi jeda penyimpanan agar state loading terlihat di prototype.
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (group) {
        store.updateGroup(group.id, {
          name: name.trim(),
          description: description.trim(),
        });
      } else {
        const groupId = store.createGroup({
          name: name.trim(),
          description: description.trim(),
        });
        for (const projectId of selectedProjects) {
          store.addProjectToGroup(groupId, projectId);
        }
      }
      toast.success(group ? "Group diperbarui." : "Group dibuat.");
      onOpenChange(false);
    } catch {
      toast.error("Gagal menyimpan group. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!saving}>
        <DialogHeader>
          <DialogTitle>{group ? "Edit Group" : "Group Baru"}</DialogTitle>
          <DialogDescription>
            Group adalah container untuk memantau beberapa proyek. Minimal 2 proyek.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Nama group">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Deskripsi">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </Field>
          {!group ? (
            <Field label="Pilih minimal 2 proyek">
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                {availableProjects.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Semua proyek sudah berada di group.
                  </p>
                ) : (
                  availableProjects.map((project) => (
                    <div
                      key={project.id}
                      className="hover:bg-muted/50 flex items-center gap-2 rounded px-1 py-1 text-xs"
                    >
                      <Checkbox
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={() => toggleProject(project.id)}
                      />
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => toggleProject(project.id)}
                      >
                        <span className="text-muted-foreground">{project.code}</span>
                        <span className="truncate">{project.name}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Field>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button disabled={saving} onClick={save}>
            {saving ? "Menyimpan…" : group ? "Simpan" : "Buat group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaskDialog({
  open,
  onOpenChange,
  projectId,
  taskId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  taskId?: string;
}) {
  const store = usePrototypeStore();
  const task = taskId ? store.tasks.find((item) => item.id === taskId) : undefined;
  const project = store.projects.find((item) => item.id === projectId);
  const currentUser = userById(store, store.currentUserId);
  const assignees = store.users.filter((user) => user.role === "assignee");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [comment, setComment] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [checklistText, setChecklistText] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setPriority(task?.priority ?? "medium");
    setDueDate(task?.dueDate?.slice(0, 10) ?? "");
    setAssignTo(task?.assigneeId ?? "");
    setComment("");
    setReviewComment("");
    setChecklistText("");
  }, [open, task]);

  if (!project) return null;

  const isCreate = !task;
  const canAssign = currentUser ? canAssignTask(currentUser) : false;
  const canReassign =
    canAssign &&
    task !== undefined &&
    task.status !== "awaiting_approval" &&
    task.status !== "completed";
  const canReview = task && currentUser ? canReviewTask(store, currentUser, task) : false;
  const canWork =
    task && currentUser?.role === "assignee" && task.assigneeId === currentUser.id;
  const canDelete =
    task && currentUser && (currentUser.role === "admin" || (currentUser.role === "pm" && project.createdById === currentUser.id));

  const saveNew = () => {
    if (!title.trim()) {
      toast.error("Judul task wajib diisi.");
      return;
    }
    store.createTask(projectId, {
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : undefined,
    });
    toast.success("Task dibuat di Backlog.");
    onOpenChange(false);
  };

  const move = (to: TaskStatus) => {
    if (!task || !currentUser) return;
    const result = taskTransition(store, currentUser, task, to);
    if (!result.ok) {
      toast.error(result.reason ?? "Transisi tidak diizinkan.");
      return;
    }
    if (to === "need_revision" && !reviewComment.trim()) {
      toast.error("Komentar revisi wajib diisi.");
      return;
    }
    if (to === "need_revision") {
      store.addComment(task.id, `Revisi: ${reviewComment.trim()}`);
    }
    store.transitionTask(task.id, to);
    toast.success(`Task dipindahkan ke ${TASK_STATUS_LABEL[to]}.`);
  };

  const activity = store.activityLogs
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Task Baru" : task?.title}</DialogTitle>
          <DialogDescription>
            {project.name} {task ? `· ${task.code}` : "· task baru masuk Backlog"}
          </DialogDescription>
        </DialogHeader>

        {isCreate ? (
          <div className="space-y-3">
            <Field label="Judul task">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Deskripsi">
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Prioritas">
                <NativeSelect value={priority} onChange={(value) => setPriority(value as Priority)}>
                  {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Due date">
                <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </Field>
            </div>
            <p className="text-muted-foreground text-xs">
              Task akan masuk Backlog tanpa assignee. Manager/Admin meng-assign ke assignee.
            </p>
          </div>
        ) : task ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <TaskStatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.dueDate ? (
                <span className="text-muted-foreground text-xs">Due {formatDate(task.dueDate)}</span>
              ) : null}
              <Link
                href={`/projects/${project.id}/board`}
                className="text-primary ml-auto inline-flex items-center gap-1 text-xs"
              >
                Buka board <ExternalLink className="size-3" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Assignee">
                <div className="flex items-center gap-2">
                  <UserAvatar user={userById(store, task.assigneeId)} showName />
                  {canReassign ? (
                    <>
                      <NativeSelect
                        value={assignTo}
                        onChange={(value) => setAssignTo(value)}
                        className="flex-1"
                      >
                        <option value="">Pilih assignee</option>
                        {assignees.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!assignTo}
                        onClick={() => {
                          if (!assignTo) return;
                          store.assignTask(task.id, assignTo);
                          toast.success("Task di-assign dan masuk To Do.");
                        }}
                      >
                        Assign
                      </Button>
                    </>
                  ) : null}
                </div>
              </Field>
              <Field label="Prioritas">
                <PriorityBadge priority={task.priority} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-2">
              {canWork && (task.status === "todo" || task.status === "need_revision") ? (
                <Button size="sm" onClick={() => move("in_progress")}>
                  Mulai kerja
                </Button>
              ) : null}
              {canWork && task.status === "in_progress" ? (
                <Button size="sm" onClick={() => move("awaiting_approval")}>
                  <Send className="size-3.5" /> Ajukan review
                </Button>
              ) : null}
              {canReview && task.status === "awaiting_approval" ? (
                <>
                  <Button size="sm" onClick={() => move("completed")}>
                    <Check className="size-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => move("need_revision")}
                  >
                    Minta revisi
                  </Button>
                </>
              ) : null}
              {canDelete ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    const reason = window.prompt("Alasan menghapus task?");
                    if (!reason?.trim()) return;
                    store.deleteTask(task.id, reason.trim());
                    toast.success("Task dihapus.");
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="size-3.5" /> Hapus
                </Button>
              ) : null}
            </div>

            {canReview && task.status === "awaiting_approval" ? (
              <Field label="Komentar review (wajib jika minta revisi)">
                <Textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  rows={2}
                  placeholder="Tulis catatan review…"
                />
              </Field>
            ) : null}

            <div>
              <h4 className="mb-1 text-sm font-semibold">Deskripsi</h4>
              <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                {task.description || "Belum ada deskripsi."}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Checklist</h4>
                <span className="text-muted-foreground text-xs">
                  {task.checklist.filter((item) => item.done).length}/{task.checklist.length}
                </span>
              </div>
              <div className="space-y-1">
                {task.checklist.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={() => store.toggleChecklistItem(task.id, item.id)}
                    />
                    <span className={cn(item.done && "text-muted-foreground line-through")}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={checklistText}
                  onChange={(event) => setChecklistText(event.target.value)}
                  placeholder="Tambah checklist…"
                  className="h-8"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!checklistText.trim()) return;
                    store.addChecklistItem(task.id, checklistText.trim());
                    setChecklistText("");
                  }}
                >
                  <Plus className="size-3.5" /> Tambah
                </Button>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Lampiran</h4>
              <div className="space-y-1">
                {task.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 text-xs">
                    <Paperclip className="size-3.5" />
                    <span className="truncate">{attachment.fileName}</span>
                    <span className="text-muted-foreground">
                      {Math.round(attachment.size / 1024)} KB
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Hapus lampiran"
                      onClick={() => store.removeAttachment(task.id, attachment.id)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <label className="text-primary mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium">
                <Upload className="size-3.5" /> Upload lampiran
                <input
                  type="file"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (task.attachments.length >= 5) {
                      toast.error("Maksimal 5 lampiran per task.");
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Maksimal 5 MB per file.");
                      return;
                    }
                    const storageKey = uid("file");
                    await putPrototypeFile(storageKey, file);
                    store.addAttachment(task.id, {
                      id: uid("att"),
                      fileName: file.name,
                      mimeType: file.type,
                      size: file.size,
                      storageKey,
                    });
                    toast.success("Lampiran ditambahkan.");
                  }}
                />
              </label>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Komentar</h4>
              <div className="space-y-2">
                {task.comments.map((entry) => (
                  <div key={entry.id} className="bg-muted/40 rounded-lg px-3 py-2 text-xs">
                    <div className="mb-1 font-medium">
                      {userById(store, entry.authorId)?.name ?? "User"} ·{" "}
                      <span className="text-muted-foreground font-normal">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{entry.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={2}
                  placeholder="Tulis komentar…"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!comment.trim()) return;
                    store.addComment(task.id, comment.trim());
                    setComment("");
                  }}
                >
                  Kirim
                </Button>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Activity</h4>
              <div className="space-y-1">
                {activity.length === 0 ? (
                  <p className="text-muted-foreground text-xs">Belum ada aktivitas.</p>
                ) : (
                  activity.map((entry) => (
                    <div key={entry.id} className="text-muted-foreground flex gap-2 text-xs">
                      <span className="bg-primary mt-1 size-1.5 shrink-0 rounded-full" />
                      <span>
                        {entry.message}{" "}
                        <span className="opacity-70">· {formatDateTime(entry.createdAt)}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          {isCreate ? <Button onClick={saveNew}>Buat task</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
