"use client";

import { useParams } from "next/navigation";
import { SimproProjectPage } from "@/components/prototype/simpro/project-page";

export default function ProjectFormsPage() {
  const params = useParams<{ id: string }>();
  return <SimproProjectPage projectId={params.id} tab="forms" />;
}
