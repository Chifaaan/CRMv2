"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { serverJsonRequest } from "@/lib/api/server-json-request";
import type {
  LetterDetail,
  LetterList,
  LetterMeta,
  LetterSearchParams,
  LetterSummary,
} from "./types";

const buildLetterQuery = (filters: LetterSearchParams) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return query.toString();
};

export const getLetters = async (filters: LetterSearchParams) =>
  serverFetch<LetterList>(`/api/letters?${buildLetterQuery(filters)}`);

export const getLetterSummary = async () =>
  serverFetch<LetterSummary>("/api/letters/summary");

export const getLetterMeta = async () =>
  serverFetch<LetterMeta>("/api/letters/meta");

export const duplicateLetter = async (id: string) => {
  const letter = await serverJsonRequest<LetterDetail>(
    `/api/letters/${id}/duplicate`,
    "POST",
  );
  revalidatePath("/letters");
  return letter;
};

export const deleteLetter = async (id: string) => {
  const result = await serverJsonRequest<{ ok: boolean }>(
    `/api/letters/${id}`,
    "DELETE",
  );
  revalidatePath("/letters");
  return result;
};
