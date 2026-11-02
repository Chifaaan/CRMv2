import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getLetterDetail } from "./action";

const LetterDetailHeader = dynamic(() =>
  import("./_components/letter-detail-header").then(
    (mod) => mod.LetterDetailHeader,
  ),
);
const LetterDetailMain = dynamic(() =>
  import("./_components/letter-detail-main").then((mod) => mod.LetterDetailMain),
);
const LetterDetailSidebar = dynamic(() =>
  import("./_components/letter-detail-sidebar").then(
    (mod) => mod.LetterDetailSidebar,
  ),
);

export const metadata: Metadata = {
  title: "Detail Surat",
};

const LetterDetailPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const letter = await getLetterDetail(id);

  return (
    <section className="space-y-6">
      <LetterDetailHeader letter={letter} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <LetterDetailMain letter={letter} />
        </div>
        <div className="xl:col-span-4">
          <LetterDetailSidebar letter={letter} />
        </div>
      </div>
    </section>
  );
};

export default LetterDetailPage;
