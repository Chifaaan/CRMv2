"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { initials, formatCurrency } from "@/lib/prototype/domain";
import {
  FORM_STATUS_LABEL,
  PHASE_LABEL,
  PRIORITY_LABEL,
  ROLE_LABEL,
  TASK_STATUS_LABEL,
  type FormStatus,
  type Phase,
  type Priority,
  type Role,
  type TaskStatus,
  type User,
} from "@/lib/prototype/types";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "from-violet-500 to-indigo-600",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  accent?: string;
}) {
  return (
    <Card className="relative overflow-hidden py-4">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.08em]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {sub ? (
            <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">{sub}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
              accent,
            )}
          >
            <Icon className="size-5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ProgressBar({
  value,
  className,
  tone = "bg-primary",
}: {
  value: number;
  className?: string;
  tone?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("bg-muted h-2 w-full overflow-hidden rounded-full", className)}>
      <div
        className={cn("h-full rounded-full transition-all", tone)}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

const statusClasses: Record<TaskStatus, string> = {
  backlog: "bg-slate-100 text-slate-700 ring-slate-200",
  todo: "bg-sky-100 text-sky-700 ring-sky-200",
  in_progress: "bg-violet-100 text-violet-700 ring-violet-200",
  awaiting_approval: "bg-amber-100 text-amber-800 ring-amber-200",
  need_revision: "bg-rose-100 text-rose-700 ring-rose-200",
  completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
        statusClasses[status],
      )}
    >
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}

const priorityClasses: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-600 ring-slate-200",
  medium: "bg-sky-100 text-sky-700 ring-sky-200",
  high: "bg-amber-100 text-amber-800 ring-amber-200",
  critical: "bg-red-100 text-red-700 ring-red-200",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1",
        priorityClasses[priority],
      )}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

const phaseClasses: Record<Phase, string> = {
  planning: "bg-violet-100 text-violet-700 ring-violet-200",
  running: "bg-sky-100 text-sky-700 ring-sky-200",
  finance: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

export function PhaseBadge({ phase }: { phase: Phase }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1",
        phaseClasses[phase],
      )}
    >
      {PHASE_LABEL[phase]}
    </span>
  );
}

const formStatusClasses: Record<FormStatus, string> = {
  unassigned: "bg-slate-100 text-slate-600 ring-slate-200",
  assigned: "bg-sky-100 text-sky-700 ring-sky-200",
  draft: "bg-amber-100 text-amber-800 ring-amber-200",
  submitted: "bg-violet-100 text-violet-700 ring-violet-200",
  approved: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  need_revision: "bg-rose-100 text-rose-700 ring-rose-200",
};

export function FormStatusBadge({ status }: { status: FormStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
        formStatusClasses[status],
      )}
    >
      {FORM_STATUS_LABEL[status]}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant="outline" className="text-[11px]">
      {ROLE_LABEL[role]}
    </Badge>
  );
}

export function UserAvatar({
  user,
  size = "default",
  showName = false,
}: {
  user?: User;
  size?: "sm" | "default";
  showName?: boolean;
}) {
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-500",
            size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs",
          )}
        >
          ?
        </div>
        {showName ? <span className="text-muted-foreground text-xs">Unassigned</span> : null}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold text-white shadow-sm",
          user.color,
          size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs",
        )}
        title={user.name}
      >
        {initials(user.name)}
      </div>
      {showName ? (
        <span className="max-w-[10rem] truncate text-xs font-medium">{user.name}</span>
      ) : null}
    </div>
  );
}

export function AvatarStack({ users, max = 3 }: { users: User[]; max?: number }) {
  const shown = users.slice(0, max);
  return (
    <div className="flex -space-x-2">
      {shown.map((user) => (
        <div key={user.id} className="ring-background rounded-full ring-2">
          <UserAvatar user={user} size="sm" />
        </div>
      ))}
      {users.length > max ? (
        <div className="ring-background flex size-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2">
          +{users.length - max}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
      {Icon ? (
        <div className="bg-muted text-muted-foreground mb-3 flex size-11 items-center justify-center rounded-full">
          <Icon className="size-5" />
        </div>
      ) : null}
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground mt-1 max-w-md text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="text-muted-foreground text-[11px]">{hint}</span> : null}
    </label>
  );
}

export function NativeSelect({
  value,
  onChange,
  children,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={cn(
        "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Money({ value }: { value: number }) {
  return <span className="tabular-nums">{formatCurrency(value)}</span>;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("py-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-4">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <CardContent className="pt-3">{children}</CardContent>
    </Card>
  );
}

export function DataRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-right text-xs font-medium">{value}</span>
    </div>
  );
}
