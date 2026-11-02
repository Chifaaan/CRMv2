import { getServerSession } from "@/lib/server-session";
import { assertGlobalMembersPageAccess } from "@/lib/management-access-server";
import { MembersPageClient } from "./members-page-client";

export default async function MembersPage() {
  const { data: session } = await getServerSession();
  assertGlobalMembersPageAccess(
    (session?.user as { role?: string } | undefined)?.role,
  );
  return <MembersPageClient />;
}
