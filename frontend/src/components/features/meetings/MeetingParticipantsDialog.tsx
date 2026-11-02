"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ListFilter, Search, Trash2 } from "lucide-react";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { initialsFromName } from "@/lib/meetings-constants";
import {
  memberRoleBadgeVariant,
  memberRoleLabel,
} from "@/lib/user-status-badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type MeetingParticipantsMeeting = {
  id: string;
  title: string;
  createdBy: {
    id: string;
    name: string;
    image: string | null;
    role: string;
    clientId: string | null;
  };
  attendees: {
    user: {
      id: string;
      name: string;
      image: string | null;
      role: string;
      clientId: string | null;
    };
  }[];
};

type ParticipantRow = {
  id: string;
  name: string;
  image: string | null;
  role: string;
  clientId: string | null;
  partKind: "creator" | "invitee";
};

function buildParticipants(m: MeetingParticipantsMeeting): ParticipantRow[] {
  const creator: ParticipantRow = {
    id: m.createdBy.id,
    name: m.createdBy.name,
    image: m.createdBy.image,
    role: m.createdBy.role,
    clientId: m.createdBy.clientId,
    partKind: "creator",
  };
  const seen = new Set<string>([creator.id]);
  const rows: ParticipantRow[] = [creator];
  for (const a of m.attendees ?? []) {
    const u = a.user;
    if (!u?.id || seen.has(u.id)) continue;
    seen.add(u.id);
    rows.push({
      id: u.id,
      name: u.name,
      image: u.image,
      role: u.role,
      clientId: u.clientId,
      partKind: "invitee",
    });
  }
  return rows;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: MeetingParticipantsMeeting | null;
  canRemoveParticipants?: boolean;
  onParticipantsUpdated?: () => void;
};

/**
 * Bungkus utama: pemanggil mengatur `open`/`meeting`; state pencarian & filter ada
 * di dalam komponen terpisah bergantung pada `key={sesi}` untuk reset tanpa efek sinkron setState.
 */
export function MeetingParticipantsDialog({
  open,
  onOpenChange,
  meeting,
  canRemoveParticipants = false,
  onParticipantsUpdated,
}: Props) {
  if (!meeting) return null;
  return (
    <MeetingParticipantsSession
      meeting={meeting}
      open={open}
      onOpenChange={onOpenChange}
      canRemoveParticipants={canRemoveParticipants}
      onParticipantsUpdated={onParticipantsUpdated}
    />
  );
}

function MeetingParticipantsSession({
  meeting,
  open,
  onOpenChange,
  canRemoveParticipants,
  onParticipantsUpdated,
}: {
  meeting: MeetingParticipantsMeeting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canRemoveParticipants: boolean;
  onParticipantsUpdated?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRole, setFilterRole] = useState("__all");
  const [filterKind, setFilterKind] = useState<
    "__all" | "creator" | "invitee"
  >("__all");
  const [filterAccount, setFilterAccount] = useState<
    "__all" | "internal" | "client"
  >("__all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [localMeeting, setLocalMeeting] = useState(meeting);

  const allRows = useMemo(() => buildParticipants(localMeeting), [localMeeting]);

  const totalCount = allRows.length;

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) {
      if ((r.role ?? "").trim()) set.add(r.role.trim());
    }
    return [...set].sort((a, b) =>
      memberRoleLabel(a).localeCompare(memberRoleLabel(b), "id"),
    );
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (deferredQuery) {
        const n = r.name.toLowerCase();
        if (!n.includes(deferredQuery)) return false;
      }
      if (filterRole !== "__all" && r.role !== filterRole) return false;
      if (filterKind !== "__all" && r.partKind !== filterKind) return false;
      if (filterAccount === "internal" && r.clientId) return false;
      if (filterAccount === "client" && !r.clientId) return false;
      return true;
    });
  }, [allRows, deferredQuery, filterAccount, filterKind, filterRole]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterRole !== "__all") n += 1;
    if (filterKind !== "__all") n += 1;
    if (filterAccount !== "__all") n += 1;
    return n;
  }, [filterAccount, filterKind, filterRole]);

  const shownCount = filteredRows.length;

  const removeParticipants = useMutation({
    mutationFn: async (userIds: string[]) => {
      const remainingIds = (localMeeting.attendees ?? [])
        .map((a) => a.user.id)
        .filter((id) => !userIds.includes(id));
      await api.patch(`/api/meetings/${localMeeting.id}`, {
        attendeeIds: remainingIds,
      });
      return userIds;
    },
    onSuccess: (removedIds) => {
      setLocalMeeting((prev) => ({
        ...prev,
        attendees: prev.attendees.filter(
          (a) => !removedIds.includes(a.user.id),
        ),
      }));
      setSelectedIds(new Set());
      onParticipantsUpdated?.();
      toast.success(
        removedIds.length === 1
          ? "Peserta dihapus dari rapat"
          : `${removedIds.length} peserta dihapus dari rapat`,
      );
    },
    onError: () => {
      toast.error("Gagal menghapus peserta");
    },
  });

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const removableFilteredIds = useMemo(
    () =>
      filteredRows
        .filter((r) => r.partKind === "invitee")
        .map((r) => r.id),
    [filteredRows],
  );

  const allRemovableFilteredSelected =
    removableFilteredIds.length > 0 &&
    removableFilteredIds.every((id) => selectedIds.has(id));

  function toggleSelectAllRemovable() {
    if (removableFilteredIds.length === 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allRemovableFilteredSelected) {
        for (const id of removableFilteredIds) next.delete(id);
      } else {
        for (const id of removableFilteredIds) next.add(id);
      }
      return next;
    });
  }

  const removableSelectedCount = [...selectedIds].filter((id) =>
    allRows.some((r) => r.id === id && r.partKind === "invitee"),
  ).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          /* Dialog default memakai `sm:max-w-sm` (~384px); harus ditimpa supaya lebar 800px terpakai. */
          className="flex h-[500px] max-h-[85vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]"
        >
          <DialogHeader className="shrink-0 space-y-1 border-b border-zinc-100 px-6 py-4 text-left">
            <DialogTitle className="text-lg leading-snug">
              Peserta rapat
            </DialogTitle>
            <DialogDescription className="space-y-1 text-sm text-zinc-600">
              <span className="block line-clamp-2 font-medium text-zinc-800">
                {localMeeting.title}
              </span>
              <span className="block tabular-nums text-zinc-500">
                Total peserta rapat:{" "}
                <span className="font-semibold text-zinc-800">
                  {totalCount}
                </span>
                {shownCount !== totalCount ? (
                  <span className="text-zinc-400">
                    {" "}
                    · menampilkan {shownCount} sesuai pencarian/filter
                  </span>
                ) : null}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-4 pt-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <Input
                  aria-label="Cari nama peserta"
                  placeholder="Cari nama…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  className="h-10 pl-9"
                />
              </div>
              {canRemoveParticipants && removableFilteredIds.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 sm:h-10"
                  onClick={toggleSelectAllRemovable}
                >
                  Pilih semua
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="shrink-0 gap-2 sm:h-10"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen(true)}
              >
                <ListFilter
                  className="h-4 w-4 shrink-0 text-zinc-600"
                  aria-hidden
                />
                Filter
                {activeFilterCount > 0 ? (
                  <span className="inline-flex min-w-[1.25rem] justify-center rounded-md bg-blue-600 px-1.5 text-[11px] font-semibold text-white tabular-nums">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </div>

            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-100 bg-zinc-50/40",
              )}
              role="list"
              aria-label="Daftar peserta"
            >
              {filteredRows.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">
                  Tidak ada peserta yang cocok dengan pencarian atau filter ini.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {filteredRows.map((r) => (
                    <li
                      key={r.id}
                      role="listitem"
                      className="flex items-center gap-3 bg-white px-3 py-3 first:rounded-t-[inherit] last:rounded-b-[inherit]"
                    >
                      {canRemoveParticipants && r.partKind === "invitee" ? (
                        <Checkbox
                          aria-label={`Pilih ${r.name} untuk dihapus`}
                          checked={selectedIds.has(r.id)}
                          onCheckedChange={(checked) =>
                            toggleSelected(r.id, checked === true)
                          }
                          disabled={removeParticipants.isPending}
                          className="shrink-0"
                        />
                      ) : null}
                      <UserProfileTrigger userId={r.id} className="shrink-0">
                        <Avatar className="size-9 border border-zinc-200">
                          <AvatarImage src={r.image ?? undefined} alt="" />
                          <AvatarFallback className="text-[10px]">
                            {initialsFromName(r.name)}
                          </AvatarFallback>
                        </Avatar>
                      </UserProfileTrigger>
                      <div className="min-w-0 flex-1 space-y-1">
                        <UserProfileTrigger userId={r.id} className="block max-w-full rounded-sm">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {r.name}
                          </p>
                        </UserProfileTrigger>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={memberRoleBadgeVariant(r.role)}
                            className="font-normal capitalize"
                          >
                            {memberRoleLabel(r.role)}
                          </Badge>
                          <Badge variant="outline" className="font-normal">
                            {r.partKind === "creator"
                              ? "Pembuat rapat"
                              : "Diundang"}
                          </Badge>
                          {r.clientId ? (
                            <Badge variant="secondary" className="font-normal">
                              Klien
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="font-normal">
                              Internal
                            </Badge>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {canRemoveParticipants && removableSelectedCount > 0 ? (
            <DialogFooter className="shrink-0 border-t border-zinc-100 px-6 py-3">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1.5"
                disabled={removeParticipants.isPending}
                onClick={() => {
                  const ids = [...selectedIds].filter((id) =>
                    allRows.some(
                      (r) => r.id === id && r.partKind === "invitee",
                    ),
                  );
                  if (ids.length > 0) removeParticipants.mutate(ids);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Peserta
                {removableSelectedCount > 1
                  ? ` (${removableSelectedCount})`
                  : null}
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent
          showCloseButton
          className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Filter peserta</DialogTitle>
            <DialogDescription>
              Sempitkan daftar berdasarkan peran, peran dalam rapat, atau tipe
              akun.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="space-y-2">
              <Label>Peran pengguna</Label>
              <Select
                value={filterRole}
                onValueChange={(v) => setFilterRole(v ?? "__all")}
                items={[
                  { value: "__all", label: "Semua" },
                  ...roleOptions.map((role) => ({
                    value: role,
                    label: memberRoleLabel(role),
                  })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Semua</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {memberRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Peran dalam rapat</Label>
              <Select
                value={filterKind}
                onValueChange={(v) => {
                  if (
                    v === "__all" ||
                    v === "creator" ||
                    v === "invitee"
                  ) {
                    setFilterKind(v);
                  }
                }}
                items={[
                  { value: "__all", label: "Semua" },
                  { value: "creator", label: "Pembuat rapat saja" },
                  { value: "invitee", label: "Yang diundang saja" },
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Peran dalam rapat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Semua</SelectItem>
                  <SelectItem value="creator">Pembuat rapat saja</SelectItem>
                  <SelectItem value="invitee">Yang diundang saja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipe akun</Label>
              <Select
                value={filterAccount}
                onValueChange={(v) => {
                  if (v === "__all" || v === "internal" || v === "client") {
                    setFilterAccount(v);
                  }
                }}
                items={[
                  { value: "__all", label: "Semua" },
                  { value: "internal", label: "Internal saja" },
                  { value: "client", label: "Klien saja" },
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipe akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Semua</SelectItem>
                  <SelectItem value="internal">Internal saja</SelectItem>
                  <SelectItem value="client">Klien saja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="-mx-4 flex-row flex-wrap gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={activeFilterCount === 0}
              onClick={() => {
                setFilterRole("__all");
                setFilterKind("__all");
                setFilterAccount("__all");
              }}
            >
              Reset filter
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setFilterOpen(false)}
            >
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
