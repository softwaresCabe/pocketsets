import { Link, useParams } from "wouter";
import { ArrowLeft, Instagram, Music2 } from "lucide-react";
import { SiSpotify, SiApplemusic, SiSoundcloud } from "react-icons/si";
import { useArtists, useSets } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ArtistAvatar } from "./Lineup";
import { SetCard } from "@/components/SetCard";
import NotFound from "./not-found";

export default function ArtistDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: artists, isLoading: aLoading } = useArtists();
  const { data: sets, isLoading: sLoading } = useSets();

  if (aLoading || sLoading || !artists || !sets) {
    return (
      <Shell>
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="mt-6 h-40 w-full rounded-xl" />
      </Shell>
    );
  }

  const artist = artists.find((a) => a.id === params.id);
  if (!artist) return <NotFound />;

  const artistSets = sets.filter((s) => s.artistId === artist.id);
  const genres = (artist.genres ?? "").split(",").map((g) => g.trim()).filter(Boolean);

  const links: Array<[React.ComponentType<{ className?: string }>, string, string | null]> = [
    [SiSpotify as any, "Spotify", artist.spotifyUrl],
    [SiApplemusic as any, "Apple Music", artist.appleMusicUrl],
    [SiSoundcloud as any, "SoundCloud", artist.soundcloudUrl],
    [Instagram, "Instagram", artist.instagramUrl],
  ];
  const activeLinks = links.filter(([, , url]) => !!url);

  return (
    <Shell>
      <Link className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" href="/lineup" data-testid="link-back-lineup">
          <ArrowLeft className="h-3.5 w-3.5" /> All artists
      </Link>

      <div className="mt-4 flex flex-col items-start gap-6 rounded-2xl border border-border bg-card p-6 md:flex-row md:p-8">
        <ArtistAvatar name={artist.name} hue={artist.imageHue ?? 272} size={96} />
        <div className="min-w-0 flex-1">
          <h1
            className="text-3xl font-semibold tracking-tight md:text-4xl"
            data-testid="text-artist-name"
          >
            {artist.name}
          </h1>
          {artist.country && (
            <div className="mt-1 text-sm text-muted-foreground">{artist.country}</div>
          )}
          {genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
          {artist.bio && (
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground leading-relaxed">
              {artist.bio}
            </p>
          )}
          {activeLinks.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {activeLinks.map(([Icon, label, url]) => (
                <a
                  key={label}
                  href={url!}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium hover-elevate"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Music2 className="h-4 w-4" />
          {artistSets.length} set{artistSets.length === 1 ? "" : "s"} at EDC
        </h2>
        {artistSets.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No sets scheduled.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {artistSets.map((s) => (
              <SetCard key={s.id} set={s} variant="row" showDay />
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">{children}</div>;
}
