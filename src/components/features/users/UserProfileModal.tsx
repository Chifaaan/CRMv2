"use client";

import { Link2, Loader2, Mail, Phone } from "lucide-react";

import {
  FormGroup,
  FormRow,
  FormSectionTitle,
} from "@/components/features/crud/form-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useUserProfile } from "@/hooks/use-user-profile";
import { initialsFromName } from "@/lib/meetings-constants";
import type { PublicUserProfile } from "@/lib/types/user-profile";

function displayOrDash(value: string | null | undefined) {
  const v = value?.trim();
  return v ? v : "—";
}

function ProfileField({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  const v = value?.trim();
  if (!v) return null;
  return (
    <FormGroup>
      <Label className="text-foreground/90">{label}</Label>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary flex items-center gap-2 text-sm hover:underline"
        >
          <Link2 className="size-4 shrink-0" />
          <span className="truncate">{v}</span>
        </a>
      ) : (
        <p className="text-sm leading-relaxed">{v}</p>
      )}
    </FormGroup>
  );
}

function ProfileBody({ user }: { user: PublicUserProfile }) {
  const bio = user.bio?.trim();

  return (
    <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-y-contain px-6 pt-6 pb-6">
      <div className="flex flex-wrap gap-4">
        <Avatar className="size-16 rounded-lg">
          <AvatarImage src={user.image ?? undefined} alt="" />
          <AvatarFallback className="rounded-lg text-lg">
            {initialsFromName(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-lg font-semibold">{user.name}</h2>
          {user.username?.trim() ? (
            <p className="text-muted-foreground font-mono text-sm">
              @{user.username.trim()}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <FormSectionTitle className="border-border/70 mb-5 pb-3.5">
          Contact
        </FormSectionTitle>
        <div className="space-y-3.5 text-sm leading-relaxed">
          <div className="flex items-center gap-2">
            <Mail className="text-muted-foreground size-4 shrink-0" />
            <a
              href={`mailto:${user.email}`}
              className="text-primary hover:underline"
            >
              {user.email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="text-muted-foreground size-4 shrink-0" />
            <span>{displayOrDash(user.phoneNumber)}</span>
          </div>
        </div>
      </div>

      <div>
        <FormSectionTitle className="border-border/70 mb-5 pb-3.5">
          Organization
        </FormSectionTitle>
        <FormRow className="grid-cols-1 gap-y-5">
          <FormGroup>
            <Label className="text-foreground/90">Company</Label>
            <p className="text-sm leading-relaxed">
              {displayOrDash(user.company)}
            </p>
          </FormGroup>
        </FormRow>
      </div>

      {(bio || user.linkedin?.trim() || user.github?.trim()) && (
        <div>
          <FormSectionTitle className="border-border/70 mb-5 pb-3.5">
            Profile
          </FormSectionTitle>
          {bio ? (
            <FormGroup className="mb-5">
              <Label className="text-foreground/90">Bio</Label>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                {bio}
              </p>
            </FormGroup>
          ) : null}
          <FormRow className="grid-cols-1 gap-y-5">
            <ProfileField
              label="LinkedIn"
              value={user.linkedin}
              href={
                user.linkedin?.trim()
                  ? user.linkedin.startsWith("http")
                    ? user.linkedin
                    : `https://${user.linkedin.trim()}`
                  : undefined
              }
            />
            <ProfileField
              label="GitHub"
              value={user.github}
              href={
                user.github?.trim()
                  ? user.github.startsWith("http")
                    ? user.github
                    : `https://${user.github.trim()}`
                  : undefined
              }
            />
          </FormRow>
        </div>
      )}
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
};

export function UserProfileModal({ open, onOpenChange, userId }: Props) {
  const { data, isLoading, isError } = useUserProfile(userId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(85vh,520px)] max-h-[min(85vh,520px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader className="border-border shrink-0 space-y-2 border-b px-6 pt-6 pb-5">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            User profile
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pb-0.5 text-sm leading-relaxed">
            Read-only profile information.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="text-muted-foreground size-8 animate-spin" />
          </div>
        ) : isError || !data ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center px-6 py-16 text-sm">
            Could not load profile.
          </div>
        ) : (
          <ProfileBody user={data} />
        )}

        <DialogFooter className="border-border bg-muted/30 mx-0 mb-0 shrink-0 border-t px-6 pt-5 pb-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-10 w-full px-5 sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
