"use client";

import { Info, MapPin, WalletCards } from "lucide-react";
import { useProjectDetail } from "../../project-detail-context";
import type { RabWorkItem } from "../types";
import { formatCurrency } from "./rab-format";
import type { ProjectInfoItem } from "./rab-data";

export const RabProjectOverview = ({ workItems }: { workItems: RabWorkItem[] }) => {
  const { project } = useProjectDetail();
  const totalConverted = workItems.reduce(
    (sum, item) => sum + (item.rabAmount ?? 0),
    0,
  );
  const projectInfo: ProjectInfoItem[] = [
    { label: "Nama Proyek", value: project.name || "-" },
    { label: "Klien", value: project.client?.companyName || "-" },
    { label: "PIC", value: project.createdBy?.name || "-" },
    {
      label: "Lokasi",
      value: project.client?.address || "-",
      icon: MapPin,
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-12">
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-8">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-base font-bold text-zinc-950">Informasi Proyek</h3>
        <Info className="size-4 text-zinc-400" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {projectInfo.map(({ label, value, icon: Icon }) => (
          <div key={label}>
            <p className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              {label}
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              {Icon ? <Icon className="size-4 text-zinc-400" /> : null}
              <span>{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="relative overflow-hidden rounded-2xl bg-zinc-950 p-6 text-white shadow-sm xl:col-span-4">
      <WalletCards className="absolute -right-8 -bottom-8 size-40 text-white/10" />
      <div className="relative">
        <p className="mb-2 text-xs font-semibold tracking-widest text-zinc-400 uppercase">
          Total RAB
        </p>
        <h3 className="text-2xl font-bold md:text-3xl">
          {formatCurrency(totalConverted)}
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          Total nilai dari semua item pekerjaan RAB yang dikonversi.
        </p>
      </div>
    </div>
    </div>
  );
};
