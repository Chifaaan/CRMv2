"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-red-200 bg-red-50/90 p-6 text-center">
      <h2 className="text-lg font-semibold text-red-900">
        Terjadi kesalahan di aplikasi
      </h2>
      <p className="text-sm text-red-800">
        {error.message || "Silakan coba lagi atau kembali ke dashboard."}
      </p>
      <div className="flex justify-center gap-2">
        <Button type="button" variant="outline" onClick={() => reset()}>
          Coba lagi
        </Button>
        <Button type="button" onClick={() => (window.location.href = "/dashboard")}>
          Dashboard
        </Button>
      </div>
    </div>
  );
}
