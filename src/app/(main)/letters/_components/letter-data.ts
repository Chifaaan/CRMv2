import {
  CalendarDays,
  Clock3,
  FileArchive,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type LetterStatus = "approved" | "waiting" | "draft" | "rejected";
export type LetterSecurity = "normal" | "secret" | "top-secret";

export type LetterRow = {
  id: string;
  number: string;
  date: string;
  subject: string;
  division: string;
  classification: string;
  security: LetterSecurity;
  type: string;
  requester: string;
  recipient: string;
  status: LetterStatus;
};

export type LetterSummary = {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  className: string;
};

export const LETTER_SUMMARIES: LetterSummary[] = [
  {
    id: "total",
    label: "TOTAL SURAT",
    value: "1,248",
    icon: FileArchive,
    className: "bg-primary/10 text-primary",
  },
  {
    id: "draft",
    label: "DRAFT",
    value: "12",
    icon: FileText,
    className: "bg-sky-100 text-sky-700",
  },
  {
    id: "waiting",
    label: "MENUNGGU APPROVAL",
    value: "5",
    icon: Clock3,
    className: "bg-orange-100 text-orange-700",
  },
  {
    id: "monthly",
    label: "BULAN INI",
    value: "87",
    icon: CalendarDays,
    className: "bg-emerald-100 text-emerald-700",
  },
];

export const LETTER_DIVISION_OPTIONS = [
  "Semua Divisi",
  "HCMM",
  "Finance",
  "IT Ops",
] as const;

export const LETTER_CATEGORY_OPTIONS = [
  "Kategori",
  "Internal",
  "Eksternal",
  "Rahasia",
] as const;

export const LETTER_STATUS_OPTIONS = [
  "Status",
  "Draft",
  "Approved",
  "Rejected",
] as const;

export const LETTER_ACTIVE_FILTERS = ["Divisi: HCMM", "Status: Approved"];

export const LETTER_ROWS: LetterRow[] = [
  {
    id: "01-hcmm-int-vii-2026",
    number: "01/HCMM/INT/VII/2026",
    date: "12 Jul 2026",
    subject: "Pengajuan Cuti Massal Idul Fitri 1447H",
    division: "HCMM",
    classification: "Surat Keputusan",
    security: "normal",
    type: "Internal",
    requester: "Budi Setiawan",
    recipient: "Seluruh Karyawan",
    status: "approved",
  },
  {
    id: "42-fin-ext-vi-2026",
    number: "42/FIN/EXT/VI/2026",
    date: "08 Jul 2026",
    subject: "Tagihan Vendor PT Maju Jaya Makmur",
    division: "Finance",
    classification: "Nota Dinas",
    security: "secret",
    type: "Eksternal",
    requester: "Anita Wijaya",
    recipient: "PT Maju Jaya",
    status: "waiting",
  },
  {
    id: "15-it-int-vii-2026",
    number: "15/IT/INT/VII/2026",
    date: "05 Jul 2026",
    subject: "Maintenance Server Tahunan Q3",
    division: "IT Ops",
    classification: "Nota Dinas",
    security: "normal",
    type: "Internal",
    requester: "Deni Ramadhan",
    recipient: "Management",
    status: "draft",
  },
  {
    id: "09-leg-ext-vii-2026",
    number: "09/LEG/EXT/VII/2026",
    date: "02 Jul 2026",
    subject: "Perjanjian Kerjasama Strategic Partner",
    division: "Legal",
    classification: "Undangan",
    security: "top-secret",
    type: "Rahasia",
    requester: "Siska Khol",
    recipient: "X-Corp",
    status: "rejected",
  },
];
