"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CrmProspekFormEntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/crm/prospek/${params.id}`);
  }, [params.id, router]);
  return null;
}
