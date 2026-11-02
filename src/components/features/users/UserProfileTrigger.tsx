"use client";

import type { ReactNode } from "react";

import { useUserProfileModal } from "@/components/features/users/user-profile-context";
import { cn } from "@/lib/utils";

type Props = {
  userId: string | null | undefined;
  children: ReactNode;
  className?: string;
  /** Stop click from bubbling (e.g. kanban card, table row) */
  stopPropagation?: boolean;
  /** Also make the trigger keyboard-accessible with a title */
  title?: string;
};

/**
 * Wraps avatar/name UI to open the shared UserProfileModal on click.
 * Preserves existing child markup so visuals stay unchanged.
 */
export function UserProfileTrigger({
  userId,
  children,
  className,
  stopPropagation = true,
  title = "View profile",
}: Props) {
  const { openUserProfile } = useUserProfileModal();

  if (!userId?.trim()) {
    return <>{children}</>;
  }

  return (
    <button
      type="button"
      title={title}
      className={cn(
        "inline-flex cursor-pointer items-center border-0 bg-transparent p-0 text-inherit",
        "rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        openUserProfile(userId);
      }}
    >
      {children}
    </button>
  );
}
