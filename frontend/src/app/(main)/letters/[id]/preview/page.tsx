import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getLetterPreview } from "./action";

const LetterPreviewShell = dynamic(() =>
  import("./_components/letter-preview-shell").then(
    (mod) => mod.LetterPreviewShell,
  ),
);

export const metadata: Metadata = {
  title: "Preview Surat",
};

const LetterPreviewPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const letter = await getLetterPreview(id);

  return <LetterPreviewShell letter={letter} />;
};

export default LetterPreviewPage;
