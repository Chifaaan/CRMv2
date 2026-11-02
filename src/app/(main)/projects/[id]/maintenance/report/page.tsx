import { MaintenanceReportClient } from "./maintenance-report-client";

export default async function MaintenanceReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  return <MaintenanceReportClient projectId={projectId} />;
}
