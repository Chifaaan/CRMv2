"use client";

import { useParams } from "next/navigation";
import { CrmProjectDetail } from "@/components/prototype/crm/project-detail";

export default function CrmProjectDetailPage() {
  const params = useParams<{ id: string }>();
  return <CrmProjectDetail projectId={params.id} />;
}
