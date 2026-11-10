"use client";

import { BusinessMoTable, BusinessShell } from "@/components/prototype/business-hub";

export default function BusinessMoPage() {
  return (
    <BusinessShell active="mo">
      <BusinessMoTable />
    </BusinessShell>
  );
}
