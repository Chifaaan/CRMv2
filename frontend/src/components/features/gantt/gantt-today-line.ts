import { ViewMode } from "gantt-task-react";
import {
  addDays,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

const LINE_PX = 2;
const LINE_COLOR = "#ef4444";
const COL_W_DATA = "data-gantt-col-width";
const COL_X_DATA = "data-gantt-col-x";

/**
 * How far "now" is through the current timeline column (0–1), for drawing a
 * vertical "now" line. Matches day/week/month-style columns in gantt-task-react.
 */
export function getNowFractionInTimelineColumn(viewMode: ViewMode): number {
  const now = new Date();
  switch (viewMode) {
    case ViewMode.Day:
      return Math.min(
        1,
        Math.max(0, (now.getTime() - startOfDay(now).getTime()) / 86_400_000),
      );
    case ViewMode.HalfDay:
      return Math.min(
        1,
        Math.max(
          0,
          ((now.getTime() - startOfDay(now).getTime()) % 43_200_000) /
            43_200_000,
        ),
      );
    case ViewMode.QuarterDay:
      return Math.min(
        1,
        Math.max(
          0,
          ((now.getTime() - startOfDay(now).getTime()) % 21_600_000) /
            21_600_000,
        ),
      );
    case ViewMode.Hour:
      return Math.min(
        1,
        Math.max(
          0,
          ((now.getTime() - startOfDay(now).getTime()) % 3_600_000) /
            3_600_000,
        ),
      );
    case ViewMode.Week: {
      // Match gantt-task-react date-helper: startOfWeek without locale override
      const sow = startOfWeek(now);
      const eow = addDays(sow, 7);
      const span = eow.getTime() - sow.getTime();
      return Math.min(1, Math.max(0, (now.getTime() - sow.getTime()) / span));
    }
    case ViewMode.Month: {
      const som = startOfMonth(now);
      const eom = endOfMonth(now);
      const span = eom.getTime() - som.getTime() + 86_400_000;
      return Math.min(1, Math.max(0, (now.getTime() - som.getTime()) / span));
    }
    case ViewMode.Year: {
      const soy = startOfYear(now);
      const eoy = endOfYear(now);
      const span = eoy.getTime() - soy.getTime() + 86_400_000;
      return Math.min(1, Math.max(0, (now.getTime() - soy.getTime()) / span));
    }
    default:
      return 0;
  }
}

/**
 * gantt-task-react draws "today" as a full-column <rect>. We hide that fill and
 * turn it into a thin vertical line, shifted by the current time within the column.
 * Call after paint (useLayoutEffect) and periodically so the line moves through the day.
 */
export function narrowGanttTodayLine(
  container: HTMLElement | null,
  viewMode: ViewMode,
): void {
  if (!container) return;
  const rect = container.querySelector(
    "svg g.today rect",
  ) as SVGRectElement | null;
  if (!rect) return;

  const wAttr = rect.getAttribute("width");
  const xAttr = rect.getAttribute("x");
  if (wAttr == null || xAttr == null) return;

  const w = parseFloat(wAttr);
  const baseX = parseFloat(xAttr);
  if (!Number.isFinite(w) || !Number.isFinite(baseX) || w <= 0) return;

  let colStartX: number;
  let effW: number;
  if (w > LINE_PX + 0.5) {
    rect.setAttribute(COL_W_DATA, String(w));
    rect.setAttribute(COL_X_DATA, String(baseX));
    colStartX = baseX;
    effW = w;
  } else {
    const sx = rect.getAttribute(COL_X_DATA);
    const sw = rect.getAttribute(COL_W_DATA);
    colStartX = sx != null ? parseFloat(sx) : baseX;
    effW = sw != null ? parseFloat(sw) : w;
  }

  const frac = getNowFractionInTimelineColumn(viewMode);
  const x = colStartX + frac * effW - LINE_PX / 2;

  rect.setAttribute("width", String(LINE_PX));
  rect.setAttribute("x", String(x));
  rect.setAttribute("fill", LINE_COLOR);
  rect.setAttribute("pointer-events", "none");
}
