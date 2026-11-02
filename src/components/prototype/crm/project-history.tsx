"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  History,
  Image as ImageIcon,
  Info,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrototypeStore } from "@/lib/prototype/store";
import { readProjectEvents } from "@/lib/prototype/events";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formFor,
  userById,
} from "@/lib/prototype/domain";
import { STEP_META, type ProjectEvent, type StepKey } from "@/lib/prototype/types";
import { EmptyState } from "../ui";

function stepLabel(step: StepKey | null): string {
  if (!step) return "Proyek";
  return STEP_META.find((meta) => meta.key === step)?.label ?? step;
}

function formatValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number" && /(amount|total|price|tax)/i.test(key)) {
    return formatCurrency(value);
  }
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function EventDiff({ metadata }: { metadata: Record<string, unknown> }) {
  const before =
    metadata.before && typeof metadata.before === "object"
      ? (metadata.before as Record<string, unknown>)
      : undefined;
  const after =
    metadata.after && typeof metadata.after === "object"
      ? (metadata.after as Record<string, unknown>)
      : undefined;
  if (!before && !after) return null;
  const keys = [
    ...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ];
  if (keys.length === 0) return null;

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {[
        { label: "Sebelum", value: before },
        { label: "Sesudah", value: after },
      ].map((side) => (
        <div
          key={side.label}
          className="bg-muted/30 rounded-lg border border-border/70 p-2"
        >
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase tracking-wide">
            {side.label}
          </p>
          <div className="space-y-0.5">
            {keys.map((key) => (
              <div key={key} className="flex items-start justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground shrink-0">{key}</span>
                <span className="min-w-0 truncate text-right font-medium">
                  {side.value ? formatValue(key, side.value[key]) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-4/5" />
    </div>
  );
}

export function ProjectStepHistory({
  projectId,
  stepKey,
}: {
  projectId: string;
  stepKey: StepKey;
}) {
  const store = usePrototypeStore();
  const [ready, setReady] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setReady(false);
    const timer = window.setTimeout(() => setReady(true), 140);
    return () => window.clearTimeout(timer);
  }, [projectId, stepKey]);

  useEffect(() => {
    setVisibleCount(10);
  }, [projectId, stepKey]);

  const result = useMemo(() => {
    void retryKey;
    try {
      return readProjectEvents(store, {
        projectId,
        viewerId: store.currentUserId,
        step: stepKey,
        includeProjectLevel: true,
        limit: visibleCount,
      });
    } catch {
      return null;
    }
  }, [store, projectId, stepKey, visibleCount, retryKey]);

  const form = formFor(
    store,
    projectId,
    stepKey === "survey" ||
      stepKey === "rab" ||
      stepKey === "bast" ||
      stepKey === "invoice"
      ? stepKey
      : "survey",
  );
  const payload = form?.payload as
    | { documentUrl?: string }
    | undefined;
  const photos = stepKey === "survey" ? form?.photos ?? [] : [];
  const documentUrl =
    (stepKey === "bast" || stepKey === "invoice") && payload?.documentUrl
      ? payload.documentUrl
      : undefined;

  if (!ready) return <TimelineSkeleton />;

  if (!result) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-center">
        <p className="text-sm font-medium">Riwayat gagal dimuat.</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Coba muat ulang riwayat proyek.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            setReady(false);
            setRetryKey((value) => value + 1);
            setReady(true);
          }}
        >
          <RefreshCw className="size-3.5" /> Coba lagi
        </Button>
      </div>
    );
  }

  const groups = new Map<string, ProjectEvent[]>();
  for (const event of result.events) {
    const key = event.occurredAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  const hasBackfill = result.events.some(
    (event) => event.eventType === "project.backfill",
  );

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="text-primary size-4" />
          <h4 className="text-sm font-semibold">Riwayat aktivitas</h4>
        </div>
        <span className="text-muted-foreground text-[10px]">
          {result.total} event
        </span>
      </div>

      {photos.length > 0 ? (
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <ImageIcon className="size-3.5" /> Dokumen & foto
          </div>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo) => (
              <span
                key={photo.id}
                className="bg-background inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[10px]"
                title={photo.fileName}
              >
                <ImageIcon className="size-3 shrink-0" />
                <span className="truncate">{photo.fileName}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {documentUrl ? (
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <FileText className="size-3.5" /> Dokumen terkait
          </div>
          <Link
            href={documentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
          >
            Buka dokumen <ExternalLink className="size-3" />
          </Link>
        </div>
      ) : null}

      {hasBackfill ? (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Riwayat sebelum audit trail diaktifkan mungkin tidak lengkap.
        </div>
      ) : null}

      {result.events.length === 0 ? (
        <EmptyState
          icon={History}
          title="Belum ada aktivitas"
          description="Belum ada event audit trail untuk step ini."
        />
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([date, events]) => (
            <section key={date}>
              <h5 className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]">
                {formatDate(date)}
              </h5>
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="relative pl-4">
                    <span className="bg-primary/70 absolute top-1.5 left-0 size-2 rounded-full" />
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-medium">
                        {userById(store, event.actorId)?.name ?? "User"}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {formatDateTime(event.occurredAt)}
                      </span>
                      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[9px] font-medium">
                        {stepLabel(event.step)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs">{event.summary}</p>
                    <EventDiff metadata={event.metadata} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {result.nextCursor ? (
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => {
              setLoadingMore(true);
              window.setTimeout(() => {
                setVisibleCount((value) => value + 10);
                setLoadingMore(false);
              }, 140);
            }}
          >
            {loadingMore ? "Memuat…" : "Muat lebih banyak"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
