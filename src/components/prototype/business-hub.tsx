"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChartNoAxesCombined, FileText, ReceiptText } from "lucide-react";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  commercialProjectRows,
  formatCurrency,
  formatDate,
  roleCanAccessBusiness,
  userById,
} from "@/lib/prototype/domain";
import { BUSINESS_UNITS, PHASE_LABEL } from "@/lib/prototype/types";
import type { Project } from "@/lib/prototype/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  NativeSelect,
  PageHeader,
} from "./ui";

type BusinessTab = "dashboard" | "rab" | "mo";

const TABS: { key: BusinessTab; href: string; label: string }[] = [
  { key: "dashboard", href: "/business", label: "Business Dashboard" },
  { key: "rab", href: "/business/rab", label: "RAB" },
  { key: "mo", href: "/business/mo", label: "MO" },
];

export function BusinessShell({
  active,
  children,
}: {
  active: BusinessTab;
  children: React.ReactNode;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);

  if (!currentUser || !roleCanAccessBusiness(currentUser.role)) {
    return (
      <EmptyState
        icon={ChartNoAxesCombined}
        title="Akses ditolak"
        description="Business hanya untuk Admin, Manager, PM, Finance, dan BOD."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              active === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}

function unitLabel(unit?: string): string {
  if (!unit) return "Belum dipetakan";
  return BUSINESS_UNITS.find((item) => item.id === unit)?.label ?? unit;
}

function CommercialDetailDialog({
  project,
  tab,
  open,
  onOpenChange,
}: {
  project: Project;
  tab: "rab" | "mo";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const store = usePrototypeStore();
  const rab = store.forms.find(
    (form) => form.projectId === project.id && form.type === "rab",
  );
  const rabItems =
    (rab?.payload as { items?: { id: string; description: string; qty: number; unit: string; unitPrice: number; businessUnitId?: string }[] })
      ?.items ?? [];
  const orders = store.mediaOrders.filter(
    (order) => order.projectId === project.id && order.status !== "cancelled",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {tab === "rab" ? "Detail RAB" : "Detail Media Order"}
          </DialogTitle>
          <DialogDescription>
            {project.code} · {project.name} · read-only
          </DialogDescription>
        </DialogHeader>
        {tab === "rab" ? (
          rabItems.length === 0 ? (
            <p className="text-muted-foreground text-xs">Belum ada item RAB.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase">
                  <tr>
                    <th className="px-2 py-1.5">Item</th>
                    <th className="px-2 py-1.5">Qty</th>
                    <th className="px-2 py-1.5">Harga</th>
                    <th className="px-2 py-1.5">Unit bisnis</th>
                  </tr>
                </thead>
                <tbody>
                  {rabItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-2 py-1.5">{item.description || "—"}</td>
                      <td className="px-2 py-1.5">
                        {item.qty} {item.unit}
                      </td>
                      <td className="px-2 py-1.5">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-2 py-1.5">{unitLabel(item.businessUnitId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : orders.length === 0 ? (
          <p className="text-muted-foreground text-xs">Belum ada Media Order.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border p-2">
                <p className="text-xs font-semibold">
                  {order.title} · {order.number}
                </p>
                <div className="mt-1 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[11px]">
                    <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase">
                      <tr>
                        <th className="px-2 py-1">Item</th>
                        <th className="px-2 py-1">Qty</th>
                        <th className="px-2 py-1">Harga klien</th>
                        <th className="px-2 py-1">Biaya vendor</th>
                        <th className="px-2 py-1">Unit bisnis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-2 py-1">{item.description || "—"}</td>
                          <td className="px-2 py-1">
                            {item.qty} {item.unit}
                          </td>
                          <td className="px-2 py-1">
                            {formatCurrency(item.clientUnitPrice)}
                          </td>
                          <td className="px-2 py-1">
                            {formatCurrency(item.vendorUnitCost)}
                          </td>
                          <td className="px-2 py-1">
                            {unitLabel(item.businessUnitId)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UmbrellaFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const store = usePrototypeStore();
  return (
    <NativeSelect value={value} onChange={onChange} className="h-9 w-56 text-xs">
      <option value="">Semua umbrella</option>
      {store.groups.map((group) => (
        <option key={group.id} value={group.id}>
          {group.name}
        </option>
      ))}
    </NativeSelect>
  );
}

export function BusinessRabTable() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [umbrellaId, setUmbrellaId] = useState("");
  const [detailProject, setDetailProject] = useState<Project | undefined>();
  const rows = useMemo(
    () =>
      commercialProjectRows(store, "rab", currentUser, {
        umbrellaId: umbrellaId || undefined,
      }),
    [store, currentUser, umbrellaId],
  );
  const canOpenProject =
    currentUser?.role === "admin" ||
    currentUser?.role === "manager" ||
    currentUser?.role === "pm" ||
    currentUser?.role === "finance";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Business · RAB"
        description="Akumulatif RAB per proyek. Read-only; edit dilakukan di halaman proyek."
      />
      <UmbrellaFilter value={umbrellaId} onChange={setUmbrellaId} />
      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada data RAB"
          description="Belum ada proyek dengan RAB pada filter ini."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Proyek</th>
                <th className="px-3 py-2">Umbrella</th>
                <th className="px-3 py-2">Fase / Status</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Total RAB</th>
                <th className="px-3 py-2">Status RAB</th>
                <th className="px-3 py-2">Update</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.project.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.project.name}</p>
                    <p className="text-muted-foreground text-[10px]">
                      {row.project.code}
                    </p>
                  </td>
                  <td className="px-3 py-2">{row.umbrellaName ?? "—"}</td>
                  <td className="px-3 py-2">
                    {row.status === "active"
                      ? row.phase
                        ? PHASE_LABEL[row.phase]
                        : "—"
                      : row.status}
                  </td>
                  <td className="px-3 py-2">
                    {row.rabItems}
                    {row.unmappedRab > 0 ? (
                      <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-800">
                        {row.unmappedRab} unmapped
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {formatCurrency(row.rabTotal)}
                  </td>
                  <td className="px-3 py-2 capitalize">{row.rabStatus ?? "—"}</td>
                  <td className="px-3 py-2">{formatDate(row.updatedAt)}</td>
                  <td className="px-3 py-2">
                    {canOpenProject ? (
                      <Link
                        href={`/crm/projects/${row.project.id}/forms/rab?from=business`}
                      >
                        <Button size="xs" variant="outline">
                          Detail
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setDetailProject(row.project)}
                      >
                        Detail
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detailProject ? (
        <CommercialDetailDialog
          project={detailProject}
          tab="rab"
          open={Boolean(detailProject)}
          onOpenChange={(open) => {
            if (!open) setDetailProject(undefined);
          }}
        />
      ) : null}
    </div>
  );
}

export function BusinessMoTable() {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [umbrellaId, setUmbrellaId] = useState("");
  const [detailProject, setDetailProject] = useState<Project | undefined>();
  const rows = useMemo(
    () =>
      commercialProjectRows(store, "mo", currentUser, {
        umbrellaId: umbrellaId || undefined,
      }),
    [store, currentUser, umbrellaId],
  );
  const canOpenProject =
    currentUser?.role === "admin" ||
    currentUser?.role === "manager" ||
    currentUser?.role === "pm" ||
    currentUser?.role === "finance";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Business · MO"
        description="Revenue, biaya vendor, dan margin Media Order per proyek. Read-only."
      />
      <UmbrellaFilter value={umbrellaId} onChange={setUmbrellaId} />
      {rows.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Belum ada data Media Order"
          description="Belum ada proyek dengan MO non-cancelled pada filter ini."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[1060px] text-left text-xs">
            <thead className="text-muted-foreground border-b bg-muted/30 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2">Proyek</th>
                <th className="px-3 py-2">Umbrella</th>
                <th className="px-3 py-2">Fase / Status</th>
                <th className="px-3 py-2">MO</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Revenue</th>
                <th className="px-3 py-2">Cost</th>
                <th className="px-3 py-2">Margin</th>
                <th className="px-3 py-2">Mapping</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.project.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.project.name}</p>
                    <p className="text-muted-foreground text-[10px]">
                      {row.project.code}
                    </p>
                  </td>
                  <td className="px-3 py-2">{row.umbrellaName ?? "—"}</td>
                  <td className="px-3 py-2">
                    {row.status === "active"
                      ? row.phase
                        ? PHASE_LABEL[row.phase]
                        : "—"
                      : row.status}
                  </td>
                  <td className="px-3 py-2">{row.moDocuments}</td>
                  <td className="px-3 py-2">{row.moItems}</td>
                  <td className="px-3 py-2">{formatCurrency(row.moRevenue)}</td>
                  <td className="px-3 py-2">{formatCurrency(row.moCost)}</td>
                  <td
                    className={
                      row.moMargin < 0
                        ? "px-3 py-2 font-semibold text-rose-600"
                        : "px-3 py-2 font-semibold text-emerald-700"
                    }
                  >
                    {formatCurrency(row.moMargin)} (
                    {Math.round(row.moMarginPercent)}%)
                  </td>
                  <td className="px-3 py-2">
                    {row.unmappedMo > 0 ? (
                      <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-800">
                        {row.unmappedMo} unmapped
                      </span>
                    ) : (
                      "Lengkap"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {canOpenProject ? (
                      <Link
                        href={`/crm/projects/${row.project.id}/forms/mo?from=business`}
                      >
                        <Button size="xs" variant="outline">
                          Detail
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setDetailProject(row.project)}
                      >
                        Detail
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detailProject ? (
        <CommercialDetailDialog
          project={detailProject}
          tab="mo"
          open={Boolean(detailProject)}
          onOpenChange={(open) => {
            if (!open) setDetailProject(undefined);
          }}
        />
      ) : null}
    </div>
  );
}
