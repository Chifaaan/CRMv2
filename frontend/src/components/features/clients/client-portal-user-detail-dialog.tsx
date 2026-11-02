"use client";

import { CalendarDays, Link2, Mail, Phone, User } from "lucide-react";

import {
  FormGroup,
  FormRow,
  FormSectionTitle,
} from "@/components/features/crud/form-layout";
import type { MemberRow } from "@/components/features/members/MemberModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  memberRoleBadgeVariant,
  memberRoleLabel,
  userStatusBadgeClassName,
  userStatusBadgeVariant,
  userStatusLabel,
} from "@/lib/user-status-badge";
import { cn } from "@/lib/utils";

export type PortalUserDetailRow = MemberRow & {
  createdAt?: string;
  updatedAt?: string;
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function fmtShortDate(iso: string | undefined | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatRelativeLogin(iso: string | null | undefined) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return d.toLocaleDateString();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PortalUserDetailRow | null;
  title?: string;
  description?: string;
};

export function ClientPortalUserDetailDialog({
  open,
  onOpenChange,
  user,
  title = "Portal user",
  description = "Profile data from Members or the user's own settings.",
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(85vh,560px)] max-h-[min(85vh,560px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        {user ? (
          <>
            <DialogHeader className="border-border shrink-0 space-y-2 border-b px-6 pt-6 pb-5">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pb-0.5 text-sm leading-relaxed">
                {description}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-y-contain px-6 pt-6 pb-6">
              <div className="flex flex-wrap gap-4">
                <Avatar className="size-16 rounded-lg">
                  <AvatarImage src={user.image ?? undefined} alt="" />
                  <AvatarFallback className="rounded-lg text-lg">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="text-lg font-semibold">{user.name}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={memberRoleBadgeVariant(user.role)}
                      className="font-normal capitalize"
                    >
                      {memberRoleLabel(user.role)}
                    </Badge>
                    <Badge
                      variant={userStatusBadgeVariant(user.status)}
                      className={cn(
                        "font-normal capitalize",
                        userStatusBadgeClassName(user.status),
                      )}
                    >
                      {userStatusLabel(user.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <FormSectionTitle className="border-border/70 pb-3.5 mb-5">
                  Account
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
                  {user.username ? (
                    <div className="flex items-center gap-2">
                      <User className="text-muted-foreground size-4 shrink-0" />
                      <span className="font-mono">{user.username}</span>
                    </div>
                  ) : null}
                  <div className="text-muted-foreground">
                    Last login:{" "}
                    <span className="text-foreground">
                      {formatRelativeLogin(user.lastLogin)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <FormSectionTitle className="border-border/70 pb-3.5 mb-5">
                  Contact &amp; organization
                </FormSectionTitle>
                <FormRow className="grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
                  <FormGroup>
                    <Label className="text-foreground/90">Phone</Label>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="text-muted-foreground size-4 shrink-0" />
                      <span>{user.phoneNumber?.trim() || "—"}</span>
                    </div>
                  </FormGroup>
                  <FormGroup>
                    <Label className="text-foreground/90">Company</Label>
                    <p className="text-sm leading-relaxed">
                      {user.company?.trim() || "—"}
                    </p>
                  </FormGroup>
                  <FormGroup>
                    <Label className="text-foreground/90">Department</Label>
                    <p className="text-sm leading-relaxed">
                      {user.department?.trim() || "—"}
                    </p>
                  </FormGroup>
                  <FormGroup>
                    <Label className="text-foreground/90">Position</Label>
                    <p className="text-sm leading-relaxed">
                      {user.position?.trim() || "—"}
                    </p>
                  </FormGroup>
                  <FormGroup>
                    <Label className="text-foreground/90">
                      Years of experience (YoE)
                    </Label>
                    <p className="text-sm leading-relaxed">
                      {user.yearsOfExperience?.trim() || "—"}
                    </p>
                  </FormGroup>
                </FormRow>
              </div>

              <div>
                <FormSectionTitle className="border-border/70 pb-3.5 mb-5">
                  Profile
                </FormSectionTitle>
                <FormGroup className="mb-5">
                  <Label className="text-foreground/90">Bio</Label>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                    {user.bio?.trim() || "—"}
                  </p>
                </FormGroup>
                <FormRow className="grid-cols-1 gap-y-5">
                  <FormGroup>
                    <Label className="text-foreground/90">LinkedIn</Label>
                    {user.linkedin?.trim() ? (
                      <a
                        href={user.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary flex items-center gap-2 text-sm hover:underline"
                      >
                        <Link2 className="size-4 shrink-0" />
                        <span className="truncate">{user.linkedin}</span>
                      </a>
                    ) : (
                      <p className="text-sm">—</p>
                    )}
                  </FormGroup>
                  <FormGroup>
                    <Label className="text-foreground/90">GitHub</Label>
                    {user.github?.trim() ? (
                      <a
                        href={user.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary flex items-center gap-2 text-sm hover:underline"
                      >
                        <Link2 className="size-4 shrink-0" />
                        <span className="truncate">{user.github}</span>
                      </a>
                    ) : (
                      <p className="text-sm">—</p>
                    )}
                  </FormGroup>
                </FormRow>
              </div>

              <div>
                <FormSectionTitle className="border-border/70 pb-3.5 mb-5">
                  Record
                </FormSectionTitle>
                <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0" />
                    <span>Created {fmtShortDate(user.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0" />
                    <span>Updated {fmtShortDate(user.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
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
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
