"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEntryPage } from "@/components/prototype/simpro/form-entry-page";

export default function CrmProspekFormEntryPage() {
  const params = useParams<{ id: string; entryId: string }>();
  const router = useRouter();
  return (
    <FormEntryPage
      entryId={params.entryId}
      onBack={() => router.push(`/crm/prospek/${params.id}`)}
    />
  );
}
