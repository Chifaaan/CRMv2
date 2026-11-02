"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { serverJsonRequest } from "@/lib/api/server-json-request";
import type {
  RabDetailCreateInput,
  RabDetailMutationInput,
  RabGroupCreateInput,
  RabGroupMutationInput,
  RabWorkItem,
  RabItemMutationInput,
  RabOverview,
} from "../../types";

export const getProjectRab = async (projectId: string) =>
  serverFetch<RabOverview>(`/api/projects/${projectId}/rab`);

export const updateRabItem = async (
  projectId: string,
  itemId: string,
  input: Partial<RabItemMutationInput>,
) => {
  const item = await serverJsonRequest(
    `/api/projects/${projectId}/rab/items/${itemId}`,
    "PATCH",
    input,
  );
  revalidatePath(`/projects/${projectId}/rab`);
  revalidatePath(`/projects/${projectId}/rab/${itemId}`);
  return item;
};

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

export const createRabGroup = async (
  projectId: string,
  itemId: string,
  input: RabGroupCreateInput,
) => {
  const group = await serverJsonRequest(
    `/api/projects/${projectId}/rab/items/${itemId}/groups`,
    "POST",
    input,
  );
  revalidatePath(`/projects/${projectId}/rab/${itemId}`);
  return group;
};

export const updateRabGroup = async (
  projectId: string,
  itemId: string,
  groupId: string,
  input: RabGroupMutationInput,
) => {
  const group = await serverJsonRequest(
    `/api/projects/${projectId}/rab/items/${itemId}/groups/${groupId}`,
    "PATCH",
    input,
  );
  revalidatePath(`/projects/${projectId}/rab/${itemId}`);
  return group;
};

export const deleteRabGroup = async (
  projectId: string,
  itemId: string,
  groupId: string,
) => {
  const result = await serverJsonRequest(
    `/api/projects/${projectId}/rab/items/${itemId}/groups/${groupId}`,
    "DELETE",
  );
  revalidatePath(`/projects/${projectId}/rab/${itemId}`);
  return result;
};

export const createRabDetail = async (
  projectId: string,
  itemId: string,
  groupId: string,
  input: RabDetailCreateInput,
) => {
  const detail = await serverJsonRequest(
    `/api/projects/${projectId}/rab/groups/${groupId}/details`,
    "POST",
    input,
  );
  revalidatePath(`/projects/${projectId}/rab/${itemId}`);
  return detail;
};

export const updateRabDetail = async (
  projectId: string,
  itemId: string,
  groupId: string,
  detailId: string,
  input: RabDetailMutationInput,
) => {
  const detail = await serverJsonRequest(
    `/api/projects/${projectId}/rab/groups/${groupId}/details/${detailId}`,
    "PATCH",
    input,
  );
  revalidatePath(`/projects/${projectId}/rab/${itemId}`);
  return detail;
};

export const deleteRabDetail = async (
  projectId: string,
  itemId: string,
  groupId: string,
  detailId: string,
) => {
  const result = await serverJsonRequest(
    `/api/projects/${projectId}/rab/groups/${groupId}/details/${detailId}`,
    "DELETE",
  );
  revalidatePath(`/projects/${projectId}/rab/${itemId}`);
  return result;
};
