"use client";

import { useParams } from "next/navigation";
import { CrmPitchingDetail } from "@/components/prototype/crm/pitching-detail";

export default function CrmPitchingPage() {
  const params = useParams<{ id: string; pitchingId: string }>();
  return (
    <CrmPitchingDetail
      prospekId={params.id}
      pitchingId={params.pitchingId}
    />
  );
}
