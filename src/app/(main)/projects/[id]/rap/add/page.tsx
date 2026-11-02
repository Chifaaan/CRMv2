import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import { getProjectRap } from "../action";

const RabAddHeader = dynamic(() =>
  import("../../rab/add/_components/rab-add-header").then(
    (mod) => mod.RabAddHeader,
  ),
);
const RabGeneralInfoCard = dynamic(() =>
  import("../../rab/add/_components/rab-general-info-card").then(
    (mod) => mod.RabGeneralInfoCard,
  ),
);
const RabDetailTable = dynamic(() =>
  import("../../rab/add/_components/rab-detail-table").then(
    (mod) => mod.RabDetailTable,
  ),
);
const RabAddFooter = dynamic(() =>
  import("../../rab/add/_components/rab-add-footer").then(
    (mod) => mod.RabAddFooter,
  ),
);

export const metadata: Metadata = {
  title: "Tambah Item Pekerjaan RAP",
};

const RapAddPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const rap = await getProjectRap(id);
  if (!rap) notFound();
  if (!rap.canViewRap) redirect(`/projects/${id}/rab`);

  return (
    <section>
      <RabAddHeader mode="rap" />
      <div className="space-y-6">
        <RabGeneralInfoCard mode="rap" />
        <RabDetailTable mode="rap" />
      </div>
      <RabAddFooter mode="rap" />
    </section>
  );
};

export default RapAddPage;
