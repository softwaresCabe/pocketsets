import { Link, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useSets, useStages } from "@/lib/api";
import { SetCard } from "@/components/SetCard";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "./not-found";

export default function StageDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: stages, isLoading: stagesLoading } = useStages();
  const { data: sets, isLoading: setsLoading } = useSets();

  if (stagesLoading || setsLoading || !stages || !sets) {
    return (
      <Shell>
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      </Shell>
    );
  }

  const stage = stages.find((s) => s.id === params.id);
  if (!stage) return <NotFound />;

  const stageSets = sets.filter((s) => s.stageId === stage.id);
  const byDay = {
    fri: stageSets.filter((s) => s.day === "fri"),
    sat: stageSets.filter((s) => s.day === "sat"),
    sun: stageSets.filter((s) => s.day === "sun"),
  };

  return (
    <Shell>
      <Link className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" href="/stages" data-testid="link-back-stages">
          <ArrowLeft className="h-3.5 w-3.5" /> All stages
      </Link>

      <div className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-card p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 20% 0%, ${stage.color}66, transparent 60%)`,
          }}
          aria-hidden
        />
        <div className="relative">
          <div
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: stage.color }}
            data-testid="text-stage-shortcode"
          >
            Stage · {stage.shortCode}
          </div>
          <h1
            className="mt-1 text-4xl font-semibold tracking-tight md:text-5xl"
            data-testid="text-stage-name"
          >
            {stage.name}
          </h1>
          <div className="mt-2 text-sm font-medium text-muted-foreground">
            {stage.genreFocus}
          </div>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            {stage.description}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="tabular">
              <span className="font-semibold text-foreground">{stageSets.length}</span> sets
            </span>
            <span className="tabular">
              <span className="font-semibold text-foreground">
                {stageSets.filter((x) => x.isFavorite).length}
              </span>{" "}
              favorited
            </span>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-10">
        {(["fri", "sat", "sun"] as const).map((day) =>
          byDay[day].length === 0 ? null : (
            <div key={day}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {{ fri: "Friday", sat: "Saturday", sun: "Sunday" }[day]}
              </h2>
              <div className="mt-3 space-y-2">
                {byDay[day].map((s) => (
                  <SetCard key={s.id} set={s} variant="row" />
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">{children}</div>;
}
