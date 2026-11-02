import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getProjectRab } from "./action";

const RabItemDetailHeader = dynamic(() =>
  import("./_components/rab-item-detail-header").then(
    (mod) => mod.RabItemDetailHeader,
  ),
);
const RabItemSummaryCards = dynamic(() =>
  import("./_components/rab-item-summary-cards").then(
    (mod) => mod.RabItemSummaryCards,
  ),
);
const RabItemDetailTable = dynamic(() =>
  import("./_components/rab-item-detail-table").then(
    (mod) => mod.RabItemDetailTable,
  ),
);
const RabItemAnalysisCard = dynamic(() =>
  import("./_components/rab-item-analysis-card").then(
    (mod) => mod.RabItemAnalysisCard,
  ),
);

export const metadata: Metadata = {
  title: "Detail Item RAB",
};

const RabItemDetailPage = async ({
  params,
}: {
  params: Promise<{ id: string; rabItemId: string }>;
}) => {
  const { id, rabItemId } = await params;
  const rab = await getProjectRab(id);
  const item = rab.workItems.find((row) => row.id === rabItemId);

  if (!item) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <RabItemDetailHeader item={item} />
      <RabItemSummaryCards item={item} />
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <RabItemDetailTable item={item} />
        </div>
        <div className="xl:col-span-4">
          <RabItemAnalysisCard item={item} />
        </div>
      </div>
    </section>
  );
};

export default RabItemDetailPage;
