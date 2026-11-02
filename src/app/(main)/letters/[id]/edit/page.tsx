import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getEditLetter, getEditLetterMeta } from "./action";

const EditLetterPageHeader = dynamic(() =>
  import("./_components/edit-letter-page-header").then(
    (mod) => mod.EditLetterPageHeader,
  ),
);
const EditLetterForm = dynamic(() =>
  import("./_components/edit-letter-form").then((mod) => mod.EditLetterForm),
);
const EditLetterSummary = dynamic(() =>
  import("./_components/edit-letter-summary").then(
    (mod) => mod.EditLetterSummary,
  ),
);

export const metadata: Metadata = {
  title: "Edit Surat",
};

const EditLetterPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const [letter, meta] = await Promise.all([
    getEditLetter(id),
    getEditLetterMeta(),
  ]);
  if (!letter.capabilities.canEdit) redirect(`/letters/${id}`);

  return (
    <section className="space-y-6">
      <EditLetterPageHeader letter={letter} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <EditLetterForm letter={letter} meta={meta} />
        <EditLetterSummary letter={letter} />
      </div>
    </section>
  );
};

export default EditLetterPage;
