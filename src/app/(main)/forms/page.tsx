"use client";

import { Suspense } from "react";
import { SimproFormsPage } from "@/components/prototype/simpro/forms-page";

export default function FormsRoute() {
  return (
    <Suspense fallback={<div className="text-muted-foreground p-4 text-xs">Memuat forms…</div>}>
      <SimproFormsPage />
    </Suspense>
  );
}
