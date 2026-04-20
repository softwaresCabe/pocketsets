import { AlertTriangle, Calendar, Sparkles, Star } from "lucide-react";
import { Link } from "wouter";
import { useSets } from "@/lib/api";
import { SetCard } from "@/components/SetCard";
import { Skeleton } from "@/components/ui/skeleton";
import { findConflicts, suggestWinner } from "@/lib/conflicts";
import { useFavoriteToggle } from "@/lib/useFavoriteToggle";
import { Button } from "@/components/ui/button";
import { formatDayTimePT, humanMinutes, getCurrentFestivalDay } from "@/lib/time";
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

  const conflicts = findConflicts(favorites);
  const grouped = {
    fri: favorites.filter((s) => s.day === "fri"),
    sat: favorites.filter((s) => s.day === "sat"),
    sun: favorites.filter((s) => s.day === "sun"),
  };

  // Track stages hit — light stat line for taste
  const stagesHit = new Set(favorites.map((s) => s.stage.id)).size;
  const totalMinutes = favorites.reduce(
    (acc, s) => acc + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000,
    0,
  );

  return (
    <Shell>
      {removeDialog}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Sets locked in" value={favorites.length} testId="stat-sets" />
        <Stat label="Stages" value={stagesHit} testId="stat-stages" />
        <Stat
          label="Music time"
          value={humanMinutes(Math.round(totalMinutes))}
          testId="stat-minutes"
        />
      </div>

      {conflicts.length > 0 && (
        <section className="mt-8" data-testid="section-conflicts">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"} to resolve
          </div>
          <div className="mt-3 space-y-3">
            {conflicts.map((c, idx) => {
              const { winner, reason } = suggestWinner(c, favorites);
              const loser = winner.id === c.a.id ? c.b : c.a;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                  data-testid={`conflict-${idx}`}
                >
                  <div className="flex items-start gap-2 text-xs font-medium text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      Overlap of {humanMinutes(c.overlapMinutes)} — pick one,
                      or see both and accept you'll miss a few minutes.
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <ConflictOption set={c.a} isWinner={winner.id === c.a.id} />
                    <ConflictOption set={c.b} isWinner={winner.id === c.b.id} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        Suggested: <strong>{winner.artist.name}</strong> — {reason}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFav(loser.id, true)}
                      data-testid={`button-accept-suggestion-${idx}`}
                    >
                      Drop {loser.artist.name}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-10 space-y-8">
        {(["fri", "sat", "sun"] as const)
          .slice()
          .sort((a, b) => {
            if (a === todayDay) return -1;
            if (b === todayDay) return 1;
            return 0;
          })
          .map((day) =>
          grouped[day].length === 0 ? null : (
            <div key={day}>
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
                {grouped[day].map((s) => (
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

function ConflictOption({ set, isWinner }: { set: any; isWinner: boolean }) {
  return (
    <Link className={`block rounded-lg border p-3 text-sm hover-elevate ${
          isWinner ? "border-primary/60 bg-primary/5" : "border-border bg-card"
        }`} href={`/sets/${set.id}`} data-testid={`conflict-option-${set.id}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium truncate">{set.artist.name}</div>
          {isWinner && <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">pick</span>}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground truncate">
          <span style={{ color: set.stage.color }}>{set.stage.name}</span> ·{" "}
          <span className="tabular">{formatDayTimePT(set.startTime)}</span>
        </div>
    </Link>
  );
}

function Stat({ label, value, testId }: { label: string; value: number | string; testId: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular" data-testid={testId}>
        {value}
      </div>
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
