"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { UserProfileModal } from "@/components/features/users/UserProfileModal";

type UserProfileContextValue = {
  openUserProfile: (userId: string) => void;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const openUserProfile = useCallback((id: string) => {
    if (!id?.trim()) return;
    setUserId(id);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openUserProfile }), [openUserProfile]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
      <UserProfileModal
        open={open}
        onOpenChange={setOpen}
        userId={userId}
      />
    </UserProfileContext.Provider>
  );
}

export function useUserProfileModal() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfileModal must be used within UserProfileProvider");
  }
  return ctx;
}
