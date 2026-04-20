import { Link } from "wouter";
import { ArrowRight, Calendar, PartyPopper, Sparkles } from "lucide-react";
import { useFestival, useSets, useStages, useAnnouncements } from "@/lib/api";
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
  const { nowMs, isSimulated } = useNow();

  if (isLoading || !sets || !festival || !stages) {
    return <PageShell title="Now"><NowSkeleton /></PageShell>;
  }

  const festivalStartMs = toMs(`${festival.startDate}T19:00:00-07:00`);
  const festivalEndMs = toMs(`${festival.endDate}T28:00:00-07:00`); // 4am Monday
  const isLive = nowMs >= festivalStartMs && nowMs < festivalEndMs;

  return (
    <PageShell
      title="Now"
      eyebrow={festival.name}
      eyebrowColor="text-primary"
    >
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

function LiveView({
  sets,
  stages,
  nowMs,
}: {
  sets: SetWithDetails[];
  stages: any[];
  nowMs: number;
}) {
  const liveSets = sets.filter(
    (s) => toMs(s.startTime) <= nowMs && toMs(s.endTime) > nowMs,
  );
  const upNext = sets
    .filter((s) => s.isFavorite && toMs(s.startTime) > nowMs)
    .slice(0, 3);
  const liveFavorites = liveSets.filter((s) => s.isFavorite);

  return (
    <>
      {liveFavorites.length > 0 && (
        <section className="mb-10">
          <SectionHeader title="Now playing · your favorites" icon={Sparkles} />
          <div className="mt-3 space-y-3">
            {liveFavorites.map((s) => (
              <SetCard key={s.id} set={s} variant="row" highlighted />
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <SectionHeader
          title={upNext.length > 0 ? "Up next in your lineup" : "Up next"}
          icon={Calendar}
        />
        {upNext.length > 0 ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upNext.map((s) => (
              <SetCard key={s.id} set={s} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <PartyPopper className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-foreground">No favorites starting soon.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open the <Link className="text-primary hover:underline" href="/schedule">schedule</Link> and tap a star to add sets.
            </p>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Right now, across every stage" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
          {stages.map((stage) => {
            const playing = liveSets.find((s) => s.stageId === stage.id);
            return (
              <Link className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover-elevate" key={stage.id} href={playing ? `/sets/${playing.id}` : `/stages/${stage.id}`} data-testid={`stage-tile-${stage.id}`}>
                  <div
                    className="h-12 w-12 flex-shrink-0 rounded-lg flex items-center justify-center font-mono text-xs font-bold"
                    style={{
                      backgroundColor: `${stage.color}20`,
                      color: stage.color,
                    }}
                  >
                    {stage.shortCode}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      {stage.name}
                    </div>
                    {playing ? (
                      <div className="mt-0.5 text-xs text-muted-foreground truncate">
                        <span className="text-foreground font-medium">{playing.artist.name}</span>
                        <span className="mx-1.5">·</span>
                        <span className="tabular">
                          {relativeLabel(playing.startTime, playing.endTime, nowMs).label}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-0.5 text-xs text-muted-foreground/70">
                        Dark right now
                      </div>
                    )}
                  </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
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
    (s) => s.stage.id === "kinetic-field" && partsInPT(s.startTime).hour >= 22,
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
