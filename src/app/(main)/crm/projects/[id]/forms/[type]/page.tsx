"use client";

import { useParams } from "next/navigation";
import { FinanceFormPage } from "@/components/prototype/crm/finance-form-page";

export default function FinanceFormRoute() {
  const params = useParams<{ id: string; type: string }>();
  return <FinanceFormPage projectId={params.id} formType={params.type} />;
}
