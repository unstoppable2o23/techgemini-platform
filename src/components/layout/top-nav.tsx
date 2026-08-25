"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTenant } from "@/providers/tenant-theme-provider";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { usePresence } from "@/hooks/use-presence";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Lock,
  Menu,
  X,
  LayoutDashboard,
  Search,
  Target,
  FileText,
  Trophy,
  Library,
  Landmark,
  CalendarDays,
  MessageSquare,
  BarChart3,
  Users,
  Building2,
  Settings,
  LogOut,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  featureKey?: string;
  icon: LucideIcon;
};

const COUNSELOR_NAV_ITEMS: NavItem[] = [
  { label: "Student Management", href: "/students", icon: Users },
  { label: "Tests", href: "/tests/assign", icon: FileText },
  { label: "Universities", href: "/universities", icon: Building2 },
  { label: "Indian Colleges and Universities", href: "/indian-colleges", icon: Landmark },
  { label: "Career Library", href: "/career-library", icon: Library },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: "Career Profile", href: "/career-profile", icon: ClipboardCheck },
  { label: "College Finder", href: "/college-finder", featureKey: "collegeFinder", icon: Search },
  { label: "AI Odds Calculator", href: "/odds-calculator", featureKey: "aiOddsCalculator", icon: Target },
  { label: "Mock Tests", href: "/mock-tests", featureKey: "mockTests", icon: FileText },
  { label: "Scholarships", href: "/scholarships", featureKey: "scholarshipHub", icon: Trophy },
  { label: "Career Library", href: "/career-library", featureKey: "careerLibrary", icon: Library },
  { label: "Indian Colleges and Universities", href: "/indian-colleges", icon: Landmark },
  { label: "Appointments", href: "/appointments", featureKey: "appointments", icon: CalendarDays },
  { label: "Messages", href: "/messages", icon: MessageSquare },
];

const UNIVERSITY_ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Universities", href: "/universities", icon: Building2 },
  { label: "Indian Colleges and Universities", href: "/indian-colleges", icon: Landmark },
];

const SUPER_ADMIN_EXTRA: NavItem = {
  label: "Counselors",
  href: "/admin/counselors",
  icon: Users,
};

export function TopNav() {
  const pathname = usePathname();
  const { data: session, status: authStatus } = useSession();
  const tenant = useTenant();
  const { flags } = useFeatureFlags();
  const { status } = usePresence();
  const { notifications, unreadCount, refresh: refreshNotifications } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/auth")) return null;

  const role = session?.user?.role;
  const isCounselor = role === "COUNSELOR" || role === "SUPER_ADMIN";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isUniversityAdmin = role === "UNIVERSITY_ADMIN";
  const navItems = isUniversityAdmin
    ? UNIVERSITY_ADMIN_NAV_ITEMS
    : isCounselor
    ? isSuperAdmin
      ? [...COUNSELOR_NAV_ITEMS, SUPER_ADMIN_EXTRA]
      : COUNSELOR_NAV_ITEMS
    : STUDENT_NAV_ITEMS;

  const initials = `${session?.user?.firstName?.[0] || ""}${session?.user?.lastName?.[0] || ""}`.toUpperCase() || "U";

  const statusConfig: Record<string, { label: string; dot: string }> = {
    ONLINE: { label: "Online", dot: "bg-green-500" },
    IN_TEST: {
      label: `In-Test: ${status.testTitle || "Assessment"}`,
      dot: "bg-orange-500",
    },
    OFFLINE: { label: "Offline", dot: "bg-gray-400" },
  };

  const currentStatus = statusConfig[status.current] || statusConfig.OFFLINE;

  function canShowItem(item: NavItem): boolean {
    if (isCounselor) return true;
    if (isUniversityAdmin) return true;
    if (!item.featureKey) return true;
    return (flags as any)[item.featureKey] === true;
  }

  function handleNavClick(e: React.MouseEvent, item: NavItem) {
    if (!canShowItem(item)) {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent("open-access-denied", { detail: item })
      );
    }
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 h-16 border-b transition-all duration-300 ${scrolled ? "border-border/80 bg-white/95 shadow-[0_10px_40px_rgba(30,35,90,0.14)] backdrop-blur-xl" : "border-border/60 bg-white/80 shadow-[0_8px_30px_rgba(30,35,90,0.08)] backdrop-blur-xl"}`}>
      {/* Dynamic accent line: animated sweeping light */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent/40 via-accent to-accent/40 bg-[length:200%_100%] animate-[accent-sweep_4s_linear_infinite]" />
      {/* Floating glow orbs for a dynamic backdrop */}
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
            <ul className="hidden md:flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto no-scrollbar">
              {navItems.map((item) => {
                const enabled = canShowItem(item);
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                if (isActive) {
                  return (
                    <li key={item.href}>
                      <Link
                        href={enabled ? item.href : "#"}
                        onClick={(e: React.MouseEvent) => handleNavClick(e, item)}
                        className="group relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent/40"
                      >
                        <span className="pointer-events-none absolute inset-y-0 w-1/3 bg-white/25 blur-sm animate-[nav-sheen_3.2s_ease-in-out_infinite]" />
                        <Icon className="h-4 w-4 text-white transition-transform duration-300 group-hover:scale-110" />
                        <span className="hidden xl:inline">{item.label}</span>
                        {!enabled && <Lock className="h-3.5 w-3.5" />}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={enabled ? item.href : "#"}
                      onClick={(e: React.MouseEvent) => handleNavClick(e, item)}
                      className={`group relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 ${
                        enabled ? "hover:bg-accent/10" : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span className={`relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100 transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-blue-100 group-hover:text-blue-700 group-hover:shadow-md`}>
                        <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                        <span className="absolute inset-0 rounded-full ring-2 ring-blue-200 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </span>
                      <span className="hidden xl:inline text-muted-foreground group-hover:text-foreground transition-colors">
                        {item.label}
                      </span>
                      {!enabled && <Lock className="h-3.5 w-3.5" />}
                      <span className="pointer-events-none absolute -bottom-0.5 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-accent opacity-0 transition-all duration-300 group-hover:w-[70%] group-hover:opacity-100" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="flex shrink-0 items-center gap-2 pl-2">
              {/* Status */}
              <Badge
                variant="outline"
                className="hidden sm:inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 bg-white/70 border-border/70 shadow-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${currentStatus.dot}`} />
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${currentStatus.dot}`} />
                </span>
                <span className="text-xs font-medium">{currentStatus.label}</span>
              </Badge>

              {/* Notifications */}
              <DropdownMenu onOpenChange={(open) => {
                  if (open && unreadCount > 0) {
                    fetch("/api/notifications", { method: "PATCH" }).then(() => refreshNotifications());
                  }
                }}>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-white/70 border border-border/70 shadow-sm hover:bg-white">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80">
                  <div className="flex items-center justify-between px-4 py-2 border-b">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unreadCount > 0 && <span className="text-xs text-muted-foreground">{unreadCount} new</span>}
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
                              fetch(`/api/notifications/${n.id}`, { method: "PATCH" }).then(() => refreshNotifications());
                            }
                          }}
                          className={`block px-4 py-3 text-sm hover:bg-accent/5 transition-colors ${
                            !n.read ? "bg-accent/5 border-l-2 border-accent" : ""
                          }`}
                        >
                          <p className="font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <span className="flex h-9 w-9 shrink-0 cursor-pointer select-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-white shadow-lg shadow-accent/30 ring-2 ring-white transition-transform hover:scale-105">
                    {initials}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <div className="px-3 py-2 border-b flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-white">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session?.user?.firstName} {session?.user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session?.user?.email}
                      </p>
                    </div>
                  </div>
                  {role === "STUDENT" && (
                    <DropdownMenuItem>
                      <a href="/career-preferences" className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        Career Profile
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <a href="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Settings
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                      <span className="flex items-center gap-2 text-destructive">
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 rounded-full bg-white/70 border border-border/70 shadow-sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="default" size="sm">Sign In</Button>
            </Link>
          </div>
        )}
      </nav>

      {session && mobileMenuOpen && (
        <div className="md:hidden border-t bg-white/95">
          <ul className="grid grid-cols-2 gap-2 px-4 py-3">
            {navItems.map((item) => {
              const enabled = canShowItem(item);
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={enabled ? item.href : "#"}
                    onClick={(e: React.MouseEvent) => {
                      handleNavClick(e, item);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border transition-colors ${
                      isActive
                        ? "bg-gradient-to-r from-primary to-accent text-white border-transparent shadow-sm"
                        : "border-border text-muted-foreground bg-card hover:bg-accent/5"
                    } ${!enabled ? "opacity-50" : ""}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {!enabled && <Lock className="h-3.5 w-3.5 ml-auto" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}