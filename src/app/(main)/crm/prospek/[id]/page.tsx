"use client";

import { useParams } from "next/navigation";
import { CrmProspekDetail } from "@/components/prototype/crm/prospek-detail";

export default function CrmProspekDetailPage() {
  const params = useParams<{ id: string }>();
  return <CrmProspekDetail prospekId={params.id} />;
}
