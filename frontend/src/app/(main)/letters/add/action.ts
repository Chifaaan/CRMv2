"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { serverJsonRequest } from "@/lib/api/server-json-request";
import type {
  LetterDetail,
  LetterMeta,
  LetterMutationInput,
} from "../types";

export const getAddLetterMeta = async () =>
  serverFetch<LetterMeta>("/api/letters/meta");

export const saveAddLetterDraft = async (input: LetterMutationInput) => {
  const letter = await serverJsonRequest<LetterDetail>(
    "/api/letters",
    "POST",
    input,
  );
  revalidatePath("/letters");
  return letter;
};

export const finalizeAddLetter = async (id: string) => {
  const letter = await serverJsonRequest<LetterDetail>(
    `/api/letters/${id}/finalize`,
    "POST",
  );
  revalidatePath("/letters");
  revalidatePath(`/letters/${id}`);
  return letter;
};

export const addLetterAttachment = async (
  id: string,
  input: {
    url: string;
    name: string;
    mimeType?: string;
    size?: number;
  },
) => {
  const attachment = await serverJsonRequest(
    `/api/letters/${id}/attachments`,
    "POST",
    input,
  );
  revalidatePath(`/letters/${id}`);
  return attachment;
};

export const uploadLetterFile = async (formData: FormData) => {
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

  const response = await fetch(`${base}/api/upload?category=letters`, {
    method: "POST",
    headers: forwardHeaders,
    body: formData,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Gagal mengunggah berkas.");
  return (await response.json()) as {
    url: string;
    name: string;
    size: number;
    mimeType: string;
  };
};
