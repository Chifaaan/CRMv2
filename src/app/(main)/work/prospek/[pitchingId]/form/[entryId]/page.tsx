"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEntryPage } from "@/components/prototype/simpro/form-entry-page";

export default function WorkProspekFormEntryPage() {
  const params = useParams<{ pitchingId: string; entryId: string }>();
  const router = useRouter();
  return (
    <FormEntryPage
      entryId={params.entryId}
      hideProspekContext
      onBack={() => router.push(`/work/prospek/${params.pitchingId}/form`)}
    />
  );
}
