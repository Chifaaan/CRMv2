"use client";

import { useParams } from "next/navigation";
import { FinanceFormPage } from "@/components/prototype/crm/finance-form-page";
import { MediaOrderFormPage } from "@/components/prototype/crm/media-order-form";

export default function FinanceFormRoute() {
  const params = useParams<{ id: string; type: string }>();
  if (params.type === "mo") {
    return <MediaOrderFormPage projectId={params.id} />;
  }
  return <FinanceFormPage projectId={params.id} formType={params.type} />;
}
