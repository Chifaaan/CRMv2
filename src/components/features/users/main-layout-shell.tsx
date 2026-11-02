"use client";

import type { ReactNode } from "react";

import { UserProfileProvider } from "@/components/features/users/user-profile-context";

export function MainLayoutShell({ children }: { children: ReactNode }) {
  return <UserProfileProvider>{children}</UserProfileProvider>;
}
