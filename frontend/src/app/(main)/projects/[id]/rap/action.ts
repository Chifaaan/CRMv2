"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { serverJsonRequest } from "@/lib/api/server-json-request";
import type { RabOverview } from "../rab/types";

export const getProjectRap = async (projectId: string) =>
  serverFetch<RabOverview>(`/api/projects/${projectId}/rab`);

export const deriveRap = async (projectId: string, overwrite = false) => {
  const result = await serverJsonRequest<{ updated: number }>(
    `/api/projects/${projectId}/rab/derive-rap`,
    "POST",
    { overwrite },
  );
  revalidatePath(`/projects/${projectId}/rap`);
  revalidatePath(`/projects/${projectId}/rab`);
  return result;
};

export const updateRapUnitPrice = async (
  projectId: string,
  groupId: string,
  detailId: string,
  rapUnitPrice: number | null,
) => {
  const result = await serverJsonRequest(
    `/api/projects/${projectId}/rab/groups/${groupId}/details/${detailId}`,
    "PATCH",
    { rapUnitPrice },
  );
  revalidatePath(`/projects/${projectId}/rap`);
  revalidatePath(`/projects/${projectId}/rab`);
  return result;
};

export const updateRapItemMode = async (
  projectId: string,
  itemId: string,
  payload: { rapUseDetails?: boolean; rapAmount?: number | null },
) => {
  const result = await serverJsonRequest(
    `/api/projects/${projectId}/rab/items/${itemId}`,
    "PATCH",
    payload,
  );
  revalidatePath(`/projects/${projectId}/rap`);
  revalidatePath(`/projects/${projectId}/rab`);
  return result;
};
