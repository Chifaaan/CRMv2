"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Boxes,
  ChartNoAxesCombined,
  CheckCheck,
  ChevronDown,
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
  roleCanAccessSimpro,
  userById,
} from "@/lib/prototype/domain";
import { simproFinanceFormsNeedingAction } from "@/lib/prototype/simpro-forms";
import { clearPrototypeFiles } from "@/lib/prototype/files";
import { NativeSelect, UserAvatar } from "./ui";

const NAV_SIMPRO = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/my-tasks", label: "My tasks", icon: ListTodo },
  { href: "/forms", label: "Forms", icon: CheckCheck },
];

const NAV_CRM = [
  { href: "/crm", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm/projects", label: "Projects", icon: FolderKanban },
  { href: "/crm/groups", label: "Groups", icon: Users },
  { href: "/crm/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/crm/workload", label: "Workload", icon: Gauge },
];

const NAV_BUSINESS = [
  { href: "/business", label: "Business", icon: ChartNoAxesCombined },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/crm") return pathname === "/crm";
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function titleForPath(pathname: string): string {
  if (pathname.startsWith("/crm/projects/")) return "Detail Proyek";
  if (pathname === "/crm/projects") return "Projects";
  if (pathname === "/crm/groups") return "Groups";
  if (pathname === "/crm/templates") return "Templates";
  if (pathname === "/crm/workload") return "Workload";
  if (pathname.startsWith("/business")) return "Business";
  if (pathname.startsWith("/crm")) return "CRM";
  if (pathname.startsWith("/projects/")) return "Detail Proyek";
  if (pathname === "/projects") return "Projects";
  if (pathname === "/my-tasks") return "My tasks";
  if (pathname === "/forms") return "Forms";
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

function ModuleMenuItem({
  icon: Icon,
  title,
  subtitle,
  active,
  disabled,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  title: string;
  subtitle: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
        disabled
          ? "cursor-not-allowed opacity-45"
          : "hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{title}</span>
          {active ? (
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
              Dibuka
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate text-xs">
          {disabled ? "Tidak tersedia untuk role ini" : subtitle}
        </span>
      </span>
    </button>
  );
}

export function PrototypeShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const store = usePrototypeStore();
  const currentUser = userById(store, store.currentUserId);
  const [notifOpen, setNotifOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [moduleOpen, setModuleOpen] = useState(false);

  useEffect(() => {
    if (!store.hydrated) store.setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setModuleOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!currentUser) return;
    const isCrm = pathname.startsWith("/crm");
    const isBusiness = pathname.startsWith("/business");
    const isFormsPath = pathname === "/forms" || pathname.startsWith("/forms/");
    if (isCrm && !roleCanAccessCrm(currentUser.role)) {
      router.replace(landingForRole(currentUser.role));
    }
    if (isBusiness && !roleCanAccessBusiness(currentUser.role)) {
      router.replace(landingForRole(currentUser.role));
    }
    if (
      !isCrm &&
      !isBusiness &&
      !roleCanAccessSimpro(currentUser.role) &&
      !(currentUser.role === "finance" && isFormsPath)
    ) {
      router.replace(landingForRole(currentUser.role));
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

  const showCrm = roleCanAccessCrm(currentUser.role);
  const showSimpro = roleCanAccessSimpro(currentUser.role);
  const showBusiness = roleCanAccessBusiness(currentUser.role);
  const showSimproForms = currentUser.role === "finance";
  const simproNav = showSimpro
    ? NAV_SIMPRO
    : showSimproForms
      ? NAV_SIMPRO.filter((item) => item.href === "/forms")
      : [];
  const isCrm = pathname.startsWith("/crm");
  const isBusinessPath = pathname.startsWith("/business");

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

        <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
          {simproNav.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              <div className="text-muted-foreground px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]">
                SIMPRO
              </div>
              {simproNav.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  pathname={pathname}
                  badge={item.href === "/forms" ? formBadge : undefined}
                />
              ))}
            </div>
          ) : null}
          {showCrm ? (
            <div className="flex flex-col gap-0.5">
              <div className="text-muted-foreground px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]">
                CRM
              </div>
              {NAV_CRM.filter((item) => {
                if (item.href === "/crm/workload") {
                  return (
                    currentUser.role === "admin" ||
                    currentUser.role === "manager"
                  );
                }
                if (item.href === "/crm/templates") {
                  return (
                    currentUser.role === "admin" || currentUser.role === "pm"
                  );
                }
                return true;
              }).map((item) => (
                <NavItem key={item.href} {...item} pathname={pathname} />
              ))}
            </div>
          ) : null}
          {showBusiness ? (
            <div className="flex flex-col gap-0.5">
              <div className="text-muted-foreground px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]">
                Business
              </div>
              {NAV_BUSINESS.map((item) => (
                <NavItem key={item.href} {...item} pathname={pathname} />
              ))}
            </div>
          ) : null}
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
            <div className="relative hidden sm:block">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 px-2.5"
                aria-haspopup="menu"
                aria-expanded={moduleOpen}
                onClick={() => setModuleOpen((open) => !open)}
              >
                <Boxes className="text-primary size-4" />
                <span className="text-xs font-semibold">
                  {isBusinessPath ? "BUSINESS" : isCrm ? "CRM" : "SIMPRO"}
                </span>
                <ChevronDown
                  className={cn(
                    "text-muted-foreground size-3.5 transition-transform",
                    moduleOpen && "rotate-180",
                  )}
                />
              </Button>

              {moduleOpen ? (
                <>
                  <button
                    type="button"
                    aria-hidden
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setModuleOpen(false)}
                  />
                  <div className="bg-popover text-popover-foreground ring-foreground/10 absolute right-0 z-50 mt-2 w-[320px] rounded-xl p-2 shadow-xl ring-1">
                    <div className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Modul Connector
                    </div>
                    <div className="border-t" />
                    <div className="space-y-1 pt-1">
                      <ModuleMenuItem
                        icon={FolderKanban}
                        title="SIMPRO"
                        subtitle="Project, task, board, dan My Tasks"
                        active={!isCrm}
                        disabled={!showSimpro}
                        onClick={() => {
                          setModuleOpen(false);
                          if (!isCrm) return;
                          router.push("/dashboard");
                        }}
                      />
                      <ModuleMenuItem
                        icon={Gauge}
                        title="CRM"
                        subtitle="Journey, pitching, form, dan finance"
                        active={isCrm}
                        disabled={!showCrm}
                        onClick={() => {
                          setModuleOpen(false);
                          if (isCrm) return;
                          router.push("/crm");
                        }}
                      />
                      <ModuleMenuItem
                        icon={ChartNoAxesCombined}
                        title="Business"
                        subtitle="Revenue, cost, dan margin per unit bisnis"
                        active={isBusinessPath}
                        disabled={!showBusiness}
                        onClick={() => {
                          setModuleOpen(false);
                          if (isBusinessPath) return;
                          router.push("/business");
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>

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
                  const user = userById(store, value);
                  if (user && !roleCanAccessCrm(user.role) && pathname.startsWith("/crm")) {
                    router.push(landingForRole(user.role));
                  }
                  if (
                    user &&
                    !roleCanAccessSimpro(user.role) &&
                    !pathname.startsWith("/crm")
                  ) {
                    router.push("/crm");
                  }
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
