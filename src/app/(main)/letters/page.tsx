import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getLetterMeta, getLetters, getLetterSummary } from "./action";
import type { LetterSearchParams } from "./types";

const LetterPageHeader = dynamic(() =>
  import("./_components/letter-page-header").then((mod) => mod.LetterPageHeader),
);
const LetterSummaryCards = dynamic(() =>
  import("./_components/letter-summary-cards").then(
    (mod) => mod.LetterSummaryCards,
  ),
);
const LetterFilterBar = dynamic(() =>
  import("./_components/letter-filter-bar").then((mod) => mod.LetterFilterBar),
);
const LetterTable = dynamic(() =>
  import("./_components/letter-table").then((mod) => mod.LetterTable),
);

export const metadata: Metadata = {
  title: "Daftar Surat",
};

const LettersPage = async ({
  searchParams,
}: {
  searchParams: Promise<LetterSearchParams>;
}) => {
  const filters = await searchParams;
  const [list, summary, meta] = await Promise.all([
    getLetters(filters),
    getLetterSummary(),
    getLetterMeta(),
  ]);

  return (
    <section className="space-y-6">
      <LetterPageHeader filters={filters} />
      <LetterSummaryCards summary={summary} />
      <LetterFilterBar filters={filters} units={meta.units} />
      <LetterTable list={list} />
    </section>
  );
};

export default LettersPage;
