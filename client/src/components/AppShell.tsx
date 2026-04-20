import * as React from "react";
import { Link, useLocation } from "wouter";
import {
  Calendar,
  Home,
  MapPin,
  Menu,
  Radio,
  Settings,
  Star,
  Users,
  Bell,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useFestival, useFavorites, useAnnouncements } from "@/lib/api";
import { useNow } from "@/lib/now";
import { partsInPT } from "@/lib/time";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
};

const NAV: NavItem[] = [
  { to: "/", label: "Now", icon: Home, testId: "link-now" },
  { to: "/my-sets", label: "My Sets", icon: Star, testId: "link-my-sets" },
  { to: "/schedule", label: "Schedule", icon: Calendar, testId: "link-schedule" },
  { to: "/map", label: "Map", icon: MapPin, testId: "link-map" },
  { to: "/lineup", label: "Lineup", icon: Users, testId: "link-lineup" },
  { to: "/stages", label: "Stages", icon: Radio, testId: "link-stages" },
  { to: "/announcements", label: "Alerts", icon: Bell, testId: "link-announcements" },
  { to: "/settings", label: "Settings", icon: Settings, testId: "link-settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: festival } = useFestival();
  const { data: favorites } = useFavorites();
  const { data: announcements } = useAnnouncements();
  const { nowMs, isSimulated } = useNow();
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Close menu on navigation
  React.useEffect(() => { setMenuOpen(false); }, [location]);

  const favCount = favorites?.length ?? 0;
  const alertCount = announcements?.length ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop / tablet sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex"
        aria-label="Primary navigation"
      >
        <div className="px-5 pt-6 pb-5">
          <Link
            href="/"
            data-testid="link-logo"
            className="inline-flex items-center gap-2.5 text-foreground hover:text-primary transition-colors"
          >
            <span className="text-primary">
              <Logo size={30} />
            </span>
            <span className="font-semibold tracking-tight text-lg">PocketSets</span>
          </Link>
          {festival && (
            <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
              <div className="font-medium text-foreground">{festival.name}</div>
              <div>{festival.location}</div>
            </div>
          )}
        </div>
        <nav className="flex-1 px-3 pb-4">
          <ul className="space-y-0.5">
            {NAV.map((n) => {
              const active = isActive(location, n.to);
              const Icon = n.icon;
              const badge =
                n.to === "/my-sets" && favCount > 0
                  ? favCount
                  : n.to === "/announcements" && alertCount > 0
                    ? alertCount
                    : null;
              return (
                <li key={n.to}>
                  <Link
                    href={n.to}
                    data-testid={n.testId}
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      "hover-elevate",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-sidebar-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className={cn("h-4 w-4", active && "text-primary")} />
                      {n.label}
                    </span>
                    {badge !== null && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4 text-xs text-muted-foreground">
          <FestivalClock nowMs={nowMs} isSimulated={isSimulated} />
        </div>
      </aside>

      {/* Main content area */}
      <main className="md:pl-64 md:pb-0 min-h-screen" style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}>
        {/* Mobile top bar — padded for Dynamic Island / notch */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:hidden"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))", paddingBottom: "12px" }}
        >
          <Link
            href="/"
            data-testid="link-logo-mobile"
            className="flex items-center gap-2 text-foreground"
          >
            <span className="text-primary">
              <Logo size={24} />
            </span>
            <span className="font-semibold">PocketSets</span>
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="More options"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {menuOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                {/* Dropdown panel */}
                <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-background/95 shadow-xl backdrop-blur">
                  {/* Festival clock */}
                  <div className="border-b border-border px-4 py-3">
                    <FestivalClock nowMs={nowMs} isSimulated={isSimulated} compact />
                  </div>
                  {/* Extra nav items */}
                  {NAV.slice(5).map((n) => {
                    const active = isActive(location, n.to);
                    const Icon = n.icon;
                    const badge =
                      n.to === "/announcements" && alertCount > 0 ? alertCount : null;
                    return (
                      <Link
                        key={n.to}
                        href={n.to}
                        className={cn(
                          "flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-secondary",
                          active ? "text-primary font-medium" : "text-foreground",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          {n.label}
                        </span>
                        {badge !== null && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
        {children}
      </main>

      {/* Mobile bottom navigation — padded for home indicator */}
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-sidebar/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV.slice(0, 5).map((n) => {
          const active = isActive(location, n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              href={n.to}
              data-testid={`mobile-${n.testId}`}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function isActive(loc: string, to: string): boolean {
  if (to === "/") return loc === "/";
  return loc === to || loc.startsWith(`${to}/`);
}

function FestivalClock({
  nowMs,
  isSimulated,
  compact = false,
}: {
  nowMs: number;
  isSimulated: boolean;
  compact?: boolean;
}) {
  const iso = new Date(nowMs).toISOString();
  const { hour, minute } = partsInPT(iso);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
  }).format(new Date(nowMs));
  const mm = String(minute).padStart(2, "0");
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs tabular" data-testid="text-clock">
        <span className="font-medium text-foreground">
          {hour12}:{mm} {ampm}
        </span>
        {isSimulated && (
          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
            demo
          </span>
        )}
      </div>
    );
  }
  return (
    <div data-testid="text-clock">
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold text-foreground tabular">
          {hour12}:{mm}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {ampm} · {weekday} · PT
        </span>
      </div>
      {isSimulated ? (
        <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          demo time active
        </div>
      ) : (
        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          festival clock
        </div>
      )}
    </div>
  );
}
