import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getProjectRab } from "./action";

const RabEditHeader = dynamic(() =>
  import("./_components/rab-edit-header").then((mod) => mod.RabEditHeader),
);
const RabEditGeneralInfoCard = dynamic(() =>
  import("./_components/rab-edit-general-info-card").then(
    (mod) => mod.RabEditGeneralInfoCard,
  ),
);
const RabEditDetailTable = dynamic(() =>
  import("./_components/rab-edit-detail-table").then(
    (mod) => mod.RabEditDetailTable,
  ),
);
const RabEditFooter = dynamic(() =>
  import("./_components/rab-edit-footer").then((mod) => mod.RabEditFooter),
);

export const metadata: Metadata = {
  title: "Edit Item Pekerjaan RAB",
};

const RabEditPage = async ({
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
    <section>
      <RabEditHeader item={item} />
      <div className="space-y-6">
        <RabEditGeneralInfoCard item={item} />
        <RabEditDetailTable />
      </div>
      <RabEditFooter item={item} />
    </section>
  );
};

export default RabEditPage;
