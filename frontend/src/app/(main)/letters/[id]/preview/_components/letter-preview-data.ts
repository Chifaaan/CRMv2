import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  FileCheck2,
  FileText,
  PenLine,
  Printer,
  Save,
} from "lucide-react";

export type LetterPreviewAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  variant: "primary" | "outline" | "ghost";
};

export const LETTER_PREVIEW = {
  fileName: "surat_keputusan_dir_021.pdf",
  ministry: "Kementerian Administrasi Pusat",
  directorate: "Direktorat Jenderal Perencanaan Strategis",
  address: "Jalan Protokol No. 123, Jakarta Pusat, DKI Jakarta 10110",
  contact: "Telepon: (021) 555-0192 | Email: info@kemenadmin.go.id",
  number: "042/DIR-PS/SK/V/2024",
  attachment: "1 (Satu) Berkas",
  subject: "Penetapan Struktur Organisasi Baru TA 2024",
  cityDate: "Jakarta, 22 Mei 2024",
  recipient: "Yth. Seluruh Kepala Divisi",
  recipientUnit: "Lingkungan Direktorat Jenderal Perencanaan Strategis",
  recipientLocation: "di Tempat",
  paragraphs: [
    "Dengan hormat,",
    "Sehubungan dengan dilakukannya evaluasi kinerja organisasi periode semester I tahun 2024, bersama ini kami sampaikan keputusan Direktur Jenderal mengenai pemutakhiran struktur organisasi internal guna meningkatkan efisiensi operasional dan koordinasi antar unit kerja.",
    "Adapun rincian perubahan jabatan dan deskripsi tugas yang baru telah terlampir dalam dokumen teknis yang menyertai surat keputusan ini. Kami mengharapkan seluruh pimpinan unit dapat melakukan sosialisasi kepada staf di bawah koordinasinya masing-masing paling lambat akhir bulan ini.",
    "Demikian surat ini disampaikan untuk dapat dilaksanakan sebagaimana mestinya. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.",
  ],
  signatureTitle: "Hormat Kami,",
  signerName: "Budi Santoso, M.B.A.",
  signerRole: "Direktur Jenderal",
  status: "Waiting Approval",
  statusClassName: "border-amber-200 bg-amber-50 text-amber-700",
  type: "Surat Keputusan (SK)",
};

export const LETTER_PREVIEW_ACTIONS: LetterPreviewAction[] = [
  {
    id: "finalize",
    label: "Finalisasi",
    icon: CheckCircle2,
    variant: "primary",
  },
  {
    id: "approval",
    label: "Ajukan Approval",
    icon: FileCheck2,
    variant: "outline",
  },
  {
    id: "draft",
    label: "Simpan Draft",
    icon: Save,
    variant: "ghost",
  },
];

export const LETTER_PREVIEW_SECONDARY_ACTIONS = [
  {
    id: "print",
    label: "Print",
    icon: Printer,
  },
  {
    id: "pdf",
    label: "PDF",
    icon: FileText,
  },
];

export const BACK_TO_EDIT_ICON = PenLine;
