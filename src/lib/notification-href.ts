/**
 * Deep link notifikasi — mirror `getNotifHref` di `_reference/js/modules/notifications.js`.
 */
export function notificationHref(n: {
  entityType: string;
  entityId: string;
  projectId: string | null;
}): string | null {
  const { entityType, entityId, projectId } = n;
  switch (entityType) {
    case "task":
      if (!projectId) return null;
      return entityId
        ? `/projects/${projectId}/backlog?taskId=${encodeURIComponent(entityId)}`
        : `/projects/${projectId}/backlog`;
    case "sprint":
      return projectId ? `/projects/${projectId}/sprint` : null;
    case "meeting":
      return entityId ? `/meetings/${entityId}` : null;
    case "maintenance":
      return projectId ? `/projects/${projectId}/maintenance` : null;
    case "discussion":
      return projectId ? `/projects/${projectId}/discussion` : null;
    case "member":
      return "/members";
    case "client":
      return "/clients";
    case "asset":
      return null; // assets hidden — fitur belum diaktifkan
    case "budget":
      return "/budget";
    case "letter":
      return entityId ? `/letters/${entityId}` : "/letters";
    case "project":
      return projectId ? `/projects/${projectId}` : null;
    default:
      return null;
  }
}
