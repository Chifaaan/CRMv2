"use client";

import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  FolderKanban,
  LayoutList,
  Loader2,
  MessageSquare,
  Timer,
  Trash2,
  UserPlus,
  Wallet,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialsFromName } from "@/lib/meetings-constants";
import { cn } from "@/lib/utils";

const ACTION_ICONS: Record<string, LucideIcon> = {
  due_tomorrow: CalendarClock,
  due_today: CalendarDays,
  overdue: AlertTriangle,
};

const ENTITY_ICONS: Record<string, LucideIcon> = {
  task: LayoutList,
  sprint: Timer,
  meeting: CalendarDays,
  maintenance: Wrench,
  discussion: MessageSquare,
  member: UserPlus,
  client: Building2,
  project: FolderKanban,
  asset: FolderKanban,
  budget: Wallet,
};

export function notificationEntityIcon(
  entityType: string,
  action?: string | null,
): LucideIcon {
  if (action && ACTION_ICONS[action]) return ACTION_ICONS[action];
  return ENTITY_ICONS[entityType] ?? Bell;
}

type Variant = "dropdown" | "page";

type Props = {
  message: string;
  timeLabel: string;
  read: boolean;
  entityType: string;
  action?: string | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  projectName?: string | null;
  variant: Variant;
  className?: string;
  href?: string | null;
  onActivate?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
};

export function NotificationEntry({
  message,
  timeLabel,
  read,
  entityType,
  action,
  actorName,
  actorAvatar,
  projectName,
  variant,
  className,
  href,
  onActivate,
  onDelete,
  isDeleting,
}: Props) {
  const Icon = notificationEntityIcon(entityType, action);
  const compact = variant === "dropdown";
  const showActorAvatar = Boolean(actorName?.trim());
  const showProjectName = Boolean(projectName?.trim());

  const content = (
    <>
      {!read ? (
        <>
          <span
            className={cn(
              "absolute top-1/2 w-1 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.45)]",
              "motion-safe:animate-pulse",
              compact ? "left-1.5 h-8" : "left-2 h-10 sm:h-12",
            )}
            aria-hidden
          />
          <span className="sr-only">Belum dibaca</span>
        </>
      ) : null}

      {showActorAvatar ? (
        <Avatar
          className={cn(
            "shrink-0",
            compact ? "h-8 w-8" : "h-10 w-10",
            !read && "ring-2 ring-primary/20",
          )}
        >
          {actorAvatar ? (
            <AvatarImage src={actorAvatar} alt="" />
          ) : null}
          <AvatarFallback
            className={cn(
              compact ? "text-[10px]" : "text-xs",
              read
                ? "bg-muted text-muted-foreground"
                : "bg-primary/15 text-primary dark:bg-primary/20",
            )}
          >
            {initialsFromName(actorName!)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full",
            compact ? "h-8 w-8" : "h-10 w-10",
            read
              ? "bg-muted text-muted-foreground"
              : "bg-primary/15 text-primary dark:bg-primary/20",
          )}
        >
          <Icon className={cn(compact ? "h-4 w-4" : "h-[18px] w-[18px]")} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 leading-snug",
              compact ? "line-clamp-2 text-[13px]" : "line-clamp-3 text-sm",
              !read && "font-semibold tracking-tight text-foreground",
            )}
          >
            {message}
          </p>
          {!read && !compact ? (
            <span className="inline-flex shrink-0 items-center rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
              Baru
            </span>
          ) : null}
        </div>
        {showProjectName ? (
          <p
            className={cn(
              "mt-0.5 truncate text-muted-foreground/90",
              compact ? "text-[11px]" : "text-xs",
            )}
          >
            {projectName}
          </p>
        ) : null}
        <p
          className={cn(
            "flex items-center gap-1.5 text-muted-foreground",
            showProjectName ? "mt-0.5" : "mt-1",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          {!read && compact ? (
            <span
              className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
              aria-hidden
            />
          ) : null}
          {timeLabel}
        </p>
      </div>
    </>
  );

  const contentWrapClass = cn(
    "flex min-w-0 flex-1 gap-3",
    !compact &&
      "rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  );

  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-xl border transition-all duration-200 ease-out",
        "motion-safe:transition-[box-shadow,transform,background-color,border-color]",
        read
          ? "border-border/70 bg-muted/25 text-muted-foreground hover:bg-muted/40"
          : cn(
              "border-primary/30 bg-primary/[0.07] text-foreground shadow-sm",
              "ring-1 ring-primary/15 hover:border-primary/40 hover:bg-primary/[0.09]",
              "hover:shadow-md dark:bg-primary/[0.12] dark:ring-primary/25",
            ),
        compact ? "p-2.5 pl-3" : "p-4 pl-4",
        !read && "pl-3.5 sm:pl-4",
        className,
      )}
    >
      {href ? (
        <Link href={href} className={contentWrapClass} onClick={onActivate}>
          {content}
        </Link>
      ) : onActivate ? (
        <button
          type="button"
          className={cn(contentWrapClass, "text-left")}
          onClick={onActivate}
        >
          {content}
        </button>
      ) : (
        <div className={contentWrapClass}>{content}</div>
      )}

      {variant === "page" && onDelete ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-auto min-h-[2.75rem] w-11 shrink-0 self-stretch border-dashed text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
          title="Hapus notifikasi"
          aria-label="Hapus notifikasi"
          disabled={isDeleting}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      ) : null}
    </div>
  );
}
