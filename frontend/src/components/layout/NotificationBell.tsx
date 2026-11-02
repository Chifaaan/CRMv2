"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";
import Link from "next/link";
import { formatRelativeTimeId } from "@/lib/format-relative-time";
import { notificationHref } from "@/lib/notification-href";
import { NotificationEntry } from "@/components/notifications/notification-entry";

type NotifRow = {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  entityType: string;
  entityId: string;
  action?: string;
  projectId: string | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  projectName?: string | null;
};

const POLL_FALLBACK_MS = 5 * 60 * 1000;

export function NotificationBell() {
  const qc = useQueryClient();

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream", {
      withCredentials: true,
    });

    const onNewNotification = () => {
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      qc.invalidateQueries({ queryKey: ["notifications-recent"] });
    };

    es.addEventListener("new_notification", onNewNotification);

    return () => {
      es.removeEventListener("new_notification", onNewNotification);
      es.close();
    };
  }, [qc]);

  const unreadQ = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => {
      const res = await api.get<{ count: number }>(
        "/api/notifications/unread-count",
      );
      return res.data.count;
    },
    refetchInterval: POLL_FALLBACK_MS,
  });

  const recentQ = useQuery({
    queryKey: ["notifications-recent"],
    queryFn: async () => {
      const res = await api.get<{ data: NotifRow[] }>("/api/notifications", {
        params: { page: 1, take: 5 },
      });
      return res.data.data;
    },
    refetchInterval: POLL_FALLBACK_MS,
  });

  const markOne = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-recent"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const count = typeof unreadQ.data === "number" ? unreadQ.data : 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Notifikasi"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          count > 0 &&
            "text-primary after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:ring-2 after:ring-primary/30",
        )}
      >
        <Bell
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            count > 0 && "motion-safe:scale-110",
          )}
        />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-md ring-2 ring-background">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-0"
      >
        <div className="border-b bg-muted/30 px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Notifikasi</p>
          {count > 0 ? (
            <p className="text-xs text-muted-foreground">
              {count} belum dibaca
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Semua sudah dibaca</p>
          )}
        </div>
        <div className="max-h-80 space-y-1.5 overflow-y-auto p-2">
          {recentQ.data?.length ? (
            recentQ.data.map((n) => {
              const href = notificationHref(n);
              const entry = (
                <NotificationEntry
                  message={n.message}
                  timeLabel={formatRelativeTimeId(n.createdAt)}
                  read={n.read}
                  entityType={n.entityType}
                  action={n.action}
                  actorName={n.actorName}
                  actorAvatar={n.actorAvatar}
                  projectName={n.projectName}
                  variant="dropdown"
                  className={cn(
                    "motion-safe:transition-transform motion-safe:duration-150",
                    "hover:z-[1] hover:brightness-[1.02] active:scale-[0.99]",
                  )}
                />
              );
              const mark = () => {
                if (!n.read) markOne.mutate(n.id);
              };
              if (href) {
                return (
                  <Link
                    key={n.id}
                    href={href}
                    className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    onClick={mark}
                  >
                    {entry}
                  </Link>
                );
              }
              return (
                <button
                  key={n.id}
                  type="button"
                  className="block w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={mark}
                >
                  {entry}
                </button>
              );
            })
          ) : (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Belum ada notifikasi
            </p>
          )}
        </div>
        <Link
          href="/notifications"
          className="block border-t bg-muted/20 px-3 py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          Lihat semua notifikasi
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
