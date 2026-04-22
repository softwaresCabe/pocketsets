import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Bell, Clock, MapPin, Star } from "lucide-react";
import { useSet, useSets, useSettings } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "./not-found";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDayTimePT,
  formatTimePT,
  humanMinutes,
  durationMinutes,
  relativeLabel,
} from "@/lib/time";
import { useNow } from "@/lib/now";
import { useUpdateFavoriteLeadTime } from "@/lib/mutations";
import { useFavoriteToggle } from "@/lib/useFavoriteToggle";
import { findConflicts } from "@/lib/conflicts";
import { ArtistAvatar } from "./Lineup";

const LEAD_OPTIONS = [0, 5, 10, 15, 30, 45, 60];

export default function SetDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: set, isLoading } = useSet(params.id);
  const { data: sets } = useSets();
  const { data: settings } = useSettings();
  const { nowMs } = useNow();
  const { trigger: toggleFav, dialog: favDialog, isPending: toggling } = useFavoriteToggle();
  const updateLead = useUpdateFavoriteLeadTime();

  if (isLoading) {
    return (
      <Shell>
        <Skeleton className="h-64 w-full rounded-xl" />
      </Shell>
    );
  }
  if (!set) return <NotFound />;

  const duration = durationMinutes(set.startTime, set.endTime);
  const rel = relativeLabel(set.startTime, set.endTime, nowMs);

  // Find any overlapping favorites
  const overlappingFavs = (sets ?? [])
    .filter((s) => s.isFavorite && s.id !== set.id)
    .filter((s) => {
      const a1 = new Date(set.startTime).getTime();
      const a2 = new Date(set.endTime).getTime();
      const b1 = new Date(s.startTime).getTime();
      const b2 = new Date(s.endTime).getTime();
      return a1 < b2 && b1 < a2;
    });

  const globalLead = Number(settings?.defaultLeadTimeMinutes ?? "15");
  const effectiveLead = set.customLeadTimeMinutes ?? globalLead;

  return (
    <Shell>
      <button
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => window.history.length > 1 ? window.history.back() : navigate("/schedule")}
        data-testid="link-back-schedule"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div
        className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-card"
        style={{ boxShadow: `inset 0 2px 0 ${set.stage.color}` }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 80% 0%, ${set.stage.color}55, transparent 65%)`,
          }}
          aria-hidden
        />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Link className="text-[10px] font-semibold uppercase tracking-widest hover:underline" style={{ color: set.stage.color }} data-testid="link-stage" href={`/stages/${set.stage.id}`}>
                  {set.stage.name}
              </Link>
              <h1
                className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl"
                data-testid="text-set-artist"
              >
                {set.artist.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="tabular" data-testid="text-set-time">
                  {formatDayTimePT(set.startTime)} – {formatTimePT(set.endTime)}
                </span>
                <span>·</span>
                <span className="tabular">{humanMinutes(duration)}</span>
              </div>
              <div className="mt-2 text-xs">
                <PhaseBadge phase={rel.phase} label={rel.label} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              {favDialog}
              <Button
                size="lg"
                variant={set.isFavorite ? "default" : "outline"}
                onClick={() => toggleFav(set.id, set.isFavorite)}
                disabled={toggling}
                className="min-w-[140px]"
                data-testid="button-favorite-set"
              >
                <Star
                  className={`mr-2 h-4 w-4 ${set.isFavorite ? "fill-current" : ""}`}
                  aria-hidden
                />
                {set.isFavorite ? "Favorited" : "Add to My Sets"}
              </Button>
            </div>
          </div>

          {set.isFavorite && (
            <div
              className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/40 p-4"
              data-testid="section-lead-time"
            >
              <Bell className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Reminder lead time</div>
                <div className="text-xs text-muted-foreground">
                  You'll get a nudge {effectiveLead} minute{effectiveLead === 1 ? "" : "s"} before the
                  set starts.{" "}
                  {set.customLeadTimeMinutes === null && (
                    <span className="italic">(using global default)</span>
                  )}
                </div>
              </div>
              <Select
                value={String(set.customLeadTimeMinutes ?? "global")}
                onValueChange={(v) =>
                  updateLead.mutate({
                    setId: set.id,
                    customLeadTimeMinutes: v === "global" ? null : Number(v),
                  })
                }
              >
                <SelectTrigger className="w-40" data-testid="select-lead-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Use default ({globalLead}m)</SelectItem>
                  {LEAD_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} min before
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {overlappingFavs.length > 0 && (
            <div
              className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
              data-testid="section-overlaps"
            >
              <div className="flex items-center gap-2 text-destructive font-medium">
                <Clock className="h-4 w-4" />
                Overlaps with {overlappingFavs.length} of your favorite
                {overlappingFavs.length === 1 ? "" : "s"}
              </div>
              <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                {overlappingFavs.map((o) => (
                  <div key={o.id}>
                    <span className="text-foreground font-medium">{o.artist.name}</span> ·{" "}
                    <span style={{ color: o.stage.color }}>{o.stage.name}</span> ·{" "}
                    <span className="tabular">
                      {formatTimePT(o.startTime)} – {formatTimePT(o.endTime)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-[1fr_240px]">
        <Link className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 hover-elevate" href={`/artists/${set.artist.id}`} data-testid="link-artist">
            <ArtistAvatar name={set.artist.name} hue={set.artist.imageHue ?? 272} size={64} />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Artist
              </div>
              <div className="mt-0.5 truncate text-lg font-semibold">{set.artist.name}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {set.artist.genres?.split(",").slice(0, 3).join(" · ") || "—"}
              </div>
              {set.artist.bio && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {set.artist.bio}
                </p>
              )}
            </div>
        </Link>

        <Link className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 hover-elevate" href={`/stages/${set.stage.id}`} data-testid="link-stage-detail">
            <div
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold"
              style={{ backgroundColor: `${set.stage.color}25`, color: set.stage.color }}
            >
              {set.stage.shortCode}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Stage
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold">{set.stage.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {set.stage.genreFocus?.split("·")[0]?.trim()}
              </div>
            </div>
        </Link>
      </section>
    </Shell>
  );
}

function PhaseBadge({ phase, label }: { phase: "upcoming" | "live" | "past"; label: string }) {
  const styles = {
    upcoming: "bg-primary/15 text-primary",
    live: "bg-emerald-500/15 text-emerald-400",
    past: "bg-secondary text-muted-foreground",
  }[phase];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tabular ${styles}`}
    >
      {phase === "live" && (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      )}
      {label}
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">{children}</div>;
}
