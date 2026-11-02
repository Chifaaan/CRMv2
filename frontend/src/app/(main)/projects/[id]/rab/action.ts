"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { serverJsonRequest } from "@/lib/api/server-json-request";
import type {
  RabDetailCreateInput,
  RabDetailMutationInput,
  RabDocumentMutationInput,
  RabGroupCreateInput,
  RabGroupMutationInput,
  RabItemMutationInput,
  RabOverview,
} from "./types";

export const getProjectRab = async (projectId: string) =>
  serverFetch<RabOverview>(`/api/projects/${projectId}/rab`);

export const updateRabMetadata = async (
  projectId: string,
  input: { conversionDate: string | null },
) => {
  const rab = await serverJsonRequest(
    `/api/projects/${projectId}/rab`,
    "PATCH",
    input,
  );
  revalidatePath(`/projects/${projectId}/rab`);
  return rab;
};

export const createRabItem = async (
  projectId: string,
  input: RabItemMutationInput,
) => {
  const item = await serverJsonRequest(
    `/api/projects/${projectId}/rab/items`,
    "POST",
    input,
  );
  revalidatePath(`/projects/${projectId}/rab`);
  return item;
};

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

export const deleteRabItem = async (projectId: string, itemId: string) => {
  const result = await serverJsonRequest(
    `/api/projects/${projectId}/rab/items/${itemId}`,
    "DELETE",
  );
  revalidatePath(`/projects/${projectId}/rab`);
  return result;
};

export const createRabDocument = async (
  projectId: string,
  input: RabDocumentMutationInput,
) => {
  const document = await serverJsonRequest(
    `/api/projects/${projectId}/rab/documents`,
    "POST",
    input,
  );
  revalidatePath(`/projects/${projectId}/rab`);
  return document;
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

export type RabImportResult = {
  imported: boolean;
  totalRows: number;
  itemCount: number;
  errors: { row: number; message: string }[];
};

export const downloadRabTemplate = async (projectId: string) => {
  const { cookies, headers } = await import("next/headers");
  const { buildServerForwardHeaders, resolveServerRequestBase } = await import(
    "@/lib/server-request-base"
  );
  const hdrs = await headers();
  const base = resolveServerRequestBase(hdrs);
  const forwardHeaders = buildServerForwardHeaders(hdrs);
  const jar = await cookies();
  const cookie = jar
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
  if (cookie) forwardHeaders.set("cookie", cookie);

  const response = await fetch(
    `${base}/api/projects/${projectId}/rab/import/template`,
    { headers: forwardHeaders, cache: "no-store" },
  );
  if (!response.ok) throw new Error("Gagal mengunduh template.");
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
};

export const importRabFromFile = async (
  projectId: string,
  formData: FormData,
): Promise<RabImportResult> => {
  const { cookies, headers } = await import("next/headers");
  const { buildServerForwardHeaders, resolveServerRequestBase } = await import(
    "@/lib/server-request-base"
  );
  const hdrs = await headers();
  const base = resolveServerRequestBase(hdrs);
  const forwardHeaders = buildServerForwardHeaders(hdrs);
  forwardHeaders.delete("content-type");
  const jar = await cookies();
  const cookie = jar
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
  if (cookie) forwardHeaders.set("cookie", cookie);

  const response = await fetch(
    `${base}/api/projects/${projectId}/rab/import`,
    { method: "POST", headers: forwardHeaders, body: formData, cache: "no-store" },
  );
  const payload = (await response.json()) as RabImportResult & {
    message?: string;
  };
  if (!response.ok) {
    return {
      imported: false,
      totalRows: 0,
      itemCount: 0,
      errors: [{ row: 0, message: payload.message ?? "Import gagal." }],
    };
  }
  if (payload.imported) revalidatePath(`/projects/${projectId}/rab`);
  return payload;
};

export const deriveRapFromRab = async (
  projectId: string,
  overwrite = false,
) => {
  const result = await serverJsonRequest<{ updated: number }>(
    `/api/projects/${projectId}/rab/derive-rap`,
    "POST",
    { overwrite },
  );
  revalidatePath(`/projects/${projectId}/rab`);
  return result;
};
