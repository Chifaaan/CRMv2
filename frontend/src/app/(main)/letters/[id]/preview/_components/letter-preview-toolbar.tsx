import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LetterDetail } from "../../../types";
import type { PreviewZoom } from "./letter-preview-shell";

const zoomItems: { label: string; value: PreviewZoom }[] = [
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
  { label: "125%", value: 1.25 },
  { label: "Fit", value: "fit" },
];

export const LetterPreviewToolbar = ({
  letter,
  zoom,
  onZoomChange,
}: {
  letter: LetterDetail;
  zoom: PreviewZoom;
  onZoomChange: (value: PreviewZoom) => void;
}) => (
  <div className="flex h-12 items-center justify-between border-b bg-card px-4">
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Preview Mode
      </span>
      <span className="h-1 w-1 rounded-full bg-border" />
      <span className="text-sm font-medium">
        {letter.number.replaceAll("/", "-")}.pdf
      </span>
    </div>
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {zoomItems.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onZoomChange(item.value)}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm transition-colors hover:bg-background",
            zoom === item.value && "bg-background font-semibold shadow-sm",
          )}
        >
          {item.value === "fit" ? <Maximize2 className="h-4 w-4" /> : null}
          {item.label}
        </button>
      ))}
    </div>
  </div>
);
