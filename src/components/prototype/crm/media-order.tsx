"use client";

import { useMemo, useState } from "react";
import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  canManageProject,
  formatCurrency,
  mediaOrderLine,
  mediaOrderTotals,
  userById,
} from "@/lib/prototype/domain";
import {
  BUSINESS_UNITS,
  type MediaOrder,
  type MediaOrderItem,
  type MediaOrderStatus,
  type Project,
} from "@/lib/prototype/types";
import { EmptyState, NativeSelect, SectionCard } from "../ui";

const MO_STATUS_LABEL: Record<MediaOrderStatus, string> = {
  draft: "Draft",
  final: "Final",
  cancelled: "Dibatalkan",
};

function newItem(): Omit<MediaOrderItem, "id"> {
  return {
    description: "",
    qty: 1,
    unit: "paket",
    clientUnitPrice: 0,
    vendorUnitCost: 0,
    businessUnitId: undefined,
  };
}

function MediaOrderCard({
  order,
  readOnly,
}: {
  order: MediaOrder;
  readOnly: boolean;
}) {
  const store = usePrototypeStore();
  const totals = mediaOrderTotals(order);
  const missingUnits = order.items.filter((item) => !item.businessUnitId).length;
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold">{order.title}</h4>
            <span className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-semibold">
              {order.number}
            </span>
            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
              {MO_STATUS_LABEL[order.status]}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-[11px]">
            {order.items.length} item · Revenue {formatCurrency(totals.revenue)} ·
            Margin {formatCurrency(totals.margin)} ({Math.round(totals.marginPercent)}%)
          </p>
        </div>
        {!readOnly ? (
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              value={order.status}
              onChange={(value) =>
                store.updateMediaOrder(order.id, {
                  status: value as MediaOrderStatus,
                })
              }
              className="h-8 w-28 text-xs"
            >
              {Object.entries(MO_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                store.deleteMediaOrder(order.id);
                toast.success("Media Order dihapus.");
              }}
            >
              <Trash2 className="size-3" /> Hapus
            </Button>
          </div>
        ) : null}
      </div>

      {missingUnits > 0 ? (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
          {missingUnits} item belum punya unit bisnis. Pilih unit sebelum
          menyimpan MO sebagai final.
        </p>
      ) : null}

      <div className="mt-3 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[860px] text-left text-[11px]">
          <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-2 py-1.5">Item</th>
              <th className="px-2 py-1.5">Qty</th>
              <th className="px-2 py-1.5">Satuan</th>
              <th className="px-2 py-1.5">Harga klien</th>
              <th className="px-2 py-1.5">Biaya vendor</th>
              <th className="px-2 py-1.5">Unit bisnis</th>
              <th className="px-2 py-1.5 text-right">Revenue</th>
              <th className="px-2 py-1.5 text-right">Margin</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {order.items.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-muted-foreground px-2 py-3">
                  Belum ada item.
                </td>
              </tr>
            ) : (
              order.items.map((item) => {
                const line = mediaOrderLine(item);
                return (
                  <tr key={item.id} className="border-t">
                    <td className="px-2 py-1.5">
                      {readOnly ? (
                        item.description || "—"
                      ) : (
                        <Input
                          value={item.description}
                          onChange={(event) =>
                            store.updateMediaOrderItem(order.id, item.id, {
                              description: event.target.value,
                            })
                          }
                          className="h-7 min-w-40 text-[11px]"
                          aria-label="Nama item MO"
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {readOnly ? (
                        item.qty
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          value={item.qty}
                          onChange={(event) =>
                            store.updateMediaOrderItem(order.id, item.id, {
                              qty: Number(event.target.value),
                            })
                          }
                          className="h-7 w-16 text-[11px]"
                          aria-label="Qty MO"
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {readOnly ? (
                        item.unit
                      ) : (
                        <Input
                          value={item.unit}
                          onChange={(event) =>
                            store.updateMediaOrderItem(order.id, item.id, {
                              unit: event.target.value,
                            })
                          }
                          className="h-7 w-20 text-[11px]"
                          aria-label="Satuan MO"
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {readOnly ? (
                        formatCurrency(item.clientUnitPrice)
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          value={item.clientUnitPrice}
                          onChange={(event) =>
                            store.updateMediaOrderItem(order.id, item.id, {
                              clientUnitPrice: Number(event.target.value),
                            })
                          }
                          className="h-7 w-28 text-[11px]"
                          aria-label="Harga klien"
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {readOnly ? (
                        formatCurrency(item.vendorUnitCost)
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          value={item.vendorUnitCost}
                          onChange={(event) =>
                            store.updateMediaOrderItem(order.id, item.id, {
                              vendorUnitCost: Number(event.target.value),
                            })
                          }
                          className="h-7 w-28 text-[11px]"
                          aria-label="Biaya vendor"
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {readOnly ? (
                        item.businessUnitId ? (
                          BUSINESS_UNITS.find(
                            (unit) => unit.id === item.businessUnitId,
                          )?.label
                        ) : (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                            Belum dipetakan
                          </span>
                        )
                      ) : (
                        <NativeSelect
                          value={item.businessUnitId ?? ""}
                          onChange={(value) =>
                            store.updateMediaOrderItem(order.id, item.id, {
                              businessUnitId: value
                                ? (value as MediaOrderItem["businessUnitId"])
                                : undefined,
                            })
                          }
                          className="h-7 w-32 text-[11px]"
                        >
                          <option value="">Pilih unit</option>
                          {BUSINESS_UNITS.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.label}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {formatCurrency(line.revenue)}
                    </td>
                    <td
                      className={
                        line.margin < 0
                          ? "px-2 py-1.5 text-right font-semibold text-rose-600"
                          : "px-2 py-1.5 text-right"
                      }
                    >
                      {formatCurrency(line.margin)}
                    </td>
                    <td className="px-2 py-1.5">
                      {!readOnly ? (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label="Hapus item MO"
                          onClick={() =>
                            store.removeMediaOrderItem(order.id, item.id)
                          }
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <Button
          size="xs"
          variant="outline"
          className="mt-2"
          onClick={() => store.addMediaOrderItem(order.id, newItem())}
        >
          <Plus className="size-3" /> Tambah item
        </Button>
      ) : null}
    </div>
  );
}

export function ProjectMediaOrders({
  project,
  readOnly: readOnlyOverride,
  title = "Media Order (MO)",
  description = "Revenue dan margin per unit bisnis. MO ikut ter-roll up ke umbrella proyek.",
}: {
  project: Project;
  readOnly?: boolean;
  title?: string;
  description?: string;
}) {
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [newTitle, setNewTitle] = useState("");
  const orders = useMemo(
    () =>
      store.mediaOrders
        .filter((order) => order.projectId === project.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [store.mediaOrders, project.id],
  );
  const projectReadOnly =
    project.status !== "active" ||
    project.lifecycle === "lost" ||
    project.lifecycle === "cancelled";
  const readOnly = readOnlyOverride ?? projectReadOnly;
  const canManage = Boolean(
    currentUser &&
      !readOnly &&
      !projectReadOnly &&
      (currentUser.role === "admin" ||
        currentUser.role === "manager" ||
        currentUser.role === "finance" ||
        canManageProject(currentUser, project)),
  );

  return (
    <SectionCard
      title={title}
      description={description}
      actions={
        canManage ? (
          <div className="flex items-center gap-2">
            <Input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Judul MO"
              className="h-8 w-44 text-xs"
              aria-label="Judul Media Order"
            />
            <Button
              size="sm"
              disabled={!newTitle.trim()}
              onClick={() => {
                const id = store.createMediaOrder(project.id, { title: newTitle });
                if (!id) {
                  toast.error("Media Order gagal dibuat.");
                  return;
                }
                setNewTitle("");
                toast.success("Media Order dibuat.");
              }}
            >
              <Plus className="size-3.5" /> MO
            </Button>
          </div>
        ) : null
      }
    >
      {orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Belum ada Media Order"
          description="Buat MO untuk mencatat revenue, biaya vendor, dan margin per unit bisnis."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <MediaOrderCard
              key={order.id}
              order={order}
              readOnly={!canManage}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
