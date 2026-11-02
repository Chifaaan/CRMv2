import type { RabOverview } from "../types";
import { RabBudgetOverview } from "./rab-budget-overview";
import { RabConversionDocuments } from "./rab-conversion-documents";

export const RabBudgetSection = ({ rab }: { rab: RabOverview }) => (
  <div className="grid gap-6 xl:grid-cols-12">
    <RabBudgetOverview budget={rab.budget} />
    <RabConversionDocuments rab={rab} variant="RAB" />
  </div>
);
