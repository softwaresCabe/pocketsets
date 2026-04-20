import { Link } from "wouter";
import { ArrowRight, Calendar, PartyPopper, Sparkles, Star } from "lucide-react";
import { useFestival, useSets, useStages, useAnnouncements, useSettings } from "@/lib/api";
import { useNow } from "@/lib/now";
import {
  toMs,
  formatTimePT,
  humanMinutes,
  partsInPT,
  relativeLabel,
} from "@/lib/time";
import { SetCard } from "@/components/SetCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { SetWithDetails } from "@shared/schema";

export default function NowPage() {
  const { data: festival } = useFestival();
  const { data: sets, isLoading } = useSets();
  const { data: stages } = useStages();
  const { data: announcements } = useAnnouncements();
  const { data: settings } = useSettings();
  const { nowMs } = useNow();

  if (isLoading || !sets || !festival || !stages) {
    return <PageShell title="Now"><NowSkeleton /></PageShell>;
  }

  const festivalStartMs = toMs(`${festival.startDate}T19:00:00-07:00`);
  const festivalEndMs = toMs(`${festival.endDate}T28:00:00-07:00`);
  const isLive = nowMs >= festivalStartMs && nowMs < festivalEndMs;

  // Now-playing banner: favorites that started within the last 5 minutes
  const nowPlayingEnabled = (settings?.nowPlayingNotifications ?? "true") === "true";
  const recentlyStarted = nowPlayingEnabled
    ? sets.filter((s) => {
        if (!s.isFavorite || !s.startTime || !s.endTime) return false;
        const start = toMs(s.startTime);
        const end = toMs(s.endTime);
        return nowMs >= start && nowMs < end && nowMs - start < 5 * 60_000;
      })
    : [];

  return (
    <PageShell
      title="Now"
      eyebrow={festival.name}
      eyebrowColor="text-primary"
    >
      {recentlyStarted.map((s) => (
        <Link
          key={s.id}
          href={`/sets/${s.id}`}
          className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 hover-elevate"
          data-testid={`banner-now-playing-${s.id}`}
        >
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-emerald-300">
              {s.artist.name} just started
            </div>
            <div className="text-xs text-emerald-400/80">{s.stage.name}</div>
          </div>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-emerald-400" />
        </Link>
      ))}

      {isLive ? (
        <LiveView sets={sets} stages={stages} nowMs={nowMs} />
      ) : (
        <CountdownView festival={festival} sets={sets} nowMs={nowMs} />
      )}

      {announcements && announcements.length > 0 && (
        <section className="mt-10">
          <SectionHeader title="Latest alerts" href="/announcements" />
          <div className="mt-3 space-y-2">
            {announcements.slice(0, 2).map((a) => (
              <Alert
                key={a.id}
                data-testid={`alert-${a.id}`}
                className={
                  a.severity === "warning"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : a.severity === "alert"
                    ? "border-destructive/30 bg-destructive/5"
                    : ""
                }
              >
                <AlertTitle className="text-sm">{a.title}</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  {a.body}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}

function getCurrentFestivalDay(nowMs: number): "fri" | "sat" | "sun" | null {
  const { date, hour } = partsInPT(new Date(nowMs).toISOString());
  const effectiveDate = hour < 6 ? date - 1 : date;
  if (effectiveDate === 15) return "fri";
  if (effectiveDate === 16) return "sat";
  if (effectiveDate === 17) return "sun";
  return null;
}

function LiveView({
  sets,
  stages,
  nowMs,
}: {
  sets: SetWithDetails[];
  stages: any[];
  nowMs: number;
}) {
  const currentDay = getCurrentFestivalDay(nowMs);

  const liveSets = sets.filter(
    (s) => s.startTime && s.endTime && toMs(s.startTime) <= nowMs && toMs(s.endTime) > nowMs,
  );
  const liveFavs = liveSets.filter((s) => s.isFavorite);
  const upcomingFavs = sets
    .filter((s) => s.isFavorite && s.startTime && toMs(s.startTime) > nowMs)
    .sort((a, b) => toMs(a.startTime!) - toMs(b.startTime!))
    .slice(0, 3);

  const sortedStages = [...stages].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <>
      {liveFavs.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Now playing · your favorites" icon={Sparkles} />
          <div className="mt-3 space-y-3">
            {liveFavs.map((s) => (
              <SetCard key={s.id} set={s} variant="row" highlighted />
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <SectionHeader title="On stage right now" />
        <div className="mt-3 space-y-2">
          {sortedStages.map((stage) => {
            const daySets = currentDay
              ? sets.filter((s) => s.stageId === stage.id && s.day === currentDay)
              : [];
            const playing = daySets.find(
              (s) => s.startTime && s.endTime && toMs(s.startTime) <= nowMs && toMs(s.endTime) > nowMs,
            );
            const nextUp = daySets
              .filter((s) => s.startTime && toMs(s.startTime) > nowMs)
              .sort((a, b) => toMs(a.startTime!) - toMs(b.startTime!))[0];
            return (
              <StageNowCard key={stage.id} stage={stage} playing={playing} nextUp={nextUp} nowMs={nowMs} />
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeader title="Up next in your lineup" icon={Calendar} />
        {upcomingFavs.length > 0 ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingFavs.map((s) => (
              <SetCard key={s.id} set={s} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <PartyPopper className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-foreground">
              {liveFavs.length > 0 ? "No more favorites tonight." : "No favorites added yet."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open the{" "}
              <Link className="text-primary hover:underline" href="/schedule">
                schedule
              </Link>{" "}
              and tap a star to add sets.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

function StageNowCard({
  stage,
  playing,
  nextUp,
  nowMs,
}: {
  stage: any;
  playing: SetWithDetails | undefined;
  nextUp: SetWithDetails | undefined;
  nowMs: number;
}) {
  const href = playing ? `/sets/${playing.id}` : `/stages/${stage.id}`;
  const minsLeft = playing
    ? Math.ceil((toMs(playing.endTime!) - nowMs) / 60000)
    : null;

  return (
    <Link
      href={href}
      data-testid={`stage-now-${stage.id}`}
      className="flex overflow-hidden rounded-xl border border-border bg-card hover-elevate"
    >
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: stage.color }} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: stage.color }}
          >
            {stage.shortCode}
          </span>
          <span className="text-xs text-muted-foreground">{stage.name}</span>
        </div>

        {playing ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="truncate text-sm font-semibold">{playing.artist.name}</span>
            {playing.isFavorite && (
              <Star className="h-3.5 w-3.5 flex-shrink-0 fill-primary text-primary" aria-label="Favorited" />
            )}
            <span className="ml-auto flex-shrink-0 tabular text-xs text-emerald-400">
              {minsLeft}m left
            </span>
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground/60">Dark right now</span>
        )}

        {nextUp && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Next:</span>
            <span className="truncate font-medium text-foreground/80">{nextUp.artist.name}</span>
            <span className="ml-auto flex-shrink-0 tabular">{formatTimePT(nextUp.startTime)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function CountdownView({
  festival,
  sets,
  nowMs,
}: {
  festival: any;
  sets: SetWithDetails[];
  nowMs: number;
}) {
  const gatesIso = `${festival.startDate}T19:00:00-07:00`;
  const gatesMs = toMs(gatesIso);
  const ms = gatesMs - nowMs;
  const past = ms <= 0;

  const days = Math.max(0, Math.floor(ms / 86_400_000));
  const hours = Math.max(0, Math.floor((ms % 86_400_000) / 3_600_000));
  const minutes = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
  const seconds = Math.max(0, Math.floor((ms % 60_000) / 1000));

  const favCount = sets.filter((s) => s.isFavorite).length;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-radial-purple opacity-70" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" aria-hidden />
        <div className="relative">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">
            {past ? "Festival weekend" : "Countdown · gates open"}
          </div>
          <div className="mt-3 text-balance text-3xl font-semibold leading-tight md:text-4xl">
            {past ? "You're on the ground" : "Three days on the speedway"}
          </div>
          <div className="mt-2 max-w-lg text-sm text-muted-foreground">
            {past
              ? "Gates are open. Tap Now once a favorite is playing to see it live."
              : `Gates open ${formatTimePT(gatesIso)} Friday, ${festival.location}. Stash your lineup now — PocketSets works offline the whole weekend.`}
          </div>

          {!past && (
            <div className="mt-8 grid max-w-lg grid-cols-4 gap-3">
              <CountdownUnit value={days} label="days" testId="countdown-days" />
              <CountdownUnit value={hours} label="hours" testId="countdown-hours" />
              <CountdownUnit value={minutes} label="minutes" testId="countdown-minutes" />
              <CountdownUnit value={seconds} label="seconds" testId="countdown-seconds" />
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover-elevate" href="/schedule" data-testid="link-hero-schedule">
                Browse the schedule <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-5 py-2.5 text-sm font-medium text-foreground hover-elevate" href="/my-sets" data-testid="link-hero-my-sets">
                My Sets ({favCount})
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <SectionHeader title="Three days, one speedway" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(["fri", "sat", "sun"] as const).map((day) => (
            <DayPreview key={day} day={day} sets={sets} />
          ))}
        </div>
      </section>
    </>
  );
}

function DayPreview({ day, sets }: { day: "fri" | "sat" | "sun"; sets: SetWithDetails[] }) {
  const daySets = sets.filter((s) => s.day === day);
  const headline = daySets.find(
    (s) => s.stage.id === "kinetic-field" && s.startTime && partsInPT(s.startTime).hour >= 22,
  );
  const DAY_MAP = {
    fri: { label: "Friday", date: "May 15", tag: "Kickoff" },
    sat: { label: "Saturday", date: "May 16", tag: "Peak" },
    sun: { label: "Sunday", date: "May 17", tag: "Closing" },
  }[day];
  const favs = daySets.filter((s) => s.isFavorite).length;
  return (
    <Link className="group relative block overflow-hidden rounded-xl border border-border bg-card p-5 hover-elevate" href={`/schedule#${day}`} data-testid={`card-day-${day}`}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">
              {DAY_MAP.tag}
            </div>
            <div className="mt-1 text-xl font-semibold">{DAY_MAP.label}</div>
            <div className="text-xs text-muted-foreground">{DAY_MAP.date}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular">{daySets.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              sets
            </div>
          </div>
        </div>
        {headline && (
          <div className="mt-4 text-sm">
            <span className="text-muted-foreground">Headlining kineticFIELD: </span>
            <span className="font-medium text-foreground">{headline.artist.name}</span>
          </div>
        )}
        {favs > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-primary">
              <Sparkles className="h-3 w-3" /> {favs} favorite{favs === 1 ? "" : "s"} this day
            </span>
          </div>
        )}
    </Link>
  );
}

function CountdownUnit({
  value,
  label,
  testId,
}: {
  value: number;
  label: string;
  testId: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-3 text-center backdrop-blur">
      <div className="text-2xl font-semibold tabular md:text-3xl" data-testid={testId}>
        {String(value).padStart(2, "0")}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  href,
  icon: Icon,
}: {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        {title}
      </h2>
      {href && (
        <Link className="text-xs text-primary hover:underline" href={href}>View all
        </Link>
      )}
    </div>
  );
  return content;
}

function PageShell({
  title,
  eyebrow,
  eyebrowColor,
  children,
}: {
  title: string;
  eyebrow?: string;
  eyebrowColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      {eyebrow && (
        <div className={`text-xs font-semibold uppercase tracking-widest ${eyebrowColor ?? "text-muted-foreground"}`}>
          {eyebrow}
        </div>
      )}
      <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function NowSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}
