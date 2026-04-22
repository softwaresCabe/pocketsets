import { ArrowRight, Calendar, Radio, Star } from "lucide-react";
import { Link } from "wouter";
import { useSets } from "@/lib/api";
import { SetCard } from "@/components/SetCard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDayTimePT, getCurrentFestivalDay } from "@/lib/time";
import { useFavoriteToggle } from "@/lib/useFavoriteToggle";
import { useNow } from "@/lib/now";

export default function MySetsPage() {
  const { data: sets, isLoading } = useSets();
  const { trigger: removeFav, dialog: removeDialog } = useFavoriteToggle();
  const { nowMs } = useNow();
  const todayDay = getCurrentFestivalDay(nowMs);

  if (isLoading || !sets) {
    return (
      <Shell>
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </Shell>
    );
  }

  const favorites = sets.filter((s) => s.isFavorite);

  if (favorites.length === 0) {
    return (
      <Shell>
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Star className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Build your weekend</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Tap the star on any set — from the schedule, lineup, or a stage page — to
            add it to My Sets. We'll flag conflicts and countdown the next one up.
          </p>
          <Link className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover-elevate" href="/schedule" data-testid="link-empty-schedule">
              Open the schedule
          </Link>
        </div>
      </Shell>
    );
  }

  const DAY_ORDER = { fri: 0, sat: 1, sun: 2 } as const;
  const todayOrder = todayDay != null ? DAY_ORDER[todayDay] : 3;
  const isPastDay = (day: "fri" | "sat" | "sun") => todayDay != null && DAY_ORDER[day] < todayOrder;

  const grouped = {
    fri: favorites.filter((s) => s.day === "fri"),
    sat: favorites.filter((s) => s.day === "sat"),
    sun: favorites.filter((s) => s.day === "sun"),
  };

  return (
    <Shell>
      {removeDialog}
      <div className="grid gap-3 sm:grid-cols-1">
        <Stat
          label="Sets locked in"
          value={favorites.length}
          testId="stat-sets"
          sub={favorites.every((s) => !s.startTime) ? "Set times haven't been announced yet — your lineup is saved and ready." : undefined}
        />
      </div>

      <Link
        href="/stages"
        className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover-elevate"
      >
        <Radio className="h-4 w-4 flex-shrink-0 text-primary" />
        <span className="text-sm font-medium">See who's playing now</span>
        <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </Link>

      <section className="mt-10 space-y-8">
        {(["fri", "sat", "sun"] as const)
          .slice()
          .sort((a, b) => {
            const rank = (d: "fri" | "sat" | "sun") => {
              if (d === todayDay) return 0;          // today first
              if (DAY_ORDER[d] > todayOrder) return 1; // future next
              return 2;                              // past last
            };
            return rank(a) - rank(b) || DAY_ORDER[a] - DAY_ORDER[b];
          })
          .map((day) =>
          grouped[day].length === 0 ? null : (
            <div key={day} className={isPastDay(day) ? "opacity-50" : undefined}>
              <div className="flex items-baseline justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {{ fri: "Friday · May 15", sat: "Saturday · May 16", sun: "Sunday · May 17" }[day]}
                  {day === todayDay && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                      Today
                    </span>
                  )}
                </h2>
                <div className="text-xs tabular text-muted-foreground">
                  {grouped[day].length} set{grouped[day].length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {grouped[day]
                  .slice()
                  .sort((a, b) => {
                    const phase = (s: typeof a) => {
                      if (!s.startTime || !s.endTime) return 1;   // tbd → treat as upcoming
                      const start = new Date(s.startTime).getTime();
                      const end = new Date(s.endTime).getTime();
                      if (nowMs >= start && nowMs < end) return 0; // live
                      if (nowMs < start) return 1;                 // upcoming
                      return 2;                                    // past
                    };
                    const pd = phase(a) - phase(b);
                    if (pd !== 0) return pd;
                    if (!a.startTime || !b.startTime) return a.artist.name.localeCompare(b.artist.name);
                    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                  })
                  .map((s) => (
                    <SetCard key={s.id} set={s} variant="row" showDay={false} />
                  ))}
              </div>
            </div>
          ),
        )}
      </section>
    </Shell>
  );
}

function Stat({ label, value, testId, sub }: { label: string; value: number | string; testId: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular" data-testid={testId}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Your PocketSets
      </div>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">My Sets</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}
