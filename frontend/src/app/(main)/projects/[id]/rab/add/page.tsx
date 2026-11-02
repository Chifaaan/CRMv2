import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getProjectRab } from "./action";

const RabAddHeader = dynamic(() =>
  import("./_components/rab-add-header").then((mod) => mod.RabAddHeader),
);
const RabGeneralInfoCard = dynamic(() =>
  import("./_components/rab-general-info-card").then(
    (mod) => mod.RabGeneralInfoCard,
  ),
);
const RabDetailTable = dynamic(() =>
  import("./_components/rab-detail-table").then((mod) => mod.RabDetailTable),
);
const RabAddFooter = dynamic(() =>
  import("./_components/rab-add-footer").then((mod) => mod.RabAddFooter),
);

export const metadata: Metadata = {
  title: "Tambah Item Pekerjaan RAB",
};

const RabAddPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duplicateFrom?: string }>;
}) => {
  const { id } = await params;
  const { duplicateFrom } = await searchParams;
  const sourceItem = duplicateFrom
    ? (await getProjectRab(id)).workItems.find((item) => item.id === duplicateFrom)
    : undefined;

  return (
    <section>
      <RabAddHeader item={sourceItem} />
      <div className="space-y-6">
        <RabGeneralInfoCard item={sourceItem} />
        <RabDetailTable />
      </div>
      <RabAddFooter />
    </section>
  );
};

export default RabAddPage;
