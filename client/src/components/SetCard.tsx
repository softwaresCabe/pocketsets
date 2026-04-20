import { Link } from "wouter";
import { Star, Users } from "lucide-react";
import type { SetWithDetails } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTimePT, durationMinutes, humanMinutes, relativeLabel } from "@/lib/time";
import { useToggleFavorite } from "@/lib/mutations";
import { useNow } from "@/lib/now";

type Props = {
  set: SetWithDetails;
  variant?: "card" | "row";
  showDay?: boolean;
  highlighted?: boolean;
};

const DAY_LABEL = { fri: "Fri", sat: "Sat", sun: "Sun" } as const;

export function SetCard({ set, variant = "card", showDay = false, highlighted = false }: Props) {
  const toggle = useToggleFavorite();
  const { nowMs } = useNow();
  const duration = durationMinutes(set.startTime, set.endTime);
  const rel = relativeLabel(set.startTime, set.endTime, nowMs);

  const onToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle.mutate({ setId: set.id, isFavorite: set.isFavorite });
  };

  if (variant === "row") {
    return (
      <Link className={cn(
            "group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 hover-elevate transition-colors",
            highlighted && "ring-1 ring-primary",
          )} href={`/sets/${set.id}`} data-testid={`card-set-${set.id}`}>
          <div
            className="h-full w-1 min-h-[48px] rounded-full flex-shrink-0"
            style={{ backgroundColor: set.stage.color }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-sm text-foreground" data-testid={`text-artist-${set.id}`}>
                  {set.artist.name}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="font-medium" style={{ color: set.stage.color }}>
                    {set.stage.name}
                  </span>
                  <span>·</span>
                  <span className="tabular">
                    {showDay && `${DAY_LABEL[set.day]} `}
                    {formatTimePT(set.startTime)} – {formatTimePT(set.endTime)}
                  </span>
                  <span>·</span>
                  <span>{humanMinutes(duration)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <PhaseTag phase={rel.phase} label={rel.label} />
                <Button
                  size="icon"
                  variant={set.isFavorite ? "default" : "outline"}
                  className="h-8 w-8"
                  onClick={onToggle}
                  aria-label={set.isFavorite ? "Remove from My Sets" : "Add to My Sets"}
                  data-testid={`button-favorite-${set.id}`}
                >
                  <Star
                    className={cn("h-4 w-4", set.isFavorite && "fill-current")}
                    aria-hidden
                  />
                </Button>
              </div>
            </div>
          </div>
      </Link>
    );
  }

  return (
    <Link className={cn(
          "group relative block overflow-hidden rounded-xl border border-border bg-card hover-elevate transition-colors",
          highlighted && "ring-1 ring-primary",
        )} href={`/sets/${set.id}`} data-testid={`card-set-${set.id}`}>
        <div
          className="h-1 w-full"
          style={{ backgroundColor: set.stage.color }}
          aria-hidden
        />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span style={{ color: set.stage.color }}>{set.stage.shortCode}</span>
                <span>·</span>
                <span className="tabular">{showDay && `${DAY_LABEL[set.day]} · `}{formatTimePT(set.startTime)}</span>
              </div>
              <div
                className="mt-1 truncate text-base font-semibold text-foreground"
                data-testid={`text-artist-${set.id}`}
              >
                {set.artist.name}
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {set.artist.genres?.split(",")[0] ?? "—"}
              </div>
            </div>
            <Button
              size="icon"
              variant={set.isFavorite ? "default" : "outline"}
              className="h-8 w-8 flex-shrink-0"
              onClick={onToggle}
              aria-label={set.isFavorite ? "Remove from My Sets" : "Add to My Sets"}
              data-testid={`button-favorite-${set.id}`}
            >
              <Star
                className={cn("h-4 w-4", set.isFavorite && "fill-current")}
                aria-hidden
              />
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular">
              {formatTimePT(set.startTime)} – {formatTimePT(set.endTime)} · {humanMinutes(duration)}
            </span>
            <PhaseTag phase={rel.phase} label={rel.label} compact />
          </div>
        </div>
    </Link>
  );
}

function PhaseTag({
  phase,
  label,
  compact = false,
}: {
  phase: "upcoming" | "live" | "past" | "tbd";
  label: string;
  compact?: boolean;
}) {
  const styles = {
    upcoming: "text-sky-400",
    live: "text-emerald-400",
    past: "text-muted-foreground/60",
    tbd: "text-muted-foreground/50",
  }[phase];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium tabular",
        styles,
        compact && "text-[10px]",
      )}
    >
      {phase === "live" && <Users className="h-3 w-3" aria-hidden />}
      {phase === "live" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      {label}
    </span>
  );
}
