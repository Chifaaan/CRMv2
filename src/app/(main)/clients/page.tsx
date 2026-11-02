import { getServerSession } from "@/lib/server-session";
import { assertManagementRouteAccess } from "@/lib/management-access-server";
import { ClientsPageClient } from "./clients-page-client";

export default async function ClientsPage() {
  const { data: session } = await getServerSession();
  assertManagementRouteAccess(
    (session?.user as { role?: string } | undefined)?.role,
  );
  return <ClientsPageClient />;
}