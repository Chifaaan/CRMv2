"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  MoreVertical,
  SkipBack,
  SkipForward,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  LETTER_CATEGORY_LABELS,
  LETTER_SECURITY_LABELS,
  LETTER_STATUS_LABELS,
  LETTER_TYPE_LABELS,
} from "@/lib/letter-constants";
import type { LetterList } from "../types";
import { deleteLetter } from "../action";

const securityClassName: Record<string, string> = {
  normal: "border-slate-200 bg-slate-50 text-slate-700",
  secret: "border-orange-200 bg-orange-50 text-orange-700",
  top_secret: "border-red-200 bg-red-50 text-red-700",
};

const statusClassName: Record<string, string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending_approval: "border-orange-200 bg-orange-50 text-orange-700",
  revision_requested: "border-violet-200 bg-violet-50 text-violet-700",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

const headers = [
  "Nomor Surat",
  "Tanggal",
  "Perihal",
  "Divisi",
  "Klasifikasi",
  "Keamanan",
  "Jenis",
  "Requester",
  "Penerima",
  "Status",
  "Aksi",
];

export const LetterTable = ({ list }: { list: LetterList }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const goToPage = (page: number) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("page", String(page));
    router.push(`/letters?${query.toString()}`);
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
    <Table>
      <TableHeader className="bg-muted/60">
        <TableRow>
          {headers.map((header) => (
            <TableHead
              key={header}
              className={cn(
                "px-4 py-3 text-xs uppercase tracking-[0.14em] text-muted-foreground",
                header === "Aksi" && "text-center",
              )}
            >
              {header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.items.length > 0 ? list.items.map((row) => (
          <TableRow key={row.id} className="cursor-pointer">
            <TableCell className="px-4 py-4 font-semibold text-primary">
              <Link href={`/letters/${row.id}`} className="hover:underline">
                {row.number}
              </Link>
            </TableCell>
            <TableCell className="px-4 py-4 text-sm">
              {new Date(row.letterDate).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })}
            </TableCell>
            <TableCell className="max-w-64 truncate px-4 py-4 text-sm">
              <Link
                href={`/letters/${row.id}`}
                className="hover:text-primary hover:underline"
              >
                {row.subject}
              </Link>
            </TableCell>
            <TableCell className="px-4 py-4 text-sm">{row.unit}</TableCell>
            <TableCell className="px-4 py-4 text-sm">
              {LETTER_TYPE_LABELS[row.letterType] ?? row.letterType}
            </TableCell>
            <TableCell className="px-4 py-4">
              <Badge
                variant="outline"
                className={securityClassName[row.security] ?? securityClassName.normal}
              >
                {LETTER_SECURITY_LABELS[row.security] ?? row.security}
              </Badge>
            </TableCell>
            <TableCell className="px-4 py-4 text-sm">
              {LETTER_CATEGORY_LABELS[row.category] ?? row.category}
            </TableCell>
            <TableCell className="px-4 py-4 text-sm">{row.requesterName}</TableCell>
            <TableCell className="px-4 py-4 text-sm">{row.recipient}</TableCell>
            <TableCell className="px-4 py-4">
              <Badge
                variant="outline"
                className={statusClassName[row.status] ?? statusClassName.draft}
              >
                {LETTER_STATUS_LABELS[row.status] ?? row.status}
              </Badge>
            </TableCell>
            <TableCell className="px-4 py-4">
              <div className="flex justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Aksi surat"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={`/letters/${row.id}`} />}>
                      <Eye className="h-4 w-4" />
                      Detail
                    </DropdownMenuItem>
                    {row.capabilities.canEdit ? (
                      <DropdownMenuItem render={<Link href={`/letters/${row.id}/edit`} />}>
                        <Edit className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    ) : null}
                    {row.capabilities.canDelete ? (
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm("Hapus draft surat ini?")) return;
                          startTransition(async () => {
                            try {
                              await deleteLetter(row.id);
                              router.refresh();
                            } catch {
                              window.alert("Draft tidak dapat dihapus.");
                            }
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Hapus
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
              Belum ada surat.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
    <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <span>
        Menampilkan {list.items.length} dari {list.meta.total.toLocaleString("id-ID")} surat
      </span>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={list.meta.page <= 1}
          onClick={() => goToPage(1)}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={list.meta.page <= 1}
          onClick={() => goToPage(list.meta.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from(
          { length: Math.min(3, list.meta.pages) },
          (_, index) => Math.max(1, Math.min(list.meta.pages - 2, list.meta.page - 1)) + index,
        ).map((page) => (
          <Button
            key={page}
            type="button"
            variant={page === list.meta.page ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => goToPage(page)}
          >
            {page}
          </Button>
        ))}
        {list.meta.pages > 3 ? <span className="px-2">...</span> : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={list.meta.page >= list.meta.pages}
          onClick={() => goToPage(list.meta.page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={list.meta.page >= list.meta.pages}
          onClick={() => goToPage(list.meta.pages)}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </div>
    </div>
  );
};
