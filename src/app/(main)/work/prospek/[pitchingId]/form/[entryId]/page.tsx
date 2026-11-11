"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function WorkProspekFormEntryPage() {
  const params = useParams<{ pitchingId: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/work/prospek/${params.pitchingId}/form`);
  }, [params.pitchingId, router]);
  return null;
}
