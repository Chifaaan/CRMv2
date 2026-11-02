import type { ComponentType } from "react";
import { Eye, FileText, Pencil, Table2, Trash2 } from "lucide-react";

export type RabAction = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  className: string;
};

export type RabDocument = {
  name: string;
  meta: string;
  uploadedAt: string;
  icon: ComponentType<{ className?: string }>;
  className: string;
};

export type RabItem = {
  id: string;
  name: string;
  proposal: string;
  converted: string;
  deviation: string;
};

export type RabSummaryCard = {
  label: string;
  value: string;
  className: string;
};

export type ProjectInfoItem = {
  label: string;
  value: string;
  icon?: ComponentType<{ className?: string }>;
};

export const RAB_SUMMARY: RabSummaryCard[] = [
  {
    label: "Total RAP",
    value: "Rp1.500.000.000",
    className: "border-zinc-200 bg-white text-zinc-950",
  },
  {
    label: "Total RAB",
    value: "Rp1.650.000.000",
    className: "border-blue-200 border-l-blue-600 bg-white text-zinc-950",
  },
  {
    label: "Margin",
    value: "Rp150.000.000",
    className: "border-red-100 bg-red-50 text-red-700",
  },
  {
    label: "Persentase Margin",
    value: "10%",
    className: "border-red-100 bg-red-50 text-red-700",
  },
];

export const RAB_DOCUMENTS: RabDocument[] = [
  {
    name: "RAP_Awal.pdf",
    meta: "2.4 MB - Diunggah 12 Mar 2024",
    uploadedAt: "2024-03-12",
    icon: FileText,
    className: "text-blue-600",
  },
  {
    name: "RAB_V1.xlsx",
    meta: "1.2 MB - Diunggah 14 Mar 2024",
    uploadedAt: "2024-03-14",
    icon: Table2,
    className: "text-emerald-600",
  },
];

export const RAB_WORK_ITEMS: RabItem[] = [
  {
    id: "01",
    name: "Instalasi Listrik",
    proposal: "Rp250.000.000",
    converted: "Rp275.500.000",
    deviation: "+Rp25.500.000",
  },
  {
    id: "02",
    name: "Pekerjaan Sipil",
    proposal: "Rp800.000.000",
    converted: "Rp900.000.000",
    deviation: "+Rp100.000.000",
  },
];

export const RAB_ACTIONS: RabAction[] = [
  {
    label: "Lihat item",
    icon: Eye,
    className: "text-zinc-500 hover:bg-blue-50 hover:text-blue-700",
  },
  {
    label: "Edit item",
    icon: Pencil,
    className: "text-zinc-500 hover:bg-blue-50 hover:text-blue-700",
  },
  {
    label: "Hapus item",
    icon: Trash2,
    className: "text-zinc-500 hover:bg-red-50 hover:text-red-700",
  },
];

export const RAB_TOTALS = {
  proposal: "Rp1.500.000.000",
  converted: "Rp1.650.000.000",
  deviation: "Rp150.000.000",
} as const;
