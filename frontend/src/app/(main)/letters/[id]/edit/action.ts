"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { serverJsonRequest } from "@/lib/api/server-json-request";
import { serverFormRequest } from "@/lib/api/server-form-request";
import type {
  LetterDetail,
  LetterMeta,
  LetterMutationInput,
} from "../../types";

export const getEditLetter = async (id: string) =>
  serverFetch<LetterDetail>(`/api/letters/${id}`);

export const getEditLetterMeta = async () =>
  serverFetch<LetterMeta>("/api/letters/meta");

export const saveEditLetterDraft = async (
  id: string,
  input: LetterMutationInput,
) => {
  const letter = await serverJsonRequest<LetterDetail>(
    `/api/letters/${id}`,
    "PATCH",
    input,
  );
  revalidatePath("/letters");
  revalidatePath(`/letters/${id}`);
  revalidatePath(`/letters/${id}/edit`);
  return letter;
};

export const finalizeEditLetter = async (id: string) => {
  const letter = await serverJsonRequest<LetterDetail>(
    `/api/letters/${id}/finalize`,
    "POST",
  );
  revalidatePath("/letters");
  revalidatePath(`/letters/${id}`);
  return letter;
};

export const resubmitEditedLetter = async (id: string) => {
  const letter = await serverJsonRequest<LetterDetail>(
    `/api/letters/${id}/resubmit`,
    "POST",
  );
  revalidatePath("/letters");
  revalidatePath(`/letters/${id}`);
  return letter;
};

export const uploadEditedLetterAttachment = async (
  id: string,
  formData: FormData,
) => {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("File wajib dipilih.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Ukuran file maksimal 10 MB.");
  }
  const uploaded = await serverFormRequest<{
    url: string;
    name: string;
    size: number;
    mimeType: string;
  }>("/api/upload?category=letters", formData);
  const attachment = await serverJsonRequest(
    `/api/letters/${id}/attachments`,
    "POST",
    uploaded,
  );
  revalidatePath(`/letters/${id}`);
  revalidatePath(`/letters/${id}/edit`);
  return attachment;
};
