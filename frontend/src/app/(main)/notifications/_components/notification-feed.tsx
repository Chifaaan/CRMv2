"use client";

import {
  useMutation,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRelativeTimeId } from "@/lib/format-relative-time";
import { notificationHref } from "@/lib/notification-href";
import { NotificationEntry } from "@/components/notifications/notification-entry";
import { Check, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deleteNotification,
  deleteReadNotifications,
  getNotificationUnreadCount,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationSearchParams,
} from "../action";

const LIMITS = 20;

export const NotificationFeed = ({
  filters,
}: {
  filters: NotificationSearchParams;
}) => {
  const qc = useQueryClient();
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [confirmDeleteReadOpen, setConfirmDeleteReadOpen] = useState(false);

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.projectId ||
      filters.types,
  );

  const unreadCountQ = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => {
      const res = await getNotificationUnreadCount();
      return res.count;
    },
  });

  const inf = useInfiniteQuery({
    queryKey: ["notifications", tab, filters],
    queryFn: ({ pageParam }) =>
      getNotifications({
        page: pageParam,
        limits: LIMITS,
        unreadOnly: tab === "unread",
        ...filters,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const { page, limits, total } = last.meta;
      if (page * limits >= total) return undefined;
      return page + 1;
    },
  });

  const items = inf.data?.pages.flatMap((p) => p.data) ?? [];
  const unreadTotal =
    typeof unreadCountQ.data === "number" ? unreadCountQ.data : 0;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !inf.hasNextPage || inf.isFetchingNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) inf.fetchNextPage();
      },
      { rootMargin: "120px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inf, tab]);

  const invalidateNotifications = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    qc.invalidateQueries({ queryKey: ["notifications-recent"] });
  };

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      invalidateNotifications();
      inf.refetch();
    },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      invalidateNotifications();
      inf.refetch();
    },
  });

  const deleteOne = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      invalidateNotifications();
      inf.refetch();
    },
  });

  const deleteAllRead = useMutation({
    mutationFn: () => deleteReadNotifications(),
    onSuccess: () => {
      invalidateNotifications();
      inf.refetch();
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifikasi</h1>
          {unreadTotal > 0 ? (
            <p className="text-sm text-muted-foreground">
              Anda punya{" "}
              <span className="font-semibold text-primary">{unreadTotal}</span>{" "}
              belum dibaca
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Semua pemberitahuan sudah dibaca
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || unreadTotal === 0}
          >
            {markAll.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Check className="h-4 w-4" aria-hidden />
            )}
            Tandai semua dibaca
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={() => setConfirmDeleteReadOpen(true)}
            disabled={deleteAllRead.isPending || tab === "unread"}
          >
            {deleteAllRead.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
            Hapus yang sudah dibaca
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
        <TabsList className="h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="all" className="px-3 py-1.5">
            Semua
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2 px-3 py-1.5">
            Belum dibaca
            {unreadTotal > 0 ? (
              <span
                className={cn(
                  "inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground",
                  tab === "unread" && "ring-2 ring-primary-foreground/30",
                )}
              >
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              {hasActiveFilters
                ? "Tidak ada notifikasi yang cocok"
                : tab === "unread"
                  ? "Tidak ada notifikasi belum dibaca"
                  : "Belum ada notifikasi"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasActiveFilters
                ? "Coba ubah kata kunci atau filter yang dipakai"
                : "Pemberitahuan baru akan muncul di sini"}
            </p>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push("/notifications")}
              >
                Bersihkan filter
              </Button>
            ) : null}
          </div>
        ) : (
          items.map((n) => {
            const href = notificationHref(n);
            const markIfNeeded = () => {
              if (!n.read) markOne.mutate(n.id);
            };

            const markingThis = markOne.isPending && markOne.variables === n.id;
            const deletingThis =
              deleteOne.isPending && deleteOne.variables === n.id;

            const markButton = !n.read ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-auto min-h-[2.75rem] w-11 shrink-0 self-stretch border-dashed text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                title="Tandai dibaca"
                aria-label="Tandai dibaca"
                disabled={markOne.isPending}
                onClick={() => markOne.mutate(n.id)}
              >
                {markingThis ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            ) : null;

            return (
              <div
                key={n.id}
                className="flex gap-2 motion-safe:transition-transform motion-safe:duration-150 active:scale-[0.995]"
              >
                <NotificationEntry
                  message={n.message}
                  timeLabel={formatRelativeTimeId(n.createdAt)}
                  read={n.read}
                  entityType={n.entityType}
                  action={n.action}
                  actorName={n.actorName}
                  actorAvatar={n.actorAvatar}
                  projectName={n.projectName}
                  variant="page"
                  href={href}
                  onActivate={markIfNeeded}
                  onDelete={() => deleteOne.mutate(n.id)}
                  isDeleting={deletingThis}
                  className={cn(
                    "min-h-[4.25rem] flex-1",
                    tab === "all" && n.read && "opacity-80",
                    "motion-safe:transition-[transform,box-shadow]",
                    "hover:shadow-md",
                  )}
                />
                {markButton}
              </div>
            );
          })
        )}
        <div ref={sentinelRef} className="h-4" />
        {inf.isFetchingNextPage ? (
          <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Memuat…
          </p>
        ) : null}
      </div>

      {inf.isError ? (
        <p className="text-center text-sm text-destructive">
          Gagal memuat notifikasi.
        </p>
      ) : null}

      <AlertDialog
        open={confirmDeleteReadOpen}
        onOpenChange={setConfirmDeleteReadOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus notifikasi yang sudah dibaca?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Semua notifikasi yang sudah ditandai dibaca akan dihapus permanen.
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-600/90"
              onClick={() => {
                deleteAllRead.mutate(undefined, {
                  onSettled: () => setConfirmDeleteReadOpen(false),
                });
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
