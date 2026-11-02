import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import { getProjectRap } from "./action";

const RapPageHeader = dynamic(() =>
  import("./_components/rap-page-header").then((mod) => mod.RapPageHeader),
);
const RapSummaryCards = dynamic(() =>
  import("./_components/rap-summary-cards").then((mod) => mod.RapSummaryCards),
);
const RapItemModeTable = dynamic(() =>
  import("./_components/rap-item-mode-table").then(
    (mod) => mod.RapItemModeTable,
  ),
);
const RapDocuments = dynamic(() =>
  import("../rab/_components/rab-conversion-documents").then(
    (mod) => mod.RabConversionDocuments,
  ),
);
const RabImportDialog = dynamic(() =>
  import("../rab/_components/rab-import-dialog").then(
    (mod) => mod.RabImportDialog,
  ),
);
const RapPriceTable = dynamic(() =>
  import("./_components/rap-price-table").then((mod) => mod.RapPriceTable),
);

export const metadata: Metadata = {
  title: "RAP Project",
};

const ProjectRapPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const rap = await getProjectRap(id);
  if (!rap) notFound();
  if (!rap.canViewRap) {
    redirect(`/projects/${id}/rab`);
  }

  return (
    <section className="space-y-6">
      <RapPageHeader projectId={id} hasItems={rap.workItems.length > 0} />
      <RapSummaryCards workItems={rap.workItems} />
      <RapDocuments rab={rap} variant="RAP" />
      <RapItemModeTable projectId={id} workItems={rap.workItems} />
      <RapPriceTable projectId={id} workItems={rap.workItems} />
      <RabImportDialog
        summary={{
          items: rap.workItems.length,
          groups: rap.workItems.reduce((sum, item) => sum + item.groups.length, 0),
          details: rap.workItems.reduce(
            (sum, item) =>
              sum + item.groups.reduce((inner, group) => inner + group.details.length, 0),
            0,
          ),
        }}
      />
    </section>
  );
};

export default ProjectRapPage;
