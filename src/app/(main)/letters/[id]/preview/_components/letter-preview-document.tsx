import type { LetterDetail } from "../../../types";
import localFont from "next/font/local";

const signatureFont = localFont({
  src: "../fonts/HomemadeApple-Regular.ttf",
});

export const LetterPreviewDocument = ({
  letter,
  scale,
}: {
  letter: LetterDetail;
  scale: number;
}) => {
  const signer =
    letter.status === "approved"
      ? letter.approvals.at(-1)?.user ?? null
      : null;

  const lastApprovalUser = letter.approvals.at(-1)?.user;

  const paragraphs = letter.body
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
  <div
    className="origin-top rounded-sm bg-white p-16 text-zinc-950 shadow-lg transition-transform duration-300"
    style={{
      width: "210mm",
      minHeight: "297mm",
      transform: `scale(${scale})`,
    }}
  >
    <div className="mb-8 border-b-4 border-double border-zinc-950 pb-6 text-center">
      <div className="mb-4 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-zinc-900 text-xl font-extrabold tracking-tight">
          KA
        </div>
      </div>
      <h2 className="text-xl font-bold uppercase tracking-[0.2em]">
        SIMPRO
      </h2>
      <h3 className="text-lg font-semibold uppercase">
        Sistem Informasi Manajemen Proyek
      </h3>
      <p className="text-sm">Dokumen surat perusahaan</p>
    </div>

    <div className="space-y-6 text-[15px] leading-7">
      <div className="flex justify-between gap-10">
        <div className="space-y-1">
          <p>
            <span className="inline-block w-24">Nomor</span>:{" "}
            {letter.number}
          </p>
          <p>
            <span className="inline-block w-24">Lampiran</span>:{" "}
            {letter.attachments.length} berkas
          </p>
          <p>
            <span className="inline-block w-24">Perihal</span>:{" "}
            {letter.subject}
          </p>
        </div>
        <p className="text-right">
          {new Date(letter.letterDate).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </p>
      </div>

      <div className="pt-8">
        <p>Yth. {letter.recipient}</p>
        <p>{letter.location ?? "di Tempat"}</p>
      </div>

      <div className="space-y-4 pt-4 text-justify">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="ml-auto mt-20 w-1/3 space-y-16 text-center">
        <p>Hormat kami,</p>
        <div>
          {signer ? (
            <div className="mx-auto mb-3 h-14 w-40 rounded-[50%]">
              {/* <span className="font-serif text-2xl italic"> */}
              <span className={`${signatureFont.className} text-3xl font-bold`}>
                {signer?.name.split(" ")[0] ?? "Draft"}
              </span>
            </div>
          ) : (
            ""
          )}
          <p className="inline-block border-b border-zinc-950 px-2 font-bold">
            {lastApprovalUser?.name ?? ""}
          </p>
          <p className="text-sm">{signer?.position ?? ""}</p>
        </div>
      </div>
    </div>
  </div>
  );
};
