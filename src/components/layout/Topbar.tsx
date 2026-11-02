"use client";

import { authClient, useSession } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useUiStore } from "@/store/uiStore";
import { NotificationBell } from "./NotificationBell";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/meetings": "Meetings",
  "/clients": "Clients",
  "/members": "Members",
  "/assets": "Assets",
  "/notes": "Personal Notes",
  "/letters": "Daftar Surat",
  "/notifications": "Notifikasi",
  "/profile": "Profil",
};

const subscribeMounted = () => () => undefined;

function titleFromPath(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "letters") {
    return "Daftar Surat";
  }
  if (segments[0] === "projects") {
    const sub = segments[2];
    if (sub) {
      const subTitles: Record<string, string> = {
        board: "Kanban Board",
        backlog: "Backlog",
        sprint: "Sprint",
        gantt: "Gantt Chart",
        discussion: "Diskusi",
        maintenance: "Maintenance",
        reports: "Laporan",
        log: "Activity Log",
      };
      return subTitles[sub] ?? "Proyek";
    }
    return "Detail proyek";
  }
  return "SIMPRO";
}

export function Topbar({
  userName,
  userImage,
}: {
  userName: string;
  userImage?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { data: session } = useSession();
  const sessionImage =
    session?.user && "image" in session.user
      ? (session.user as { image?: string | null }).image
      : undefined;
  const mounted = useSyncExternalStore(
    subscribeMounted,
    () => true,
    () => false,
  );
  const avatarSrc = mounted
    ? (sessionImage ?? userImage ?? undefined)
    : (userImage ?? undefined);

  const pageTitle = titleFromPath(pathname || "/");

  return (
    <header className="bg-card border-border flex h-14 shrink-0 items-center justify-between border-b px-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          type="button"
          onClick={toggleSidebar}
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-lg font-semibold tracking-tight">
          {pageTitle}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "relative h-9 gap-2 px-2",
            )}
          >
            <Avatar className="h-8 w-8">
              {avatarSrc ? (
                <AvatarImage src={avatarSrc} alt="" />
              ) : null}
              <AvatarFallback className="bg-primary/15 text-primary text-xs">
                {userName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-30 truncate text-sm sm:inline">
              {userName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await authClient.signOut();
                router.push("/login");
                router.refresh();
              }}
            >
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
