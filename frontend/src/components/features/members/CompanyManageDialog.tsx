"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import { api } from "@/lib/api/client";

type CompanyRow = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CompanyManageDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CompanyRow | null>(null);

  const listQ = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await api.get<CompanyRow[]>("/api/companies");
      return res.data;
    },
    enabled: open,
  });

  function invalidateAll() {
    void qc.invalidateQueries({ queryKey: ["companies"] });
    void qc.invalidateQueries({ queryKey: ["companies", "names"] });
    void qc.invalidateQueries({ queryKey: ["users", "meta", "company-options"] });
  }

  const createM = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<CompanyRow>("/api/companies", { name });
      return res.data;
    },
    onSuccess: () => {
      setNewName("");
      invalidateAll();
      toast.success("Company ditambahkan");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { message?: string | string[] } } })
              .response?.data?.message ?? "Gagal menambahkan company")
          : "Gagal menambahkan company";
      toast.error(Array.isArray(msg) ? msg.join(", ") : String(msg));
    },
  });

  const updateM = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await api.patch<CompanyRow>(`/api/companies/${id}`, { name });
      return res.data;
    },
    onSuccess: () => {
      setEditId(null);
      setEditName("");
      invalidateAll();
      toast.success("Company diperbarui");
    },
    onError: () => toast.error("Gagal memperbarui company"),
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/companies/${id}`);
    },
    onSuccess: () => {
      setDeleteTarget(null);
      invalidateAll();
      toast.success("Company dihapus");
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { message?: string | string[] } } })
              .response?.data?.message ?? "Gagal menghapus company")
          : "Gagal menghapus company";
      toast.error(Array.isArray(msg) ? msg.join(", ") : String(msg));
    },
  });

  const rows = listQ.data ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          className="flex max-h-[min(90vh,640px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <DialogHeader className="border-border shrink-0 space-y-2 border-b px-6 pt-6 pb-5">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Building2 className="size-5" />
              Kelola Company
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pb-0.5 text-sm leading-relaxed">
              Daftar company untuk member non-client. Perubahan di sini juga
              memperbarui dropdown template import (gabungan dengan Client).
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-6 pt-5 pb-6">
            <div className="space-y-2">
              <Label htmlFor="company-new">Tambah company</Label>
              <div className="flex gap-2">
                <Input
                  id="company-new"
                  placeholder="Nama company…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim()) {
                      e.preventDefault();
                      createM.mutate(newName.trim());
                    }
                  }}
                />
                <Button
                  type="button"
                  className="shrink-0 gap-1.5"
                  disabled={!newName.trim() || createM.isPending}
                  onClick={() => createM.mutate(newName.trim())}
                >
                  <Plus className="size-4" />
                  Tambah
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
              {listQ.isLoading ? (
                <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                  Memuat…
                </p>
              ) : rows.length === 0 ? (
                <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                  Belum ada company. Tambahkan company di atas.
                </p>
              ) : (
                <ul className="divide-y">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center gap-2 px-3 py-2.5"
                    >
                      {editId === row.id ? (
                        <>
                          <Input
                            className="h-8 flex-1"
                            value={editName}
                            autoFocus
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editName.trim()) {
                                e.preventDefault();
                                updateM.mutate({
                                  id: row.id,
                                  name: editName.trim(),
                                });
                              }
                              if (e.key === "Escape") {
                                setEditId(null);
                                setEditName("");
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={!editName.trim() || updateM.isPending}
                            onClick={() =>
                              updateM.mutate({
                                id: row.id,
                                name: editName.trim(),
                              })
                            }
                          >
                            Simpan
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditId(null);
                              setEditName("");
                            }}
                          >
                            Batal
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {row.name}
                          </span>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Edit company"
                            onClick={() => {
                              setEditId(row.id);
                              setEditName(row.name);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            aria-label="Hapus company"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter className="border-border bg-muted/30 mx-0 mb-0 shrink-0 border-t px-6 pt-5 pb-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-10 w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus company</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus <strong>{deleteTarget?.name}</strong> dari daftar? Company
              yang masih dipakai member tidak bisa dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteTarget && deleteM.mutate(deleteTarget.id)
              }
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
