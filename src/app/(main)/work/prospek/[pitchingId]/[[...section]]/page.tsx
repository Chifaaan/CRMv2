"use client";

import { useParams } from "next/navigation";
import { ProspekWorkPage } from "@/components/prototype/prospek-work";

export default function WorkProspekPage() {
  const params = useParams<{ pitchingId: string; section?: string[] }>();
  const section = params.section?.[0];
  return <ProspekWorkPage pitchingId={params.pitchingId} section={section} />;
}
