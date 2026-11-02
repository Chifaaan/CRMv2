"use client";

import { PrototypeShell } from "@/components/prototype/shell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <PrototypeShell>{children}</PrototypeShell>;
}
