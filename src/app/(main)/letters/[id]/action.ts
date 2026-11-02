"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { serverJsonRequest } from "@/lib/api/server-json-request";
import type { LetterDetail } from "../types";

export const getLetterDetail = async (id: string) =>
  serverFetch<LetterDetail>(`/api/letters/${id}`);

export const decideLetter = async (
  id: string,
  input: { decision: string; note?: string },
) => {
  const letter = await serverJsonRequest<LetterDetail>(
    `/api/letters/${id}/decisions`,
    "POST",
    input,
  );
  revalidatePath("/letters");
  revalidatePath(`/letters/${id}`);
  return letter;
};

export const duplicateLetterDetail = async (id: string) => {
  const letter = await serverJsonRequest<LetterDetail>(
    `/api/letters/${id}/duplicate`,
    "POST",
  );
  revalidatePath("/letters");
  return letter;
};

export const deleteLetterDetail = async (id: string) => {
  const result = await serverJsonRequest<{ ok: boolean }>(
    `/api/letters/${id}`,
    "DELETE",
  );
  revalidatePath("/letters");
  return result;
};

export const removeLetterAttachment = async (
  id: string,
  attachmentId: string,
) => {
  const result = await serverJsonRequest<{ ok: boolean }>(
    `/api/letters/${id}/attachments/${attachmentId}`,
    "DELETE",
  );
  revalidatePath(`/letters/${id}`);
  return result;
};
