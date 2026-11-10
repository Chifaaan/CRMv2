"use client";

import { BusinessRabTable, BusinessShell } from "@/components/prototype/business-hub";

export default function BusinessRabPage() {
  return (
    <BusinessShell active="rab">
      <BusinessRabTable />
    </BusinessShell>
  );
}
