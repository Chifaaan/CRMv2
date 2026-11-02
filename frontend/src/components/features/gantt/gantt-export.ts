import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  max as dfMax,
  min as dfMin,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ViewMode } from "gantt-task-react";

export type GanttApiTask = {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
};

/**
 * Calendar range used for Gantt bars, export, and bucket checks.
 * Raw `startDate` / `dueDate` / `createdAt` often include time-of-day; the chart
 * maps that proportionally inside each column, so tasks look "floating" in Day
 * view. Snapping to local start/end of day keeps bars aligned with date columns.
 */
export function ganttBarRange(t: GanttApiTask): { start: Date; end: Date } {
  const rawStart = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
  let rawEnd = t.dueDate ? new Date(t.dueDate) : new Date(rawStart);
  if (rawEnd.getTime() <= rawStart.getTime()) {
    rawEnd = new Date(rawStart);
    rawEnd.setDate(rawEnd.getDate() + 1);
  }
  return {
    start: startOfDay(rawStart),
    end: endOfDay(rawEnd),
  };
}

export function formatBoundaryForScale(d: Date, mode: ViewMode): string {
  if (mode === ViewMode.Month) {
    return format(d, "MMMM yyyy");
  }
  if (mode === ViewMode.Week) {
    return `Mgg ${format(d, "w, MMM yyyy")}`;
  }
  return format(d, "EEE, d MMM yyyy");
}

export function viewModeLabelId(mode: ViewMode): string {
  switch (mode) {
    case ViewMode.Week:
      return "Mingguan";
    case ViewMode.Month:
      return "Bulanan";
    default:
      return "Harian";
  }
}

export type ExportRow = {
  name: string;
  from: string;
  to: string;
  status: string;
};

export function buildGanttExportRows(
  tasks: GanttApiTask[],
  viewMode: ViewMode,
): ExportRow[] {
  return tasks.map((t) => {
    const { start, end } = ganttBarRange(t);
    return {
      name: t.title,
      from: formatBoundaryForScale(start, viewMode),
      to: formatBoundaryForScale(end, viewMode),
      status: t.status.replace(/_/g, " "),
    };
  });
}

export type TimelineBucket = { label: string; start: Date; end: Date };

const MAX_BUCKETS = 28;

export function buildTimelineBuckets(
  tasks: GanttApiTask[],
  mode: ViewMode,
): TimelineBucket[] {
  if (!tasks.length) return [];
  const ranges = tasks.map((t) => ganttBarRange(t));
  let minD = dfMin(ranges.map((r) => r.start));
  let maxD = dfMax(ranges.map((r) => r.end));
  minD = startOfDay(minD);
  maxD = endOfDay(maxD);

  const buckets: TimelineBucket[] = [];

  if (mode === ViewMode.Day) {
    let cur = startOfDay(minD);
    const maxDay = startOfDay(maxD);
    for (let i = 0; i < MAX_BUCKETS; i++) {
      if (isAfter(cur, maxDay)) break;
      buckets.push({
        label: format(cur, "d MMM"),
        start: cur,
        end: endOfDay(cur),
      });
      cur = addDays(cur, 1);
    }
  } else if (mode === ViewMode.Week) {
    let cur = startOfWeek(minD, { weekStartsOn: 1 });
    for (let i = 0; i < MAX_BUCKETS; i++) {
      if (isAfter(cur, maxD)) break;
      const wEnd = endOfWeek(cur, { weekStartsOn: 1 });
      buckets.push({
        label: `W${format(cur, "w")}`,
        start: cur,
        end: wEnd,
      });
      cur = addWeeks(cur, 1);
    }
  } else {
    let cur = startOfMonth(minD);
    for (let i = 0; i < MAX_BUCKETS; i++) {
      if (isAfter(cur, maxD)) break;
      buckets.push({
        label: format(cur, "MMM yy"),
        start: cur,
        end: endOfMonth(cur),
      });
      cur = addMonths(cur, 1);
    }
  }

  return buckets;
}

export function taskCoversBucket(
  taskStart: Date,
  taskEnd: Date,
  bucket: TimelineBucket,
): boolean {
  return taskStart <= bucket.end && taskEnd >= bucket.start;
}
