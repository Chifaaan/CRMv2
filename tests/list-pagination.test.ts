import { describe, expect, it } from "vitest";
import {
  coerceListPageSize,
  DEFAULT_LIST_PAGE_SIZE,
  pageRangeLabel,
} from "../src/lib/list-pagination";

describe("list pagination", () => {
  it("uses the default page size and coerces invalid values", () => {
    expect(DEFAULT_LIST_PAGE_SIZE).toBe(10);
    expect(coerceListPageSize("25")).toBe(25);
    expect(coerceListPageSize("7")).toBe(DEFAULT_LIST_PAGE_SIZE);
  });

  it("labels page ranges for projects and prospek", () => {
    expect(pageRangeLabel(0, 1, 10)).toEqual({ from: 0, to: 0 });
    expect(pageRangeLabel(27, 1, 10)).toEqual({ from: 1, to: 10 });
    expect(pageRangeLabel(27, 3, 10)).toEqual({ from: 21, to: 27 });
  });
});
