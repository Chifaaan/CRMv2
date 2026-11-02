"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  projectDisplayProgressPercent,
  projectPipelineCounts,
} from "@/lib/project-progress-display";
import { useProjectDetail } from "./project-detail-context";

function fmtDate(v: string | null) {
  if (!v) return "—";
  try {
    return format(new Date(v), "d MMM yyyy");
  } catch {
    return "—";
  }
}

function fmtMoney(v: unknown) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function websiteHref(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function ProjectOverviewClient() {
  const { project, userRole } = useProjectDetail();

  const pipeline = projectPipelineCounts(project);

  const openTasks = useMemo(
    () => Math.max(0, pipeline.total - pipeline.completed),
    [pipeline.total, pipeline.completed],
  );

  const progressPct = projectDisplayProgressPercent(project);

  const teamMembers = useMemo(
    () =>
      project.members.filter(
        (m) => (m.user.role ?? "").toLowerCase() !== "client",
      ),
    [project.members],
  );

  const clientMembers = useMemo(
    () =>
      project.members.filter(
        (m) => (m.user.role ?? "").toLowerCase() === "client",
      ),
    [project.members],
  );

  const card =
    "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm";
  const cardMuted =
    "rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 shadow-sm";
  /** ±5 baris chip anggota (tinggi baris ~2.85rem + gap) lalu scroll vertikal */
  const memberListScrollClass =
    "mt-3 max-h-[15.25rem] overflow-y-auto overscroll-y-contain pr-1";
  /** Isi deskripsi: tinggi viewport tetap; scroll vertikal bila teks panjang */
  const descriptionScrollClass =
    "mt-2 max-h-[280px] overflow-y-auto overscroll-y-contain pr-1";

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600">
        Kiri: progress, anggaran, jadwal, dan pembuat. Kanan: klien dan anggota
        proyek.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Progress" value={`${progressPct}%`} accent="bg-sky-50" />
        <StatCard
          label="Tasks done"
          value={`${pipeline.completed} / ${pipeline.total}`}
          accent="bg-emerald-50"
        />
        <StatCard
          label="Open tasks"
          value={String(openTasks)}
          accent="bg-amber-50"
        />
        <StatCard
          label="Open maintenance"
          value={String(project.maintenanceOpen)}
          accent="bg-violet-50"
        />
      </div>

      {/* Kiri = meta proyek (mengisi tinggi); kanan = klien + anggota */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <section className={cardMuted}>
            <h2 className="text-sm font-semibold text-zinc-900">Progress</h2>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-200/80">
              <div
                className="h-full rounded-full bg-sky-600 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              Persentase task pipeline selesai (completed) dari total task
              Run-in Pipeline; task On Hold / Cancelled tidak dihitung.
            </p>
          </section>

          {project.description ? (
            <section
              className={cn(
                card,
                "flex min-h-[8rem] flex-col overflow-hidden lg:min-h-[10rem]",
              )}
            >
              <h2 className="shrink-0 text-sm font-semibold text-zinc-900">
                Description
              </h2>
              <div className={descriptionScrollClass}>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700">
                  {project.description}
                </p>
              </div>
            </section>
          ) : null}

          <div
            className={cn(
              "grid gap-4",
              project.tags?.length ? "sm:grid-cols-2" : "",
            )}
          >
            <section className={card}>
              <h2 className="text-sm font-semibold text-zinc-900">Budget</h2>
              <dl className="mt-3 grid gap-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-zinc-500">
                    Planned
                  </dt>
                  <dd className="mt-0.5 font-medium text-zinc-900">
                    {fmtMoney(project.budget)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-500">
                    Actual cost
                  </dt>
                  <dd className="mt-0.5 font-medium text-zinc-900">
                    {userRole === "client" ? "—" : fmtMoney(project.actualCost)}
                  </dd>
                </div>
              </dl>
            </section>

            {project.tags?.length ? (
              <section className={card}>
                <h2 className="text-sm font-semibold text-zinc-900">Tags</h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div
            className={cn(
              "grid gap-4",
              project.parent ? "sm:grid-cols-2" : "",
            )}
          >
            <section
              className={cn(card, !project.parent && "sm:col-span-2")}
            >
              <h2 className="text-sm font-semibold text-zinc-900">Schedule</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Start</dt>
                  <dd className="font-medium text-zinc-900">
                    {fmtDate(project.startDate)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Target end</dt>
                  <dd className="font-medium text-zinc-900">
                    {fmtDate(project.endDate)}
                  </dd>
                </div>
                {project.actualEndDate ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Actual end</dt>
                    <dd className="font-medium text-zinc-900">
                      {fmtDate(project.actualEndDate)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            {project.parent ? (
              <section className={card}>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Parent project
                </h2>
                <p className="mt-3 text-sm leading-snug text-zinc-800">
                  {project.parent.name}{" "}
                  <span className="font-mono text-xs text-zinc-500">
                    ({project.parent.code})
                  </span>
                </p>
              </section>
            ) : null}
          </div>

          <section
            className={cn(
              card,
              "flex flex-row flex-wrap items-center justify-between gap-3",
            )}
          >
            <h2 className="text-sm font-semibold text-zinc-900">Created by</h2>
            <div className="flex items-center gap-2">
              <UserProfileTrigger userId={project.createdBy.id}>
                <Avatar className="h-8 w-8">
                  {project.createdBy.image ? (
                    <AvatarImage src={project.createdBy.image} alt="" />
                  ) : null}
                  <AvatarFallback className="text-[10px]">
                    {project.createdBy.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </UserProfileTrigger>
              <UserProfileTrigger userId={project.createdBy.id} className="min-w-0 rounded-sm">
                <span className="truncate text-sm font-medium text-zinc-800">
                  {project.createdBy.name}
                </span>
              </UserProfileTrigger>
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className={card}>
            <h2 className="text-sm font-semibold text-zinc-900">Client</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Data dari master client; setelah edit di menu Clients, segarkan
              halaman ini.
            </p>
            {project.client ? (
              <div className="mt-3 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  {project.client.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.client.logo}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg border border-zinc-200 bg-white object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-[10px] text-zinc-400">
                      No logo
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900">
                      {project.client.companyName}
                    </p>
                    {project.client.industry?.trim() ? (
                      <p className="mt-0.5 text-xs text-zinc-600">
                        <span className="font-medium text-zinc-500">
                          Industri:{" "}
                        </span>
                        {project.client.industry}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-x-6 gap-y-4 border-t border-zinc-100 pt-4 text-xs sm:grid-cols-2 sm:text-sm">
                  {project.client.website?.trim() ? (
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-500">Website</p>
                      <p className="mt-1 break-words">
                        <a
                          href={websiteHref(project.client.website) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {project.client.website.trim()}
                        </a>
                      </p>
                    </div>
                  ) : null}
                  {project.client.address?.trim() ? (
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-500">Alamat</p>
                      <p className="mt-1 whitespace-pre-wrap text-zinc-800">
                        {project.client.address.trim()}
                      </p>
                    </div>
                  ) : null}
                  {(project.client.contactPerson?.trim() ||
                    project.client.contactEmail?.trim() ||
                    project.client.contactPhone?.trim()) ? (
                    <div className="min-w-0 sm:col-span-2">
                      <p className="text-xs font-medium text-zinc-500">
                        Kontak utama
                      </p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {project.client.contactPerson?.trim() ? (
                          <p className="text-zinc-800">
                            {project.client.contactPerson.trim()}
                          </p>
                        ) : null}
                        <div
                          className={cn(
                            "space-y-1.5 text-zinc-800",
                            !project.client.contactPerson?.trim() &&
                              "sm:col-span-2",
                          )}
                        >
                          {project.client.contactEmail?.trim() ? (
                            <p>
                              <a
                                href={`mailto:${project.client.contactEmail.trim()}`}
                                className="text-primary underline-offset-2 hover:underline"
                              >
                                {project.client.contactEmail.trim()}
                              </a>
                            </p>
                          ) : null}
                          {project.client.contactPhone?.trim() ? (
                            <p>
                              <a
                                href={`tel:${project.client.contactPhone.trim().replace(/\s+/g, "")}`}
                                className="text-primary underline-offset-2 hover:underline"
                              >
                                {project.client.contactPhone.trim()}
                              </a>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">No client linked</p>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className={card}>
              <h2 className="text-sm font-semibold text-zinc-900">Team</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Internal (PM, developer, viewer, …)
              </p>
              <div className={memberListScrollClass}>
                <div className="flex flex-col gap-2">
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      Belum ada anggota tim
                    </p>
                  ) : (
                    teamMembers.map((m) => (
                      <div
                        key={m.user.id}
                        className="flex min-h-[2.625rem] min-w-0 shrink-0 items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1.5"
                      >
                        <UserProfileTrigger userId={m.user.id} className="shrink-0">
                          <Avatar className="h-7 w-7">
                            {m.user.image ? (
                              <AvatarImage src={m.user.image} alt="" />
                            ) : null}
                            <AvatarFallback className="text-[10px]">
                              {m.user.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </UserProfileTrigger>
                        <div className="min-w-0 text-xs">
                          <UserProfileTrigger userId={m.user.id} className="block max-w-full rounded-sm">
                            <p className="truncate font-medium text-zinc-900">
                              {m.user.name}
                            </p>
                          </UserProfileTrigger>
                          <p className="truncate text-zinc-500">
                            {m.projectRole}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className={card}>
              <h2 className="text-sm font-semibold text-zinc-900">
                Client members
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Pengguna role client di proyek ini
              </p>
              <div className={memberListScrollClass}>
                <div className="flex flex-col gap-2">
                  {clientMembers.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      Tidak ada client member
                    </p>
                  ) : (
                    clientMembers.map((m) => (
                      <div
                        key={m.user.id}
                        className="flex min-h-[2.625rem] min-w-0 shrink-0 items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1.5"
                      >
                        <UserProfileTrigger userId={m.user.id} className="shrink-0">
                          <Avatar className="h-7 w-7">
                            {m.user.image ? (
                              <AvatarImage src={m.user.image} alt="" />
                            ) : null}
                            <AvatarFallback className="text-[10px]">
                              {m.user.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </UserProfileTrigger>
                        <div className="min-w-0 text-xs">
                          <UserProfileTrigger userId={m.user.id} className="block max-w-full rounded-sm">
                            <p className="truncate font-medium text-zinc-900">
                              {m.user.name}
                            </p>
                          </UserProfileTrigger>
                          <p className="truncate text-zinc-500">
                            {m.projectRole}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 px-4 py-3",
        accent,
      )}
    >
      <p className="text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
      <p className="text-xs font-medium text-zinc-600">{label}</p>
    </div>
  );
}
