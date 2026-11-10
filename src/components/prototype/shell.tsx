"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChartNoAxesCombined,
  CheckCheck,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  LayoutTemplate,
  ListTodo,
  RotateCcw,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePrototypeStore } from "@/lib/prototype/store";
import {
  formatDateTime,
  formsNeedingAction,
  landingForRole,
  roleCanAccessBusiness,
  roleCanAccessCrm,
  roleCanBrowseProjects,
  roleCanViewUmbrella,
  userById,
} from "@/lib/prototype/domain";
import { simproFinanceFormsNeedingAction } from "@/lib/prototype/simpro-forms";
import { clearPrototypeFiles } from "@/lib/prototype/files";
import { NativeSelect, UserAvatar } from "./ui";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm/projects", label: "Projects", icon: FolderKanban },
  { href: "/my-tasks", label: "My tasks", icon: ListTodo },
  { href: "/forms", label: "Forms", icon: CheckCheck },
  {
    href: "/crm/umbrella-projects",
    label: "Umbrella Projects",
    icon: Users,
  },
  { href: "/crm/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/crm/workload", label: "Workload", icon: Gauge },
  { href: "/business", label: "Business", icon: ChartNoAxesCombined },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/crm";
  if (href === "/crm/projects") {
    return (
      pathname === "/crm/projects" ||
      pathname.startsWith("/crm/projects/") ||
      pathname === "/projects" ||
      pathname.startsWith("/projects/")
    );
  }
  if (href === "/business") {
    return pathname === "/business" || pathname.startsWith("/business/");
  }
  if (href === "/forms") {
    return pathname === "/forms" || pathname.startsWith("/forms/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function titleForPath(pathname: string): string {
  if (pathname.startsWith("/crm/umbrella-projects/")) return "Detail Umbrella";
  if (pathname === "/crm/umbrella-projects") return "Umbrella Projects";
  if (pathname.startsWith("/crm/projects/")) return "Detail Proyek";
  if (pathname === "/crm/projects") return "Projects";
  if (pathname === "/crm/templates") return "Templates";
  if (pathname === "/crm/workload") return "Workload";
  if (pathname === "/crm") return "Dashboard";
  if (pathname.startsWith("/projects/")) return "Detail Proyek";
  if (pathname === "/projects") return "Projects";
  if (pathname === "/my-tasks") return "My tasks";
  if (pathname === "/forms" || pathname.startsWith("/forms/")) return "Forms";
  if (pathname === "/business") return "Business Dashboard";
  if (pathname === "/business/rab") return "Business · RAB";
  if (pathname === "/business/mo") return "Business · MO";
  return "Dashboard";
}

function NavItem({
  href,
  label,
  icon: Icon,
  pathname,
  badge,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  pathname: string;
  badge?: number;
}) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-transparent text-foreground/75 hover:bg-muted/80",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
      <span className="truncate">{label}</span>
      {badge && badge > 0 ? (
        <span
          className="bg-primary text-primary-foreground ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold"
          aria-label={`${badge} form perlu diisi`}
          title={`${badge} form perlu diisi`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}


export function PrototypeShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [notifOpen, setNotifOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    if (!store.hydrated) store.setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    const redirect = () => router.replace(landingForRole(role));
    if (pathname === "/crm") {
      router.replace("/dashboard");
      return;
    }
    if (pathname.startsWith("/business")) {
      if (!roleCanAccessBusiness(role)) redirect();
      return;
    }
    if (pathname.startsWith("/crm/umbrella-projects")) {
      if (!roleCanViewUmbrella(role)) redirect();
      return;
    }
    if (
      pathname.startsWith("/crm/projects") ||
      pathname === "/projects" ||
      pathname.startsWith("/projects/")
    ) {
      if (!roleCanBrowseProjects(role)) redirect();
      return;
    }
    if (
      pathname.startsWith("/crm/templates") ||
      pathname.startsWith("/crm/workload")
    ) {
      if (!roleCanAccessCrm(role)) redirect();
      return;
    }
    if (pathname === "/dashboard" && role === "bod") {
      redirect();
      return;
    }
    if (
      (pathname === "/my-tasks" || pathname.startsWith("/forms")) &&
      role === "bod"
    ) {
      redirect();
    }
  }, [currentUser, pathname, router]);

  const notifications = useMemo(
    () =>
      store.notifications
        .filter((notification) => notification.userId === store.currentUserId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [store.notifications, store.currentUserId],
  );
  const unread = notifications.filter((notification) => !notification.readAt).length;
  const formBadge = currentUser
    ? formsNeedingAction(store, currentUser.id) +
      simproFinanceFormsNeedingAction(store, currentUser.id)
    : 0;

  if (!store.hydrated || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse text-sm">
          Memuat prototype CRM × SIMPRO…
        </div>
      </div>
    );
  }

  const navItems = NAV_ITEMS.filter((item) => {
    switch (item.href) {
      case "/dashboard":
        return currentUser.role !== "bod";
      case "/crm/projects":
        return roleCanBrowseProjects(currentUser.role);
      case "/my-tasks":
      case "/forms":
        return currentUser.role !== "bod";
      case "/crm/umbrella-projects":
        return roleCanViewUmbrella(currentUser.role);
      case "/crm/templates":
        return currentUser.role === "admin" || currentUser.role === "pm";
      case "/crm/workload":
        return currentUser.role === "admin" || currentUser.role === "manager";
      case "/business":
        return roleCanAccessBusiness(currentUser.role);
      default:
        return false;
    }
  });

  return (
    <div className="bg-background text-foreground flex h-full min-h-0 flex-1 overflow-hidden">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden h-full min-h-0 w-[240px] shrink-0 flex-col overflow-hidden border-r md:flex">
        <div className="border-sidebar-border flex min-h-14 items-center gap-2 border-b px-3 py-3">
          <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shadow-sm">
            S
          </div>
          <div className="min-w-0">
            <div className="text-primary truncate text-lg leading-tight font-semibold">
              SIMPRO
            </div>
            <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.14em]">
              CRM Prototype
            </div>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
          <div className="text-muted-foreground px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]">
            Workspace
          </div>
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              pathname={pathname}
              badge={item.href === "/forms" ? formBadge : undefined}
            />
          ))}
        </nav>

        <div className="border-sidebar-border mt-auto shrink-0 border-t p-2">
          <div className="flex items-center gap-2">
            <UserAvatar user={currentUser} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{currentUser.name}</div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                {currentUser.role}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground shrink-0"
              title="Reset data demo"
              aria-label="Reset data demo"
              onClick={() => setResetOpen(true)}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="bg-card border-border flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden">
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-xs font-bold">
                S
              </div>
            </div>
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {titleForPath(pathname)}
            </h1>
          </div>

          <div className="flex items-center gap-2">

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Notifikasi"
                onClick={() => setNotifOpen((open) => !open)}
              >
                <Bell className="size-4" />
                {unread > 0 ? (
                  <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold">
                    {unread}
                  </span>
                ) : null}
              </Button>
              {notifOpen ? (
                <div className="bg-popover text-popover-foreground ring-foreground/10 absolute right-0 z-50 mt-2 w-[320px] rounded-xl p-2 shadow-xl ring-1">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-sm font-semibold">Notifikasi</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Tandai semua dibaca"
                        onClick={() => store.markAllNotificationsRead()}
                      >
                        <CheckCheck className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Tutup"
                        onClick={() => setNotifOpen(false)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                        Belum ada notifikasi.
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          className={cn(
                            "hover:bg-muted flex w-full flex-col gap-1 rounded-lg px-2 py-2 text-left transition-colors",
                            !notification.readAt && "bg-primary/5",
                          )}
                          onClick={() => {
                            store.markNotificationRead(notification.id);
                            setNotifOpen(false);
                            router.push(notification.href);
                          }}
                        >
                          <span className="flex items-center gap-2 text-xs font-semibold">
                            {!notification.readAt ? (
                              <span className="bg-primary size-1.5 rounded-full" />
                            ) : null}
                            {notification.title}
                          </span>
                          <span className="text-muted-foreground line-clamp-2 text-[11px]">
                            {notification.body}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {formatDateTime(notification.createdAt)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <NativeSelect
                value={currentUser.id}
                onChange={(value) => {
                  store.setCurrentUser(value);
                  const user = store.users.find((item) => item.id === value);
                  if (user) router.push(landingForRole(user.role));
                }}
                className="h-8 w-[150px] text-xs"
              >
                {store.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.role}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <UserAvatar user={currentUser} />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-6">
          {children}
        </main>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset data demo?</DialogTitle>
            <DialogDescription>
              Semua perubahan pada prototype akan hilang dan data seed awal dimuat
              kembali. File yang diunggah juga akan dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                store.reset();
                await clearPrototypeFiles();
                setResetOpen(false);
                router.push("/crm");
              }}
            >
              Reset sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
