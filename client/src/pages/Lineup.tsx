import * as React from "react";
import { Link } from "wouter";
import { Heart, Search } from "lucide-react";
import { useArtists, useSets } from "@/lib/api";
import { useFavoriteToggle } from "@/lib/useFavoriteToggle";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDayTimePT } from "@/lib/time";

export default function LineupPage() {
  const { data: artists, isLoading } = useArtists();
  const { data: sets } = useSets();
  const [query, setQuery] = React.useState("");
  const { trigger: toggleFavorite, dialog } = useFavoriteToggle();

  if (isLoading || !artists || !sets) {
    return (
      <Shell>
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="mt-8 grid gap-2 md:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </Shell>
    );
  }

  const filtered = artists.filter((a) =>
    query
      ? a.name.toLowerCase().includes(query.toLowerCase()) ||
        (a.genres ?? "").toLowerCase().includes(query.toLowerCase())
      : true,
  );

  const byLetter = new Map<string, typeof filtered>();
  for (const a of filtered) {
    const letter = /^[a-z]/i.test(a.name) ? a.name[0].toUpperCase() : "#";
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter)!.push(a);
  }
  const letters = Array.from(byLetter.keys()).sort();

  const setByArtist = new Map(sets.map((s) => [s.artistId, s]));

  return (
    <Shell>
      {dialog}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {artists.length} artists. Tap a name for details, or heart to add to My Sets.
        </p>
      </div>

      <div className="mt-6 relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artists or genres"
          className="pl-9"
          data-testid="input-search-artists"
          aria-label="Search artists"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <div className="mt-8 flex gap-6">
          {/* Jump index (desktop) */}
          <nav
            className="hidden w-10 flex-shrink-0 flex-col items-center gap-1 lg:flex"
            aria-label="Jump to letter"
          >
            {letters.map((l) => (
              <a
                key={l}
                href={`#letter-${l}`}
                className="text-[11px] font-semibold text-muted-foreground hover:text-primary tabular"
              >
                {l}
              </a>
            ))}
          </nav>

          <div className="flex-1 space-y-8">
            {letters.map((letter) => (
              <section key={letter} id={`letter-${letter}`}>
                <div className="mb-3 text-2xl font-semibold tracking-tight text-primary">
                  {letter}
                </div>
                <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {byLetter.get(letter)!.map((a) => (
                    <li key={a.id}>
                      <Link className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover-elevate" href={`/artists/${a.id}`} data-testid={`link-artist-${a.id}`}>
                          <ArtistAvatar name={a.name} hue={a.imageHue ?? 272} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{a.name}</div>
                            {(() => {
                              const set = setByArtist.get(a.id);
                              if (!set) return (
                                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {a.genres?.split(",")[0] ?? "—"}
                                </div>
                              );
                              return (
                                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                  <span style={{ color: set.stage.color }}>{set.stage.shortCode}</span>
                                  <span> · </span>
                                  <span className="tabular">{formatDayTimePT(set.startTime)}</span>
                                </div>
                              );
                            })()}
                          </div>
                          {(() => {
                            const set = setByArtist.get(a.id);
                            if (!set) return null;
                            return (
                              <button
                                aria-label={set.isFavorite ? "Remove from My Sets" : "Add to My Sets"}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleFavorite(set.id, set.isFavorite);
                                }}
                                className="flex-shrink-0 rounded-full p-1.5 transition-colors hover:bg-secondary"
                              >
                                <Heart
                                  className={cn("h-4 w-4 transition-colors", set.isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground")}
                                />
                              </button>
                            );
                          })()}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

export function ArtistAvatar({
  name,
  hue,
  size = 40,
  className,
}: {
  name: string;
  hue: number;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  const bg = `linear-gradient(135deg, hsl(${hue} 80% 45% / 0.9), hsl(${(hue + 60) % 360} 80% 35% / 0.9))`;
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.38,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
      <div className="text-sm font-medium">No artists match "{query}"</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Try a broader search — by name or by genre like "trance" or "dubstep".
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        EDC Las Vegas 2026
      </div>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Lineup</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}
