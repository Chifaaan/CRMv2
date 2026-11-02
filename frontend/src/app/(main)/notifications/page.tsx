import type { Metadata } from "next";
import dynamic from "next/dynamic";
import {
  getNotificationProjects,
  type NotificationProject,
  type NotificationSearchParams,
} from "./action";

const NotificationFilterBar = dynamic(() =>
  import("./_components/notification-filter-bar").then(
    (mod) => mod.NotificationFilterBar,
  ),
);
const NotificationFeed = dynamic(() =>
  import("./_components/notification-feed").then((mod) => mod.NotificationFeed),
);

export const metadata: Metadata = {
  title: "Notifikasi",
};

const NotificationsPage = async ({
  searchParams,
}: {
  searchParams: Promise<NotificationSearchParams>;
}) => {
  const filters = await searchParams;
  const projects = await getNotificationProjects().catch(
    () => [] as NotificationProject[],
  );

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <NotificationFilterBar filters={filters} projects={projects} />
      <NotificationFeed filters={filters} />
    </section>
  );
};

export default NotificationsPage;
