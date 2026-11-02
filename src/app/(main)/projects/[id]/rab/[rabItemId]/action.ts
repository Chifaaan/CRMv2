"use server";

import { serverFetch } from "@/lib/api/server-fetch";
import type { RabOverview } from "../types";

export const getProjectRab = async (projectId: string) =>
  serverFetch<RabOverview>(`/api/projects/${projectId}/rab`);
