"use client";

import { useParams } from "next/navigation";
import { FinanceFormPage } from "@/components/prototype/crm/finance-form-page";

export default function SimproFinanceFormRoute() {
  const params = useParams<{ projectId: string; type: string }>();
  return (
    <FinanceFormPage projectId={params.projectId} formType={params.type} />
  );
}
