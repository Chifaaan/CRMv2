import { getServerSession } from "@/lib/server-session";
import { assertManagementRouteAccess } from "@/lib/management-access-server";
import { serverFetch } from "@/lib/api/server-fetch";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { data: session } = await getServerSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  assertManagementRouteAccess(role);
  const settings = await serverFetch<Record<string, string>>("/api/settings");
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h2 className="text-xl font-semibold">Settings</h2>
      <SettingsForm initial={settings} isAdmin={role === "admin"} />
    </div>
  );
}
