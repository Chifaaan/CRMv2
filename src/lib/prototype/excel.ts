"use client";

import * as XLSX from "xlsx";

export type BastImport = {
  number: string;
  date: string;
  notes: string;
  documentUrl: string;
};

export type InvoiceImport = {
  number: string;
  date: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  notes: string;
  documentUrl: string;
};

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function numberValue(value: unknown): number {
  if (typeof value === "number") return value;
  const normalized = text(value)
    .replace(/[^0-9,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }
  const raw = text(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return match[0];
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return "";
}

async function readFirstRow(file: File): Promise<Record<string, unknown>> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("Sheet pertama tidak ditemukan.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (!rows[0]) throw new Error("File tidak berisi baris data.");
  return rows[0];
}

function key(row: Record<string, unknown>, name: string): unknown {
  const found = Object.keys(row).find(
    (candidate) => candidate.trim().toLowerCase() === name,
  );
  return found ? row[found] : "";
}

function assertProjectCode(
  row: Record<string, unknown>,
  expectedProjectCode?: string,
) {
  const code = text(key(row, "project_code"));
  if (
    expectedProjectCode &&
    code &&
    code.toUpperCase() !== expectedProjectCode.toUpperCase()
  ) {
    throw new Error(
      `project_code ${code} tidak cocok dengan proyek ${expectedProjectCode}.`,
    );
  }
}

export async function parseBastFile(
  file: File,
  expectedProjectCode?: string,
): Promise<BastImport> {
  const row = await readFirstRow(file);
  assertProjectCode(row, expectedProjectCode);
  const result = {
    number: text(key(row, "bast_number")),
    date: dateValue(key(row, "bast_date")),
    notes: text(key(row, "notes")),
    documentUrl: text(key(row, "document_url")),
  };
  if (!result.number) throw new Error("Kolom bast_number wajib diisi.");
  if (!result.date) throw new Error("Kolom bast_date wajib berisi tanggal valid.");
  return result;
}

export async function parseInvoiceFile(
  file: File,
  expectedProjectCode?: string,
): Promise<InvoiceImport> {
  const row = await readFirstRow(file);
  assertProjectCode(row, expectedProjectCode);
  const amount = numberValue(key(row, "amount"));
  const taxPercent = numberValue(key(row, "tax_percent")) || 11;
  const taxAmount =
    numberValue(key(row, "tax_amount")) || Math.round(amount * (taxPercent / 100));
  const result = {
    number: text(key(row, "invoice_number")),
    date: dateValue(key(row, "invoice_date")),
    amount,
    taxPercent,
    taxAmount,
    notes: text(key(row, "notes")),
    documentUrl: text(key(row, "document_url")),
  };
  if (!result.number) throw new Error("Kolom invoice_number wajib diisi.");
  if (!result.date) throw new Error("Kolom invoice_date wajib berisi tanggal valid.");
  if (!result.amount) throw new Error("Kolom amount wajib berisi nominal.");
  return result;
}

function downloadRows(fileName: string, rows: Record<string, unknown>[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
  XLSX.writeFile(workbook, fileName);
}

export function downloadBastTemplate() {
  downloadRows("template-bast.xlsx", [
    {
      project_code: "PRJ-01",
      bast_number: "BAST/001/2026",
      bast_date: new Date().toISOString().slice(0, 10),
      notes: "Catatan BAST",
      document_url: "https://example.com/bast.pdf",
    },
  ]);
}

export function downloadInvoiceTemplate() {
  downloadRows("template-invoice.xlsx", [
    {
      project_code: "PRJ-01",
      invoice_number: "INV/001/2026",
      invoice_date: new Date().toISOString().slice(0, 10),
      amount: 10000000,
      tax_percent: 11,
      tax_amount: 1100000,
      notes: "Catatan invoice",
      document_url: "https://example.com/invoice.pdf",
    },
  ]);
}
