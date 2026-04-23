import { Link } from "wouter";
import { useStages, useSets } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import { useNow } from "@/lib/now";
import { formatTimePT } from "@/lib/time";

export default function StagesPage() {
  const { data: stages, isLoading } = useStages();
  const { data: sets } = useSets();
  const { nowMs } = useNow();

  if (isLoading || !stages || !sets) {
    return (
      <Shell>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-sm text-muted-foreground">
        Eight stages, three nights. Tap a stage to see its full schedule and genre focus.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {stages.map((s) => {
          const stageSets = sets.filter((x) => x.stageId === s.id);
          const favCount = stageSets.filter((x) => x.isFavorite).length;
          const liveSet = stageSets.find(
            (x) => x.startTime !== null && x.endTime !== null &&
              nowMs >= new Date(x.startTime).getTime() && nowMs < new Date(x.endTime).getTime(),
          );
          const nextSet = stageSets
            .filter((x) => x.startTime != null && new Date(x.startTime).getTime() > nowMs)
            .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())[0];
          return (
            <Link className="group relative block overflow-hidden rounded-xl border border-border bg-card p-6 hover-elevate" key={s.id} href={`/stages/${s.id}`} data-testid={`card-stage-${s.id}`}>
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-40 blur-3xl"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: s.color }}
                    >
                      Stage · {s.shortCode}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">{s.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {s.genreFocus}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold tabular">{stageSets.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      sets
                    </div>
                    {favCount > 0 && (
                      <div className="mt-1 text-[10px] font-medium text-primary tabular">
                        {favCount}★
                      </div>
                    )}
                  </div>
                </div>
                {liveSet ? (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-xs font-medium text-emerald-400 truncate">
                      {liveSet.artist.name}
                    </span>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    {s.description}
                  </p>
                )}
                {nextSet && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Next:</span>
                    <span className="font-medium text-foreground truncate">{nextSet.artist.name}</span>
                    <span className="ml-auto flex-shrink-0 tabular">{formatTimePT(nextSet.startTime)}</span>
                  </div>
                )}
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-foreground group-hover:text-primary">
                  View schedule <ArrowRight className="h-3.5 w-3.5" />
                </div>
            </Link>
          );
        })}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        EDC Las Vegas 2026
      </div>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Stages</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}
