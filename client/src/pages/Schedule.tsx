import * as React from "react";
import { Link } from "wouter";
import { Star } from "lucide-react";
import { useSets, useStages } from "@/lib/api";
import { useNow } from "@/lib/now";
import { toMs, formatTimePT, partsInPT, durationMinutes } from "@/lib/time";
import { useToggleFavorite } from "@/lib/mutations";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { SetWithDetails, Stage } from "@shared/schema";

type Day = "fri" | "sat" | "sun";

// Schedule grid geometry
const PX_PER_MINUTE = 2; // 120px per hour → readable on desktop
const COL_WIDTH = 184;

// Each festival day is rendered on a single continuous axis from 6pm PT
// through 6am PT the following morning (12 hours). The grid shows 30-min ticks.
const DAY_START_HOUR_PT = 18; // 6pm
const DAY_LENGTH_MINUTES = 12 * 60; // 12h spread

function minutesFromDayStart(iso: string, day: Day): number {
  const { hour, minute, date } = partsInPT(iso);
  const DAY_DATE = { fri: 15, sat: 16, sun: 17 }[day];
  const h = hour < 6 ? hour + 24 : hour;
  const dateDelta = date === DAY_DATE ? 0 : 24 * 60;
  return dateDelta + (h - DAY_START_HOUR_PT) * 60 + minute;
}

export default function SchedulePage() {
  const { data: sets, isLoading } = useSets();
  const { data: stages } = useStages();
  const { nowMs } = useNow();

  const [day, setDay] = React.useState<Day>(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#\/?schedule#/, "") : "";
    if (hash === "fri" || hash === "sat" || hash === "sun") return hash;
    return "fri";
  });

  const gridRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-scroll to current time marker when the tab matches today's festival day
  React.useEffect(() => {
    if (!gridRef.current || !sets?.length) return;
    const nowIso = new Date(nowMs).toISOString();
    const { hour, date } = partsInPT(nowIso);
    const DAY_DATE = { fri: 15, sat: 16, sun: 17 }[day];
    const effectiveDate = hour < 6 ? date - 1 : date;
    if (effectiveDate !== DAY_DATE) return;
    const fromStart = minutesFromDayStart(nowIso, day);
    if (fromStart < 0 || fromStart > DAY_LENGTH_MINUTES) return;
    gridRef.current.scrollTop = Math.max(0, fromStart * PX_PER_MINUTE - 200);
  }, [day, sets, nowMs]);

  if (isLoading || !sets || !stages) {
    return <SchedSkeleton />;
  }

  const daySets = sets.filter((s) => s.day === day);
  const nowIso = new Date(nowMs).toISOString();
  const nowMinutes = (() => {
    const { hour, date } = partsInPT(nowIso);
    const DAY_DATE = { fri: 15, sat: 16, sun: 17 }[day];
    const effectiveDate = hour < 6 ? date - 1 : date;
    if (effectiveDate !== DAY_DATE) return null;
    return minutesFromDayStart(nowIso, day);
  })();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        EDC Las Vegas 2026
      </div>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          {daySets.length} sets on {dayLabel(day)} · tap a block to open set details
        </p>
      </div>

      <Tabs value={day} onValueChange={(v) => setDay(v as Day)} className="mt-6">
        <TabsList className="w-full justify-start bg-secondary/40">
          <TabsTrigger value="fri" data-testid="tab-fri" className="flex-1 md:flex-none md:px-8">
            <span className="text-xs font-semibold uppercase tracking-wider">Fri</span>
            <span className="ml-2 text-xs text-muted-foreground">May 15</span>
          </TabsTrigger>
          <TabsTrigger value="sat" data-testid="tab-sat" className="flex-1 md:flex-none md:px-8">
            <span className="text-xs font-semibold uppercase tracking-wider">Sat</span>
            <span className="ml-2 text-xs text-muted-foreground">May 16</span>
          </TabsTrigger>
          <TabsTrigger value="sun" data-testid="tab-sun" className="flex-1 md:flex-none md:px-8">
            <span className="text-xs font-semibold uppercase tracking-wider">Sun</span>
            <span className="ml-2 text-xs text-muted-foreground">May 17</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Mobile: vertical list grouped by time */}
      <div className="mt-6 md:hidden">
        <MobileSchedule sets={daySets} />
      </div>

      {/* Desktop grid */}
      <div
        ref={gridRef}
        className="mt-6 hidden md:block relative overflow-auto rounded-xl border border-border bg-card/40 scrollbar-thin"
        style={{ height: "calc(100vh - 240px)", minHeight: 500 }}
      >
        <ScheduleGrid sets={daySets} stages={stages} nowMinutes={nowMinutes} />
      </div>
    </div>
  );
}

function ScheduleGrid({
  sets,
  stages,
  nowMinutes,
}: {
  sets: SetWithDetails[];
  stages: Stage[];
  nowMinutes: number | null;
}) {
  const totalHeight = DAY_LENGTH_MINUTES * PX_PER_MINUTE;
  const stageOrdered = [...stages].sort((a, b) => a.displayOrder - b.displayOrder);

  const ticks = Array.from({ length: DAY_LENGTH_MINUTES / 60 + 1 }, (_, i) => i);

  return (
    <div className="relative flex min-w-max">
      {/* Time axis */}
      <div
        className="sticky left-0 z-20 w-16 flex-shrink-0 border-r border-border bg-card/80 backdrop-blur"
        style={{ height: totalHeight }}
      >
        <div className="sticky top-0 z-10 h-12 border-b border-border bg-card" />
        {ticks.map((i) => {
          const hourPT = (DAY_START_HOUR_PT + i) % 24;
          const label =
            hourPT === 0
              ? "12 AM"
              : hourPT < 12
              ? `${hourPT} AM`
              : hourPT === 12
              ? "12 PM"
              : `${hourPT - 12} PM`;
          return (
            <div
              key={i}
              className="absolute left-0 right-0 flex items-start justify-end px-2 pt-0.5 text-[10px] font-semibold tabular uppercase tracking-wider text-muted-foreground"
              style={{ top: 48 + i * 60 * PX_PER_MINUTE }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Stage columns */}
      <div className="flex flex-1">
        {stageOrdered.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            sets={sets.filter((s) => s.stageId === stage.id)}
            totalHeight={totalHeight}
            day={sets[0]?.day as Day | undefined}
          />
        ))}
      </div>

      {/* Now indicator */}
      {nowMinutes !== null && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
          style={{ top: 48 + nowMinutes * PX_PER_MINUTE }}
        >
          <div className="ml-16 flex-1 border-t-2 border-primary" />
          <div className="absolute left-16 -translate-y-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
            NOW
          </div>
        </div>
      )}
    </div>
  );
}

function StageColumn({
  stage,
  sets,
  totalHeight,
  day,
}: {
  stage: Stage;
  sets: SetWithDetails[];
  totalHeight: number;
  day?: Day;
}) {
  const toggle = useToggleFavorite();
  const hourPattern = Array.from({ length: DAY_LENGTH_MINUTES / 60 + 1 }, (_, i) => i);

  return (
    <div
      className="relative flex-shrink-0 border-r border-border"
      style={{ width: COL_WIDTH, height: totalHeight }}
    >
      {/* Sticky stage header */}
      <div
        className="sticky top-0 z-10 h-12 border-b border-border bg-card/95 px-3 py-2 backdrop-blur"
        style={{ boxShadow: `inset 0 -2px 0 ${stage.color}` }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: stage.color }}>
          {stage.shortCode}
        </div>
        <div className="text-xs font-medium text-foreground truncate">
          {stage.name}
        </div>
      </div>

      {/* Horizontal grid lines */}
      {hourPattern.map((i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-border/50"
          style={{ top: 48 + i * 60 * PX_PER_MINUTE }}
        />
      ))}

      {/* Set blocks */}
      {day &&
        sets.map((set) => {
          const top = 48 + minutesFromDayStart(set.startTime, day) * PX_PER_MINUTE;
          const height = Math.max(
            44,
            durationMinutes(set.startTime, set.endTime) * PX_PER_MINUTE - 2,
          );
          return (
            <Link className={cn(
                  "absolute left-1.5 right-1.5 rounded-md border p-2 text-[11px] text-foreground hover-elevate active-elevate-2 overflow-hidden",
                  set.isFavorite ? "border-primary/40" : "border-transparent",
                )} key={set.id} href={`/sets/${set.id}`} data-testid={`block-set-${set.id}`}>
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold leading-tight" data-testid={`text-block-artist-${set.id}`}>
                      {set.artist.name}
                    </div>
                    <div className="mt-0.5 text-[10px] tabular text-muted-foreground">
                      {formatTimePT(set.startTime)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle.mutate({ setId: set.id, isFavorite: set.isFavorite });
                    }}
                    className="p-0.5 text-muted-foreground hover:text-primary"
                    aria-label={set.isFavorite ? "Remove favorite" : "Add favorite"}
                    data-testid={`button-block-favorite-${set.id}`}
                  >
                    <Star className={cn("h-3.5 w-3.5", set.isFavorite && "fill-primary text-primary")} />
                  </button>
                </div>
                {height > 60 && set.artist.genres && (
                  <div className="mt-1 text-[10px] text-muted-foreground truncate">
                    {set.artist.genres.split(",")[0]}
                  </div>
                )}
            </Link>
          );
        })}
    </div>
  );
}

function MobileSchedule({ sets }: { sets: SetWithDetails[] }) {
  const sorted = [...sets].sort((a, b) => toMs(a.startTime) - toMs(b.startTime));
  // Group by start-hour for readability
  const groups = new Map<string, SetWithDetails[]>();
  for (const s of sorted) {
    const key = formatTimePT(s.startTime).replace(/:\d{2}/, ":00");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([hour, items]) => (
        <section key={hour}>
          <div className="sticky top-14 z-10 mb-2 bg-background/95 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
            {hour}
          </div>
          <div className="space-y-2">
            {items.map((s) => (
              <MobileSetRow key={s.id} set={s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MobileSetRow({ set }: { set: SetWithDetails }) {
  const toggle = useToggleFavorite();
  return (
    <Link className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover-elevate" href={`/sets/${set.id}`} data-testid={`mobile-row-${set.id}`}>
        <div
          className="h-10 w-1 flex-shrink-0 rounded-full"
          style={{ backgroundColor: set.stage.color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{set.artist.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground truncate">
            <span style={{ color: set.stage.color }}>{set.stage.shortCode}</span> ·{" "}
            <span className="tabular">
              {formatTimePT(set.startTime)} – {formatTimePT(set.endTime)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle.mutate({ setId: set.id, isFavorite: set.isFavorite });
          }}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
            set.isFavorite
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
          aria-label={set.isFavorite ? "Remove favorite" : "Add favorite"}
          data-testid={`mobile-row-favorite-${set.id}`}
        >
          <Star className={cn("h-4 w-4", set.isFavorite && "fill-current")} />
        </button>
    </Link>
  );
}

function dayLabel(day: Day): string {
  return { fri: "Friday", sat: "Saturday", sun: "Sunday" }[day];
}

function SchedSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-6 h-10 w-full max-w-md" />
      <Skeleton className="mt-6 h-[60vh] w-full rounded-xl" />
    </div>
  );
}
