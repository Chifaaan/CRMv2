"use client";

import { BusinessDashboard } from "@/components/prototype/business-dashboard";
import { BusinessShell } from "@/components/prototype/business-hub";

export default function BusinessDashboardPage() {
  return (
    <BusinessShell active="dashboard">
      <BusinessDashboard />
    </BusinessShell>
  );
}
