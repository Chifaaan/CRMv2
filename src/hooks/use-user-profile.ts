"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { PublicUserProfile } from "@/lib/types/user-profile";

export function userProfileQueryKey(userId: string) {
  return ["user", "profile", userId] as const;
}

export function useUserProfile(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: userProfileQueryKey(userId ?? ""),
    queryFn: async () => {
      const { data } = await api.get<PublicUserProfile>(
        `/api/users/${userId}/profile`,
      );
      return data;
    },
    enabled: Boolean(userId) && enabled,
    staleTime: 5 * 60_000,
  });
}
