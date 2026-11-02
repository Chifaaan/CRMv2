"use server";

import { serverFetch } from "@/lib/api/server-fetch";
import { serverJsonRequest } from "@/lib/api/server-json-request";

export type NotificationSearchParams = {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  types?: string;
};

export type NotificationRow = {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  entityType: string;
  entityId: string;
  action?: string;
  projectId: string | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  projectName?: string | null;
};

export type NotificationListPayload = {
  data: NotificationRow[];
  meta: { total: number; page: number; take: number; limits: number };
};

export type NotificationProject = { id: string; name: string; code: string };

export type NotificationListQuery = NotificationSearchParams & {
  page: number;
  limits: number;
  unreadOnly?: boolean;
};

const buildNotificationQuery = (query: NotificationListQuery) => {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limits", String(query.limits));
  if (query.unreadOnly) params.set("unreadOnly", "1");
  if (query.q) params.set("q", query.q);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.projectId) params.set("projectId", query.projectId);
  if (query.types) params.set("types", query.types);
  return params.toString();
};

export const getNotifications = async (query: NotificationListQuery) =>
  serverFetch<NotificationListPayload>(
    `/api/notifications?${buildNotificationQuery(query)}`,
  );

export const getNotificationUnreadCount = async () =>
  serverFetch<{ count: number }>("/api/notifications/unread-count");

export const getNotificationProjects = async () =>
  serverFetch<NotificationProject[]>("/api/projects");

export const markNotificationRead = async (id: string) =>
  serverJsonRequest<{ ok: boolean }>(
    `/api/notifications/${id}/read`,
    "PATCH",
  );

export const markAllNotificationsRead = async () =>
  serverJsonRequest<{ ok: boolean }>("/api/notifications/read-all", "PATCH");

export const deleteNotification = async (id: string) =>
  serverJsonRequest<{ ok: boolean }>(`/api/notifications/${id}`, "DELETE");

export const deleteReadNotifications = async () =>
  serverJsonRequest<{ deleted: number }>("/api/notifications/read", "DELETE");
