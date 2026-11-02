import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "SIMPRO",
  description: "Project Management Information System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.className} h-full antialiased`}>
      <body className="bg-background text-foreground flex h-full min-h-0 flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
