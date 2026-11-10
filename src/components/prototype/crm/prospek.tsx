"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Target } from "lucide-react";
import { toast } from "sonner";
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
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_LIST_PAGE_SIZE,
  type ListPageSize,
} from "@/lib/list-pagination";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canCreateProspek,
  formatCurrency,
  formatDate,
  prospekPitchingsFor,
  userById,
  visibleProspeks,
} from "@/lib/prototype/domain";
import type { Prospek, ProspekStatus } from "@/lib/prototype/types";
import {
  EmptyState,
  Field,
  NativeSelect,
  PageHeader,
  StatCard,
} from "../ui";
import { useViewPreference, ViewToggle } from "../view-toggle";

const STATUS_LABEL: Record<ProspekStatus, string> = {
  active: "Aktif",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_CLASS: Record<ProspekStatus, string> = {
  active: "bg-sky-100 text-sky-700 ring-sky-200",
  completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function ProspekStatusBadge({ status }: { status: ProspekStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function ProspekCard({ prospek }: { prospek: Prospek }) {
  const store = usePrototypeStore();
  const pitchings = prospekPitchingsFor(store, prospek.id);
  const won = pitchings.filter((pitching) => pitching.status === "won").length;
  const pic = userById(store, prospek.picId);

  return (
    <Link
      href={`/crm/prospek/${prospek.id}`}
      className="bg-card hover:border-primary/40 flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            {prospek.code}
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold">{prospek.name}</h3>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {prospek.client}
          </p>
        </div>
        <ProspekStatusBadge status={prospek.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="text-muted-foreground">PIC</p>
          <p className="truncate font-medium">{pic?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Pagu</p>
          <p className="font-medium">{formatCurrency(prospek.pagu)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground">Periode</p>
          <p className="font-medium">
            {formatDate(prospek.periodStart)} – {formatDate(prospek.periodEnd)}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t pt-2 text-[11px]">
        <span className="text-muted-foreground">
          {pitchings.length} Pitching · {won} menang
        </span>
        <span className="text-primary font-medium">Buka →</span>
      </div>
    </Link>
  );
}

export function CrmProspek() {
  const store = usePrototypeStore();
  const router = useRouter();
  const currentUser = userById(store, store.currentUserId);
  const [statusFilter, setStatusFilter] = useState<"all" | ProspekStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ListPageSize>(DEFAULT_LIST_PAGE_SIZE);
  const [view, setView] = useViewPreference("crm-prospek");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    picId: "",
    client: "",
    periodStart: "",
    periodEnd: "",
    pagu: "",
  });

  const prospeks = useMemo(() => {
    if (!currentUser) return [];
    return visibleProspeks(store, currentUser).filter((prospek) => {
      if (statusFilter !== "all" && prospek.status !== statusFilter) return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [prospek.name, prospek.code, prospek.client]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [store, currentUser, statusFilter, search]);

  const allVisible = currentUser ? visibleProspeks(store, currentUser) : [];
  const pitchingCount = allVisible.reduce(
    (sum, prospek) => sum + prospekPitchingsFor(store, prospek.id).length,
    0,
  );
  const wonCount = allVisible.reduce(
    (sum, prospek) =>
      sum +
      prospekPitchingsFor(store, prospek.id).filter(
        (pitching) => pitching.status === "won",
      ).length,
    0,
  );
  const activeCount = allVisible.filter(
    (prospek) => prospek.status === "active",
  ).length;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, statusFilter, pageSize]);

  const pages = Math.max(1, Math.ceil(prospeks.length / pageSize));
  const safePage = Math.min(page, pages);
  const paged = prospeks.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetDraft = () =>
    setDraft({
      name: "",
      description: "",
      picId: "",
      client: "",
      periodStart: "",
      periodEnd: "",
      pagu: "",
    });

  const save = () => {
    if (!draft.name.trim() || !draft.client.trim()) {
      toast.error("Nama Prospek dan client wajib diisi.");
      return;
    }
    if (
      draft.periodStart &&
      draft.periodEnd &&
      draft.periodEnd < draft.periodStart
    ) {
      toast.error("Periode selesai tidak boleh lebih awal dari periode mulai.");
      return;
    }
    setSaving(true);
    const id = store.createProspek({
      name: draft.name,
      description: draft.description,
      picId: draft.picId,
      client: draft.client,
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      pagu: Number(draft.pagu) || 0,
    });
    setSaving(false);
    if (!id) {
      toast.error("Gagal membuat Prospek.");
      return;
    }
    toast.success("Prospek dibuat.");
    setOpen(false);
    resetDraft();
    router.push(`/crm/prospek/${id}`);
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prospek"
        description="Umbrella project untuk menampung Pitching, RAB, Quotation, dan kontrak sebelum proyek berjalan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            {canCreateProspek(currentUser) ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> Prospek baru
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Prospek" value={allVisible.length} sub="Terlihat oleh Anda" icon={Target} />
        <StatCard label="Aktif" value={activeCount} sub="Masih berjalan" icon={Target} accent="from-sky-500 to-blue-600" />
        <StatCard label="Pitching" value={pitchingCount} sub="Seluruh Pitching" icon={Target} accent="from-amber-500 to-orange-600" />
        <StatCard label="Menang" value={wonCount} sub="Pitching menang" icon={Target} accent="from-emerald-500 to-green-600" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, kode, atau client"
            className="pl-8"
          />
        </div>
        <NativeSelect
          value={statusFilter}
          onChange={(value) =>
            setStatusFilter(value as "all" | ProspekStatus)
          }
          className="w-[180px]"
        >
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </NativeSelect>
      </div>

      {prospeks.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Belum ada Prospek"
          description={
            canCreateProspek(currentUser)
              ? "Buat Prospek pertama untuk mulai mengelola Pitching."
              : "Belum ada Prospek yang terkait dengan pekerjaan Anda."
          }
          action={
            canCreateProspek(currentUser) ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> Prospek baru
              </Button>
            ) : undefined
          }
        />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Prospek</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">PIC</th>
                <th className="px-3 py-2">Periode</th>
                <th className="px-3 py-2">Pagu</th>
                <th className="px-3 py-2">Pitching</th>
                <th className="px-3 py-2">Menang</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((prospek) => {
                const pitchings = prospekPitchingsFor(store, prospek.id);
                const won = pitchings.filter(
                  (pitching) => pitching.status === "won",
                ).length;
                return (
                  <tr
                    key={prospek.id}
                    className="hover:bg-muted/40 cursor-pointer border-b last:border-0"
                    onClick={() => router.push(`/crm/prospek/${prospek.id}`)}
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium">{prospek.name}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {prospek.code}
                      </p>
                    </td>
                    <td className="px-3 py-2">{prospek.client || "—"}</td>
                    <td className="px-3 py-2">
                      {userById(store, prospek.picId)?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(prospek.periodStart)} –{" "}
                      {formatDate(prospek.periodEnd)}
                    </td>
                    <td className="px-3 py-2">{formatCurrency(prospek.pagu)}</td>
                    <td className="px-3 py-2">{pitchings.length}</td>
                    <td className="px-3 py-2">{won}</td>
                    <td className="px-3 py-2">
                      <ProspekStatusBadge status={prospek.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paged.map((prospek) => (
            <ProspekCard key={prospek.id} prospek={prospek} />
          ))}
        </div>
      )}

      <ListPaginationBar
        total={prospeks.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        disabled={prospeks.length === 0}
      />

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) resetDraft();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prospek baru</DialogTitle>
            <DialogDescription>
              Isi detail peluang. Pitching ditambahkan setelah Prospek dibuat.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama Prospek" className="sm:col-span-2">
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Contoh: Peluncuran Produk Nusantara"
              />
            </Field>
            <Field label="Client">
              <Input
                value={draft.client}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, client: event.target.value }))
                }
              />
            </Field>
            <Field label="PIC">
              <NativeSelect
                value={draft.picId}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, picId: value }))
                }
              >
                <option value="">Belum ditetapkan</option>
                {store.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Periode mulai">
              <Input
                type="date"
                value={draft.periodStart}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    periodStart: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Periode selesai">
              <Input
                type="date"
                value={draft.periodEnd}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    periodEnd: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Pagu" hint="Peringatan saja, bukan batas keras.">
              <Input
                type="number"
                min={0}
                value={draft.pagu}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, pagu: event.target.value }))
                }
                placeholder="0"
              />
            </Field>
            <Field label="Deskripsi" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Ringkasan peluang"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button disabled={saving} onClick={save}>
              {saving ? "Menyimpan…" : "Buat Prospek"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
