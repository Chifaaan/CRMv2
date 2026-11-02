import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseBastFile, parseInvoiceFile } from "../src/lib/prototype/excel";

function makeFile(rows: Record<string, unknown>[], name = "template.xlsx"): File {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Template");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("BAST import", () => {
  it("reads one valid BAST row", async () => {
    const file = makeFile([
      {
        project_code: "POSRV",
        bast_number: "BAST/TEST/001",
        bast_date: "2026-11-01",
        notes: "Catatan",
        document_url: "https://example.com/bast.pdf",
      },
    ]);
    await expect(parseBastFile(file)).resolves.toEqual({
      number: "BAST/TEST/001",
      date: "2026-11-01",
      notes: "Catatan",
      documentUrl: "https://example.com/bast.pdf",
    });
  });

  it("rejects a row without a BAST number", async () => {
    const file = makeFile([
      { bast_number: "", bast_date: "2026-11-01" },
    ]);
    await expect(parseBastFile(file)).rejects.toThrow("bast_number");
  });

  it("rejects a project code that does not match", async () => {
    const file = makeFile([
      {
        project_code: "OTHER",
        bast_number: "BAST/TEST/003",
        bast_date: "2026-11-01",
      },
    ]);
    await expect(parseBastFile(file, "POSRV")).rejects.toThrow("project_code");
  });
});

describe("Invoice import", () => {
  it("reads amount and calculates tax when missing", async () => {
    const file = makeFile([
      {
        project_code: "POSRV",
        invoice_number: "INV/TEST/001",
        invoice_date: "2026-11-01",
        amount: 120000000,
        tax_percent: 11,
        notes: "Import",
      },
    ]);
    const result = await parseInvoiceFile(file);
    expect(result.number).toBe("INV/TEST/001");
    expect(result.amount).toBe(120000000);
    expect(result.taxAmount).toBe(13200000);
  });

  it("rejects a row without an amount", async () => {
    const file = makeFile([
      { invoice_number: "INV/TEST/002", invoice_date: "2026-11-01", amount: 0 },
    ]);
    await expect(parseInvoiceFile(file)).rejects.toThrow("amount");
  });
});
