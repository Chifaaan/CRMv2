import { describe, expect, it } from "vitest";
import {
  FORM_DISPLAY_STATUS_LABEL,
  SIMPRO_FORM_TYPES,
  crmFormHref,
  formDisplayStatus,
  simproFormType,
} from "../src/lib/prototype/form-types";

describe("SIMPRO form types", () => {
  it("keeps Survey and RAB in config so the page is not hardcoded", () => {
    expect(SIMPRO_FORM_TYPES.map((type) => type.key)).toEqual([
      "survey",
      "rab",
    ]);
    expect(simproFormType("survey")?.open).toBe("dialog");
    expect(simproFormType("rab")?.open).toBe("crm");
    expect(simproFormType("bast")).toBeUndefined();
  });

  it("opens RAB in CRM and Survey in the dialog", () => {
    expect(crmFormHref("p-1", "rab")).toBe("/crm/projects/p-1?step=rab");
    expect(crmFormHref("p-1", "survey")).toBeUndefined();
  });

  it("maps raw form statuses to the four display statuses", () => {
    expect(formDisplayStatus("unassigned")).toBe("empty");
    expect(formDisplayStatus("assigned")).toBe("empty");
    expect(formDisplayStatus("draft")).toBe("empty");
    expect(formDisplayStatus("submitted")).toBe("submitted");
    expect(formDisplayStatus("need_revision")).toBe("need_revision");
    expect(formDisplayStatus("approved")).toBe("done");
    expect(FORM_DISPLAY_STATUS_LABEL.done).toBe("Selesai");
  });
});
