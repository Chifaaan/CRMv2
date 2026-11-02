"use server";

import { serverFetch } from "@/lib/api/server-fetch";
import type { LetterDetail } from "../../types";

export const getLetterPreview = async (id: string) =>
  serverFetch<LetterDetail>(`/api/letters/${id}/preview`);
