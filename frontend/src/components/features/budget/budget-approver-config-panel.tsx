"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api/client";
import type { BudgetApproverRow } from "@/lib/budget-types";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/list-pagination";
import { cn } from "@/lib/utils";

type AdminUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function BudgetApproverConfigPanel() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState("");
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: approversData, isLoading } = useQuery({
    queryKey: ["budget", "approvers", page],
    queryFn: async () => {
      const res = await api.get<{
        items: BudgetApproverRow[];
        meta: { total: number; page: number; take: number; pages: number };
      }>(`/api/budget/approvers?page=${page}&take=${DEFAULT_LIST_PAGE_SIZE}`);
      return res.data;
    },
  });

  const approvers = approversData?.items ?? [];
  const registeredUserIds = useMemo(
    () => new Set(approvers.map((a) => a.userId)),
    [approvers],
  );

  const { data: adminUsersData, isLoading: adminUsersLoading } = useQuery({
    queryKey: ["users", "admin-approver-options"],
    queryFn: async () => {
      const res = await api.get<{
        data: AdminUserOption[];
        meta: { total: number; page: number; take: number; pages: number };
      }>("/api/users", {
        params: {
          page: "1",
          take: "100",
          role: "admin",
          status: "active",
        },
      });
      return res.data;
    },
  });

  const adminUsers = adminUsersData?.data ?? [];

  const selectableUsers = useMemo(
    () => adminUsers.filter((u) => !registeredUserIds.has(u.id)),
    [adminUsers, registeredUserIds],
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return selectableUsers;
    return selectableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [selectableUsers, userSearch]);

  const selectedUser = useMemo(
    () => adminUsers.find((u) => u.id === userId) ?? null,
    [adminUsers, userId],
  );

  const addMut = useMutation({
    mutationFn: async () => {
      await api.post("/api/budget/approvers", { userId });
    },
    onSuccess: () => {
      toast.success("Approver ditambahkan.");
      setUserId("");
      setUserSearch("");
      setUserPickerOpen(false);
      void qc.invalidateQueries({ queryKey: ["budget", "approvers"] });
    },
    onError: () => toast.error("Gagal menambahkan approver."),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/budget/approvers/${id}`);
    },
    onSuccess: () => {
      toast.success("Approver dihapus.");
      void qc.invalidateQueries({ queryKey: ["budget", "approvers"] });
    },
    onError: () => toast.error("Gagal menghapus approver."),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label>User approver (admin)</Label>
          <Popover
            open={userPickerOpen}
            onOpenChange={(open) => {
              setUserPickerOpen(open);
              if (!open) setUserSearch("");
            }}
          >
            <PopoverTrigger
              type="button"
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-between font-normal"
                />
              }
            >
              <span
                className={cn(
                  "truncate text-left",
                  selectedUser ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {selectedUser
                  ? `${selectedUser.name} (${selectedUser.email})`
                  : "Pilih admin…"}
              </span>
              <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] p-2" align="start">
              <Input
                placeholder="Cari nama atau email admin…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="mb-2 h-9"
                autoComplete="off"
              />
              <div className="max-h-52 overflow-y-auto rounded-md border">
                {adminUsersLoading ? (
                  <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                    Memuat…
                  </p>
                ) : selectableUsers.length === 0 ? (
                  <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                    Semua admin sudah terdaftar sebagai approver.
                  </p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                    Tidak ada admin yang cocok.
                  </p>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={cn(
                        "hover:bg-muted/60 flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors",
                        userId === u.id && "bg-muted",
                      )}
                      onClick={() => {
                        setUserId(u.id);
                        setUserPickerOpen(false);
                        setUserSearch("");
                      }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{u.name}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {u.email}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0 text-[10px] uppercase">
                        admin
                      </span>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Button
          type="button"
          disabled={!userId || addMut.isPending}
          onClick={() => addMut.mutate()}
        >
          Tambah approver
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  Memuat…
                </TableCell>
              </TableRow>
            ) : approvers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  Belum ada approver terdaftar.
                </TableCell>
              </TableRow>
            ) : (
              approvers.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.user.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {a.user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus approver"
                      onClick={() => removeMut.mutate(a.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {approversData?.meta && approversData.meta.total > DEFAULT_LIST_PAGE_SIZE ? (
        <ListPaginationBar
          page={approversData.meta.page}
          total={approversData.meta.total}
          pageSize={DEFAULT_LIST_PAGE_SIZE}
          onPageChange={setPage}
          onPageSizeChange={() => {}}
        />
      ) : null}
    </div>
  );
}
