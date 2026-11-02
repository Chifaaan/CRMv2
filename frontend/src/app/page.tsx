"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrototypeStore } from "@/lib/prototype/store";
import { landingForRole, userById } from "@/lib/prototype/domain";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const state = usePrototypeStore.getState();
    const user = userById(state, state.currentUserId);
    router.replace(user ? landingForRole(user.role) : "/crm");
  }, [router]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground animate-pulse text-sm">
        Mengarahkan ke modul yang sesuai…
      </p>
    </div>
  );
}
