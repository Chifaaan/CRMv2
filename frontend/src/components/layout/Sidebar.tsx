"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  CalendarDays,
  FileText,
  Building2,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Wallet,
  ChevronDown,
  LayoutGrid,
  Table2,
  PiggyBank,
  Mails,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PM_ROLES, normalizeRole } from "@/lib/role-constants";

const SIDEBAR_COLLAPSED_KEY = "simpro_sidebar_collapsed";

type NavSubItem = {
  href: string;
  label: string;
  icon?: typeof LayoutDashboard;
  roles?: string[];
  excludeRoles?: string[];
};

type NavItem = {
  href?: string;
  label: string;
  icon: typeof LayoutDashboard;
  tooltip: string;
  roles?: string[];
  /** Sembunyikan item untuk peran ini (mis. portal viewer/client). */
  excludeRoles?: string[];
  children?: NavSubItem[];
};

type NavSection = { section: string | null; items: NavItem[] };

/** Selaras `_reference/js/components/sidebar.js` — pembagian section + urutan. */
const NAV_SECTIONS: NavSection[] = [
  {
    section: null,
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        tooltip: "Ringkasan proyek, statistik, dan tugas Anda",
      },
      {
        href: "/projects",
        label: "Projects",
        icon: FolderKanban,
        tooltip: "Semua proyek — board, sprint, Gantt, dan lainnya",
      },
      {
        href: "/my-tasks",
        label: "My tasks",
        icon: ListTodo,
        tooltip:
          "Task Anda lintas proyek — board / list, sinkron dengan board proyek",
        excludeRoles: ["viewer", "client"],
      },
    ],
  },
  {
    section: "Management",
    items: [
      {
        href: "/meetings",
        label: "Meetings",
        icon: CalendarDays,
        tooltip: "Jadwal meeting, agenda, dan notulensi",
      },
      {
        href: "/notes",
        label: "Personal Notes",
        icon: FileText,
        tooltip: "Catatan pribadi — hanya Anda",
      },
      {
        href: "/letters",
        label: "Daftar Surat",
        icon: Mails,
        tooltip: "Master kategori surat dan unit kerja korespondensi",
      },
      {
        label: "Budget",
        icon: Wallet,
        tooltip: "Monitoring anggaran — dashboard & transaksi",
        excludeRoles: ["viewer", "client"],
        children: [
          {
            href: "/budget/dashboard",
            label: "Dashboard",
            icon: LayoutGrid,
            roles: ["admin"],
          },
          {
            href: "/budget",
            label: "Kelola Transaksi",
            icon: Table2,
            roles: ["admin", ...PM_ROLES, "developer"],
          },
          {
            href: "/budget/allocations",
            label: "Kelola Alokasi",
            icon: PiggyBank,
            roles: ["admin"],
          },
        ],
      },
      {
        href: "/clients",
        label: "Clients",
        icon: Building2,
        tooltip: "Perusahaan klien dan kontak",
        roles: ["admin", ...PM_ROLES],
      },
      {
        href: "/members",
        label: "Members",
        icon: Users,
        tooltip: "Anggota tim, peran, dan akun (admin)",
        roles: ["admin"],
      },
      /* assets — hidden, fitur belum diaktifkan */
    ],
  },
];

function isNavChildActive(href: string, pathname: string) {
  if (href === "/budget") {
    return pathname === "/budget";
  }
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isNavItemActive(item: NavItem, pathname: string) {
  if (item.children?.length) {
    return item.children.some((child) => isNavChildActive(child.href, pathname));
  }
  if (!item.href) return false;
  return isNavChildActive(item.href, pathname);
}

function NavLinkItem({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  if (!item.href) return null;
  const active = isNavItemActive(item, pathname);
  return (
    <Link
      href={item.href}
      title={collapsed ? item.tooltip : undefined}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors",
        collapsed
          ? "justify-center border-l-0 px-2"
          : "border-l-[3px] px-3",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-transparent text-foreground/80 hover:bg-muted/80",
      )}
    >
      <item.icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active && "text-primary",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "truncate",
          collapsed && "sr-only w-0 overflow-hidden p-0",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

function NavGroupItem({
  item,
  pathname,
  collapsed,
  open,
  onToggle,
  onNavigate,
  role,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  role: string;
}) {
  const normalized = normalizeRole(role);
  const children = (item.children ?? []).filter((child) => {
    if (child.excludeRoles?.includes(normalized)) return false;
    if (child.roles && !child.roles.includes(normalized)) return false;
    return true;
  });
  const groupActive = isNavItemActive(item, pathname);

  if (children.length === 0) return null;

  if (collapsed) {
    return (
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          title={item.tooltip}
          onClick={onToggle}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
            groupActive
              ? "bg-primary/10 text-primary"
              : "text-foreground/80 hover:bg-muted/80",
          )}
        >
          <item.icon
            className={cn("h-[18px] w-[18px] shrink-0", groupActive && "text-primary")}
            aria-hidden
          />
          <span className="sr-only">{item.label}</span>
        </button>
        {open
          ? children.map((child) => {
              const active = isNavChildActive(child.href, pathname);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  title={child.label}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-center rounded-md px-2 py-1.5 transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-muted/80",
                  )}
                >
                  {child.icon ? (
                    <child.icon className="size-4 shrink-0" aria-hidden />
                  ) : null}
                  <span className="sr-only">{child.label}</span>
                </Link>
              );
            })
          : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-md border-l-[3px] py-2 pr-2 pl-3 text-sm font-medium transition-colors",
          groupActive
            ? "border-primary bg-primary/10 text-primary"
            : "border-transparent text-foreground/80 hover:bg-muted/80",
        )}
      >
        <item.icon
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            groupActive && "text-primary",
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-border/80 pl-2">
          {children.map((child) => {
            const active = isNavChildActive(child.href, pathname);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground/75 hover:bg-muted/80",
                )}
              >
                {child.icon ? (
                  <child.icon className="size-4 shrink-0" aria-hidden />
                ) : null}
                <span className="truncate">{child.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function NavSections({
  role,
  pathname,
  collapsed,
  onNavigate,
}: {
  role: string;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    for (const { items } of NAV_SECTIONS) {
      for (const item of items) {
        if (item.children?.length && isNavItemActive(item, pathname)) {
          queueMicrotask(() =>
            setOpenGroups((prev) => ({ ...prev, [item.label]: true })),
          );
        }
      }
    }
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isGroupOpen = (item: NavItem) => {
    if (openGroups[item.label] !== undefined) return openGroups[item.label];
    return isNavItemActive(item, pathname);
  };

  return (
    <nav
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-3"
      aria-label="Navigasi utama"
    >
      {NAV_SECTIONS.map(({ section, items }) => {
        const visible = items.filter((item) => {
          const normalized = normalizeRole(role);
          if (item.excludeRoles?.includes(normalized)) return false;
          return !item.roles || item.roles.includes(normalized);
        });
        if (visible.length === 0) return null;

        return (
          <div key={section ?? "main"} className="flex flex-col gap-0.5">
            {section ? (
              <div
                className={cn(
                  "text-muted-foreground px-3 pb-1 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase",
                  collapsed && "sr-only",
                )}
                aria-hidden={collapsed}
              >
                {section}
              </div>
            ) : null}
            {visible.map((item) =>
              item.children?.length ? (
                <NavGroupItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                  open={isGroupOpen(item)}
                  onToggle={() => toggleGroup(item.label)}
                  onNavigate={onNavigate}
                  role={role}
                />
              ) : (
                <NavLinkItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ),
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const next = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
      queueMicrotask(() => setCollapsed(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const closeMobile = () => setSidebarOpen(false);

  const signOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  const headerBrand = (
    <Link
      href="/dashboard"
      className={cn(
        "flex min-w-0 items-center gap-2 font-semibold tracking-tight",
        collapsed ? "justify-center" : "",
      )}
    >
      <span
        className={cn(
          "bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-sm",
        )}
      >
        S
      </span>
      {!collapsed ? (
        <span className="text-primary truncate text-lg">SIMPRO</span>
      ) : null}
    </Link>
  );

  const footer = (
    <div className="border-sidebar-border mt-auto shrink-0 border-t p-2">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "text-muted-foreground hover:text-foreground w-full justify-start gap-3",
          collapsed && "justify-center px-0",
        )}
        title={collapsed ? "Keluar" : undefined}
        onClick={signOut}
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" />
        {!collapsed ? <span>Keluar</span> : null}
      </Button>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r md:flex",
          collapsed ? "w-[68px]" : "w-[240px]",
        )}
      >
        <div
          className={cn(
            "border-sidebar-border flex min-h-14 shrink-0 items-center gap-2 border-b px-3 py-3",
            collapsed && "flex-col gap-2 px-2",
          )}
        >
          {headerBrand}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground shrink-0"
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <NavSections
          role={role}
          pathname={pathname}
          collapsed={collapsed}
        />
        {footer}
      </aside>

      <div className="md:hidden">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="bg-sidebar text-sidebar-foreground border-sidebar-border w-[min(280px,100vw)] gap-0 p-0 sm:max-w-xs"
            showCloseButton
          >
            <SheetHeader className="border-sidebar-border border-b px-4 py-4 text-left">
              <SheetTitle className="text-primary text-lg font-semibold">
                SIMPRO
              </SheetTitle>
              <SheetDescription className="sr-only">
                Menu navigasi utama
              </SheetDescription>
            </SheetHeader>
            <NavSections
              role={role}
              pathname={pathname}
              collapsed={false}
              onNavigate={closeMobile}
            />
            <div className="border-sidebar-border mt-auto border-t p-2">
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground w-full justify-start gap-3"
                onClick={() => {
                  closeMobile();
                  void signOut();
                }}
              >
                <LogOut className="h-[18px] w-[18px]" />
                Keluar
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
