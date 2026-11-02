import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getAddLetterMeta } from "./action";

const AddLetterPageHeader = dynamic(() =>
  import("./_components/add-letter-page-header").then(
    (mod) => mod.AddLetterPageHeader,
  ),
);
const AddLetterForm = dynamic(() =>
  import("./_components/add-letter-form").then((mod) => mod.AddLetterForm),
);
const AddLetterSummary = dynamic(() =>
  import("./_components/add-letter-summary").then((mod) => mod.AddLetterSummary),
);

export const metadata: Metadata = {
  title: "Buat Surat",
};

const AddLetterPage = async () => {
  const meta = await getAddLetterMeta();

  return (
    <section className="space-y-6">
      <AddLetterPageHeader />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AddLetterForm meta={meta} />
        <AddLetterSummary />
      </div>
    </section>
  );
};

export default AddLetterPage;
