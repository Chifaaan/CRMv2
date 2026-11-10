"use client";

import { useParams } from "next/navigation";
import { UmbrellaDetail } from "@/components/prototype/crm/umbrella-detail";

export default function UmbrellaDetailPage() {
  const params = useParams<{ id: string }>();
  return <UmbrellaDetail umbrellaId={params.id} />;
}
