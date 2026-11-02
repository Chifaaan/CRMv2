/**
 * Catatan memakai tinggi viewport penuh (dua kolom) seperti TRACKLY notes.css.
 */
export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:-mx-2">{children}</div>
  );
}
