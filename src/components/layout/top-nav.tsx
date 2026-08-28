"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTenant } from "@/providers/tenant-theme-provider";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { usePresence } from "@/hooks/use-presence";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  closeAllDropdowns,
} from "@/components/ui/dropdown-menu";
import {
  STUDENT_GROUPS,
  COUNSELOR_GROUPS,
  UNIVERSITY_ADMIN_NAV_ITEMS,
  SUPER_ADMIN_EXTRA,
  canShowItem,
  isGroupActive,
  type NavChild,
  type NavGroup,
} from "@/components/layout/nav-config";
import {
  Bell,
  Lock,
  X,
  LayoutDashboard,
  Bookmark,
  MoreHorizontal,
  ChevronDown,
  Compass,
  BrainCircuit,
  Settings,
  LogOut,
  Users,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

function dispatchDenied(item: NavChild) {
  window.dispatchEvent(new CustomEvent("open-access-denied", { detail: item }));
}

function NavLink({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-accent/30"
          : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

function BottomNavButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
        active ? "text-accent" : "text-muted-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function NavDropdown({
  group,
  pathname,
  flags,
}: {
  group: NavGroup;
  pathname: string;
  flags: any;
}) {
  const active = isGroupActive(group, pathname);
  const Icon = group.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${group.label} menu`}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          active
            ? "bg-accent/10 text-accent"
            : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{group.label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-2">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {group.label}
        </p>
        {group.items.map((item) => {
          const enabled = canShowItem(flags, item);
          const ItemIcon = item.icon;
          return (
            <DropdownMenuItem key={item.href + item.label}>
              <Link
                href={item.href}
                onClick={(e) => {
                  if (!enabled) {
                    e.preventDefault();
                    dispatchDenied(item);
                  }
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg px-2 py-2",
                  !enabled && "bg-amber-50/60 ring-1 ring-inset ring-amber-200"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    item.primary
                      ? "bg-gradient-to-br from-primary to-accent text-white"
                      : "bg-blue-50 text-blue-600"
                  )}
                >
                  <ItemIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {item.label}
                    {!enabled && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </span>
                  {item.description && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                  {!enabled && (
                    <span className="mt-0.5 block text-[11px] font-medium text-amber-600">
                      Available through your plan
                    </span>
                  )}
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { data: session, status: authStatus } = useSession();
  const tenant = useTenant();
  const { flags } = useFeatureFlags();
  const { status } = usePresence();
  const { notifications, unreadCount, refresh: refreshNotifications } =
    useNotifications();
  const [scrolled, setScrolled] = useState(false);
  const [sheet, setSheet] = useState<{
    title: string;
    items: NavChild[];
  } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close any open menu (sheet + dropdowns) on navigation.
  useEffect(() => {
    setSheet(null);
    closeAllDropdowns();
  }, [pathname]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  if (pathname.startsWith("/auth")) return null;

  const role = session?.user?.role;
  const isCounselor = role === "COUNSELOR" || role === "SUPER_ADMIN";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isUniversityAdmin = role === "UNIVERSITY_ADMIN";
  const isStudent = role === "STUDENT";
  const showStudentGroups = isStudent && authStatus === "authenticated";
  const showCounselorGroups = isCounselor && authStatus === "authenticated";
  const showUniversityAdmin = isUniversityAdmin && authStatus === "authenticated";

  let counselorGroups = COUNSELOR_GROUPS;
  if (isSuperAdmin) {
    counselorGroups = COUNSELOR_GROUPS.map((g) =>
      g.label === "More"
        ? { ...g, items: [...g.items, ...SUPER_ADMIN_EXTRA] }
        : g
    );
  }

  const initials =
    `${session?.user?.firstName?.[0] || ""}${session?.user?.lastName?.[0] || ""}`.toUpperCase() ||
    "U";

  const statusConfig: Record<string, { label: string; dot: string }> = {
    ONLINE: { label: "Online", dot: "bg-green-500" },
    IN_TEST: {
      label: `In-Test: ${status.testTitle || "Assessment"}`,
      dot: "bg-orange-500",
    },
    OFFLINE: { label: "Offline", dot: "bg-gray-400" },
  };

  const currentStatus = statusConfig[status.current] || statusConfig.OFFLINE;

  const moreSheetItems: NavChild[] = [
    ...STUDENT_GROUPS[1].items, // Plan
    ...STUDENT_GROUPS[3].items, // Connect
    ...STUDENT_GROUPS[4].items, // More
    { label: "Profile", href: "/career-profile", icon: ClipboardCheck },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-16 border-b transition-all duration-300 ${
        scrolled
          ? "border-border/80 bg-white/95 shadow-[0_10px_40px_rgba(30,35,90,0.14)] backdrop-blur-xl"
          : "border-border/60 bg-white/80 shadow-[0_8px_30px_rgba(30,35,90,0.08)] backdrop-blur-xl"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent/40 via-accent to-accent/40 bg-[length:200%_100%] animate-[accent-sweep_4s_linear_infinite]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-12 left-[18%] h-28 w-28 rounded-full bg-accent/15 blur-2xl animate-[orb-float_9s_ease-in-out_infinite]" />
        <div className="absolute -top-14 right-[28%] h-32 w-32 rounded-full bg-primary/10 blur-2xl animate-[orb-float_12s_ease-in-out_infinite_reverse]" />
      </div>
      <nav className="mx-auto flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/dashboard" className="flex items-center">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.brandName || "Brand"}
                className="h-14 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-md">
                <LayoutDashboard className="h-5 w-5" />
              </span>
            )}
          </Link>
        </div>

        {authStatus === "authenticated" ? (
          <>
            {showStudentGroups ? (
              <ul className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
                <li>
                  <NavLink
                    href="/dashboard"
                    active={pathname === "/dashboard" || pathname.startsWith("/dashboard/")}
                    icon={LayoutDashboard}
                    label="Home"
                  />
                </li>
                {STUDENT_GROUPS.map((group) => (
                  <li key={group.label}>
                    <NavDropdown group={group} pathname={pathname} flags={flags} />
                  </li>
                ))}
                <li>
                  <NavLink
                    href="/saved"
                    active={pathname.startsWith("/saved")}
                    icon={Bookmark}
                    label="Saved"
                  />
                </li>
              </ul>
            ) : showCounselorGroups ? (
              <ul className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
                <li>
                  <NavLink
                    href="/dashboard"
                    active={pathname === "/dashboard" || pathname.startsWith("/dashboard/")}
                    icon={LayoutDashboard}
                    label="Home"
                  />
                </li>
                {counselorGroups.map((group) => (
                  <li key={group.label}>
                    <NavDropdown group={group} pathname={pathname} flags={flags} />
                  </li>
                ))}
              </ul>
            ) : showUniversityAdmin ? (
              <ul className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
                <li>
                  <NavLink
                    href="/dashboard"
                    active={pathname === "/dashboard" || pathname.startsWith("/dashboard/")}
                    icon={LayoutDashboard}
                    label="Home"
                  />
                </li>
                {UNIVERSITY_ADMIN_NAV_ITEMS.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-accent/30"
                            : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <div className="flex shrink-0 items-center gap-2 pl-2">
              <Badge
                variant="outline"
                className="hidden shrink-0 items-center gap-2 rounded-full border-border/70 bg-white/70 px-3 py-1.5 shadow-sm sm:inline-flex"
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${currentStatus.dot}`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${currentStatus.dot}`}
                  />
                </span>
                <span className="text-xs font-medium">{currentStatus.label}</span>
              </Badge>

              <DropdownMenu
                onOpenChange={(open) => {
                  if (open && unreadCount > 0) {
                    fetch("/api/notifications", { method: "PATCH" }).then(() =>
                      refreshNotifications()
                    );
                  }
                }}
              >
                <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-white/70 shadow-sm hover:bg-white">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between border-b px-4 py-2">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No notifications yet
                      </p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <Link
                          key={n.id}
                          href={n.linkUrl || "#"}
                          onClick={() => {
                            if (!n.read) {
                              fetch(`/api/notifications/${n.id}`, {
                                method: "PATCH",
                              }).then(() => refreshNotifications());
                            }
                          }}
                          className={cn(
                            "block px-4 py-3 text-sm hover:bg-accent/5",
                            !n.read
                              ? "border-l-2 border-accent bg-accent/5"
                              : ""
                          )}
                        >
                          <p className="font-medium">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {n.message}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <span className="flex h-9 w-9 shrink-0 cursor-pointer select-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-white shadow-lg shadow-accent/30 ring-2 ring-white transition-transform hover:scale-105">
                    {initials}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-3 border-b px-3 py-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-white">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {session?.user?.firstName} {session?.user?.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session?.user?.email}
                      </p>
                    </div>
                  </div>
                  {role === "STUDENT" && (
                    <DropdownMenuItem>
                      <Link href="/career-profile" className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Link href="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <span className="flex items-center gap-2 text-destructive">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="default" size="sm">
                Sign In
              </Button>
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile bottom navigation for students */}
      {isStudent && authStatus === "authenticated" && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label="Mobile navigation"
        >
          <ul className="grid grid-cols-5 items-stretch">
            <li>
              <NavLink
                href="/dashboard"
                active={pathname === "/dashboard" || pathname.startsWith("/dashboard/")}
                icon={LayoutDashboard}
                label="Home"
              />
            </li>
            <li>
              <BottomNavButton
                active={isGroupActive(STUDENT_GROUPS[0], pathname)}
                icon={Compass}
                label="Discover"
                onClick={() =>
                  setSheet({ title: "Discover", items: STUDENT_GROUPS[0].items })
                }
              />
            </li>
            <li>
              <BottomNavButton
                active={isGroupActive(STUDENT_GROUPS[2], pathname)}
                icon={BrainCircuit}
                label="Assess"
                onClick={() =>
                  setSheet({ title: "Assess", items: STUDENT_GROUPS[2].items })
                }
              />
            </li>
            <li>
              <NavLink
                href="/saved"
                active={pathname.startsWith("/saved")}
                icon={Bookmark}
                label="Saved"
              />
            </li>
            <li>
              <BottomNavButton
                active={false}
                icon={MoreHorizontal}
                label="More"
                onClick={() => setSheet({ title: "More", items: moreSheetItems })}
              />
            </li>
          </ul>
        </nav>
      )}

      {/* Mobile bottom navigation for counselors */}
      {isCounselor && authStatus === "authenticated" && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label="Mobile navigation"
        >
          <ul className="grid grid-cols-5 items-stretch">
            <li>
              <NavLink
                href="/dashboard"
                active={pathname === "/dashboard" || pathname.startsWith("/dashboard/")}
                icon={LayoutDashboard}
                label="Home"
              />
            </li>
            <li>
              <BottomNavButton
                active={isGroupActive(counselorGroups[0], pathname)}
                icon={Users}
                label="Students"
                onClick={() =>
                  setSheet({ title: "Students", items: counselorGroups[0].items })
                }
              />
            </li>
            <li>
              <BottomNavButton
                active={isGroupActive(counselorGroups[2], pathname)}
                icon={counselorGroups[2].icon}
                label="Resources"
                onClick={() =>
                  setSheet({ title: "Resources", items: counselorGroups[2].items })
                }
              />
            </li>
            <li>
              <BottomNavButton
                active={isGroupActive(counselorGroups[3], pathname)}
                icon={counselorGroups[3].icon}
                label="Connect"
                onClick={() =>
                  setSheet({ title: "Connect", items: counselorGroups[3].items })
                }
              />
            </li>
            <li>
              <BottomNavButton
                active={isGroupActive(counselorGroups[5], pathname)}
                icon={MoreHorizontal}
                label="More"
                onClick={() =>
                  setSheet({ title: "More", items: counselorGroups[5].items })
                }
              />
            </li>
          </ul>
        </nav>
      )}

      {/* Mobile sheet (shared by student + counselor) */}
      {sheet && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={sheet.title}
        >
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheet(null)}
          />
          <div className="relative max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-border bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{sheet.title}</p>
              <button
                onClick={() => setSheet(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="space-y-1">
              {sheet.items.map((item) => {
                const enabled = canShowItem(flags, item);
                const Icon = item.icon;
                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={enabled ? item.href : "#"}
                      onClick={(e) => {
                        if (!enabled) {
                          e.preventDefault();
                          dispatchDenied(item);
                        }
                        setSheet(null);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-foreground",
                        !enabled && "bg-amber-50/60 ring-1 ring-inset ring-amber-200"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          item.primary
                            ? "bg-gradient-to-br from-primary to-accent text-white"
                            : "bg-blue-50 text-blue-600"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {!enabled && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => {
                setSheet(null);
                signOut({ callbackUrl: "/" });
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
