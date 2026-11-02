"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Users,
  CalendarDays,
  Bell,
  FileText,
  Building2,
  Mails,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isAdminOrPmRole } from "@/lib/role-constants";

/** Parity `_reference/index.html` + notifikasi (SIMPRO). */
const baseItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  {
    href: "/my-tasks",
    label: "My tasks",
    icon: ListTodo,
    excludeRoles: ["viewer", "client"],
  },
  { href: "/clients", label: "Clients", icon: Building2, managementOnly: true },
  {
    href: "/members",
    label: "Members",
    icon: Users,
    adminOnly: true,
  },
  /* { href: "/assets", label: "Assets", icon: Package, managementOnly: true }, */ // hidden — fitur belum diaktifkan
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/letters", label: "Letters", icon: Mails },
  { href: "/notifications", label: "Alerts", icon: Bell },
];

export function MobileNav({ role }: { role: string }) {
  const pathname = usePathname();
  const isManagement = isAdminOrPmRole(role);

  const items = baseItems.filter((item) => {
    if ("adminOnly" in item && item.adminOnly && role !== "admin") {
      return false;
    }
    if ("managementOnly" in item && item.managementOnly && !isManagement) {
      return false;
    }
    if (
      "excludeRoles" in item &&
      item.excludeRoles?.includes(role)
    ) {
      return false;
    }
    return true;
  });

  return (
    <nav
      className="bg-card border-border fixed right-0 bottom-0 left-0 z-40 flex overflow-x-auto border-t px-1 py-1 shadow-[0_-1px_0_0_var(--border)] md:hidden"
      aria-label="Mobile navigation"
    >
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-[4.25rem] flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
