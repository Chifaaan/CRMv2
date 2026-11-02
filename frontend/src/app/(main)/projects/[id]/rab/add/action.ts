"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { serverJsonRequest } from "@/lib/api/server-json-request";
import type { RabItemMutationInput, RabOverview, RabWorkItem } from "../types";

export const getProjectRab = async (projectId: string) =>
  serverFetch<RabOverview>(`/api/projects/${projectId}/rab`);

export const createRabItem = async (
  projectId: string,
  input: RabItemMutationInput,
) => {
  const item = await serverJsonRequest<RabWorkItem>(
    `/api/projects/${projectId}/rab/items`,
    "POST",
    input,
  );
  revalidatePath(`/projects/${projectId}/rab`);
  return item;
};
