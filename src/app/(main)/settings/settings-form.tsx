"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function SettingsForm({
  initial,
  isAdmin,
}: {
  initial: Record<string, string>;
  isAdmin: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!isAdmin) {
      toast.error("Only admin can save settings");
      return;
    }
    setLoading(true);
    try {
      const entries = Object.entries(values).map(([key, value]) => ({
        key,
        value,
      }));
      await api.patch("/api/settings", { entries });
      toast.success("Saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      {Object.keys(initial).map((key) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={key}>{key}</Label>
          <Input
            id={key}
            value={values[key] ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, [key]: e.target.value }))
            }
            disabled={!isAdmin}
          />
        </div>
      ))}
      {isAdmin ? (
        <Button onClick={save} disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </Button>
      ) : (
        <p className="text-sm text-zinc-500">PM can view; only admin can edit.</p>
      )}
    </div>
  );
}
