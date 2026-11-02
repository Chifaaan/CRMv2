"use client";

import { useMemo, useState } from "react";
import { LetterPreviewDocument } from "./letter-preview-document";
import { LetterPreviewPanel } from "./letter-preview-panel";
import { LetterPreviewToolbar } from "./letter-preview-toolbar";
import type { LetterDetail } from "../../../types";

export type PreviewZoom = 0.75 | 1 | 1.25 | "fit";

const zoomScale: Record<Exclude<PreviewZoom, "fit">, number> = {
  0.75: 0.75,
  1: 1,
  1.25: 1.25,
};

export const LetterPreviewShell = ({ letter }: { letter: LetterDetail }) => {
  const [zoom, setZoom] = useState<PreviewZoom>(1);
  const scale = useMemo(() => (zoom === "fit" ? 0.82 : zoomScale[zoom]), [zoom]);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="grid min-h-[calc(100vh-9rem)] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col bg-muted/30">
          <LetterPreviewToolbar
            letter={letter}
            zoom={zoom}
            onZoomChange={setZoom}
          />
          <div className="h-[calc(100vh-12rem)] overflow-auto p-8 md:p-12">
            <div className="flex min-w-[820px] justify-center pb-12">
              <LetterPreviewDocument letter={letter} scale={scale} />
            </div>
          </div>
        </div>
        <LetterPreviewPanel letter={letter} />
      </div>
    </section>
  );
};
