import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  Lock,
  Mail,
  Paperclip,
  PauseCircle,
  UserRound,
} from "lucide-react";

export type ApprovalStatus = "approved" | "waiting" | "queued";

export type LetterAttachment = {
  id: string;
  name: string;
  label: string;
  size: string;
  icon: LucideIcon;
  className: string;
};

export type ApprovalStep = {
  id: string;
  name: string;
  role: string;
  status: ApprovalStatus;
};

export type ActivityLog = {
  id: string;
  title: string;
  meta: string;
  note?: string;
};

export type QuickNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const LETTER_DETAIL = {
  id: "01-hcmm-int-vii-2026",
  number: "REG/2023/X/0042",
  status: "Menunggu Persetujuan",
  statusClassName: "border-amber-200 bg-amber-50 text-amber-700",
  title: "Permohonan Pengadaan Perangkat IT Tahap II",
  description:
    "Surat diajukan untuk pembaruan workstation di departemen kreatif guna mendukung kinerja rendering video.",
  classification: "Surat Keputusan Internal",
  security: "Rahasia",
  senderUnit: "Biro Umum & IT",
  recipient: "Direktur Utama",
  cc: "Sekretaris Perusahaan, Kadiv Keuangan, Internal Audit",
  summary:
    "Sehubungan dengan meningkatnya kebutuhan pemrosesan data multimedia pada departemen kreatif, workstation yang ada saat ini sudah tidak lagi memadai. Pengadaan ini mencakup 5 unit komputer spesifikasi tinggi dengan GPU kelas profesional. Estimasi anggaran telah disetujui secara verbal oleh Kadiv Keuangan pada rapat koordinasi minggu lalu.",
  previewFileName: "REG-2023-X-0042.pdf",
  previewLastSeen: "Terakhir dilihat: 2 jam lalu",
  createdBy: "John Doe (Administrator)",
  createdAt: "22 Oktober 2023, 09:00",
  updatedAt: "24 Oktober 2023, 14:20",
  transactionId: "#TX-99821-X",
};

export const LETTER_DETAIL_ATTACHMENTS: LetterAttachment[] = [
  {
    id: "main-document",
    name: "Draft_Surat_Pengadaan_V2.pdf",
    label: "Dokumen Utama",
    size: "1.2 MB",
    icon: FileText,
    className: "text-red-600",
  },
  {
    id: "budget-attachment",
    name: "RAB_IT_Tahap_2.xlsx",
    label: "Lampiran Anggaran",
    size: "450 KB",
    icon: FileSpreadsheet,
    className: "text-emerald-600",
  },
];

export const LETTER_DETAIL_APPROVAL_STEPS: ApprovalStep[] = [
  {
    id: "reviewer",
    name: "Bambang Wijaya",
    role: "Kabid IT (Reviewer)",
    status: "approved",
  },
  {
    id: "approver",
    name: "Siti Aminah",
    role: "Kadiv Umum (Approver)",
    status: "waiting",
  },
  {
    id: "director",
    name: "Agung Hartanto",
    role: "Direktur Operasional",
    status: "queued",
  },
];

export const LETTER_DETAIL_ACTIVITIES: ActivityLog[] = [
  {
    id: "finalized",
    title: "Finalisasi Draf",
    meta: "Oleh John Doe - 24 Okt 2023, 14:20",
    note: "Status surat diubah menjadi Final. Menunggu tanda tangan digital.",
  },
  {
    id: "submitted",
    title: "Diajukan ke Kadiv",
    meta: "Oleh John Doe - 23 Okt 2023, 10:15",
  },
  {
    id: "attachment-uploaded",
    title: "Lampiran Diunggah",
    meta: "File: RAB_IT_Tahap_2.xlsx - 22 Okt 2023, 16:45",
  },
  {
    id: "created",
    title: "Surat Dibuat",
    meta: "Draft awal disimpan oleh John Doe - 22 Okt 2023, 09:00",
  },
];

export const LETTER_DETAIL_QUICK_NAV: QuickNavItem[] = [
  {
    id: "informasi-surat",
    label: "Informasi Surat",
    href: "#informasi-surat",
    icon: Info,
  },
  {
    id: "dokumen",
    label: "Dokumen Lampiran",
    href: "#dokumen",
    icon: Paperclip,
  },
  {
    id: "approval",
    label: "Alur Approval",
    href: "#approval",
    icon: CheckCircle2,
  },
  {
    id: "riwayat",
    label: "Riwayat Aktivitas",
    href: "#riwayat",
    icon: History,
  },
];

export const approvalStatusMeta: Record<
  ApprovalStatus,
  {
    label: string;
    containerClassName: string;
    iconClassName: string;
    icon: LucideIcon;
  }
> = {
  approved: {
    label: "DISETUJUI",
    containerClassName: "border-emerald-200 bg-emerald-50 text-emerald-900",
    iconClassName: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  waiting: {
    label: "MENUNGGU",
    containerClassName: "border-primary/40 bg-primary/5 text-foreground",
    iconClassName: "bg-amber-100 text-amber-700",
    icon: PauseCircle,
  },
  queued: {
    label: "ANTRIAN",
    containerClassName: "border-border bg-card text-muted-foreground opacity-60",
    iconClassName: "bg-muted text-muted-foreground",
    icon: Circle,
  },
};

export const LETTER_DETAIL_SYSTEM_ITEMS = [
  {
    id: "created-by",
    label: "Dibuat oleh",
    value: LETTER_DETAIL.createdBy,
    icon: UserRound,
  },
  {
    id: "created-at",
    label: "Tanggal Dibuat",
    value: LETTER_DETAIL.createdAt,
    icon: CalendarDays,
  },
  {
    id: "updated-at",
    label: "Terakhir Diubah",
    value: LETTER_DETAIL.updatedAt,
    icon: History,
  },
];

export const FINALIZATION_ICON = Lock;
export const NOTICE_ICON = Mail;
