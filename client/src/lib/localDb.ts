/**
 * Client-side data layer — replaces the Express/SQLite server for the iOS app.
 * Static festival data is bundled at build time; user data (favorites, settings)
 * is persisted in localStorage so it survives app restarts with no server needed.
 */
import type {
  Festival,
  Stage,
  Artist,
  SetRow,
  Announcement,
  UserFavorite,
  SetWithDetails,
  ArtistWithSets,
  StageWithSets,
} from "@shared/schema";
import { FESTIVAL, STAGES, ARTISTS, ALL_SETS, ANNOUNCEMENTS } from "./seedData";

const FAVORITES_KEY = "ps_favorites";
const SETTINGS_KEY = "ps_settings";

const DEFAULT_SETTINGS: Record<string, string> = {
  defaultLeadTimeMinutes: "15",
  nowPlayingNotifications: "true",
  simulatedTime: "",
};

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function readFavorites(): UserFavorite[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeFavorites(favs: UserFavorite[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

function readSettings(): Record<string, string> {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings: Record<string, string>): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ---------------------------------------------------------------------------
// Join helpers
// ---------------------------------------------------------------------------

const stageMap = new Map<string, Stage>(STAGES.map((s) => [s.id, s]));
const artistMap = new Map<string, Artist>(ARTISTS.map((a) => [a.id, a]));

function decorateSet(row: SetRow, favMap: Map<string, UserFavorite>): SetWithDetails {
  const fav = favMap.get(row.id);
  return {
    ...row,
    stage: stageMap.get(row.stageId)!,
    artist: artistMap.get(row.artistId)!,
    isFavorite: !!fav,
    customLeadTimeMinutes: fav?.customLeadTimeMinutes ?? null,
  };
}

function buildFavMap(): Map<string, UserFavorite> {
  return new Map(readFavorites().map((f) => [f.setId, f]));
}

// ---------------------------------------------------------------------------
// Public API — mirrors server/storage.ts
// ---------------------------------------------------------------------------

export function getFestival(): Festival {
  return FESTIVAL;
}

export function listStages(): Stage[] {
  return [...STAGES].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function listArtists(): Artist[] {
  return [...ARTISTS].sort((a, b) => a.name.localeCompare(b.name));
}

export function listAnnouncements(): Announcement[] {
  return [...ANNOUNCEMENTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function listFavorites(): UserFavorite[] {
  return readFavorites();
}

export function listSets(): SetWithDetails[] {
  const favMap = buildFavMap();
  return ALL_SETS.map((r) => decorateSet(r, favMap)).sort((a, b) =>
    (a.startTime ?? "").localeCompare(b.startTime ?? ""),
  );
}

export function getSet(id: string): SetWithDetails | undefined {
  const row = ALL_SETS.find((s) => s.id === id);
  if (!row) return undefined;
  return decorateSet(row, buildFavMap());
}

export function getStage(id: string): StageWithSets | undefined {
  const stage = STAGES.find((s) => s.id === id);
  if (!stage) return undefined;
  const favMap = buildFavMap();
  const sets = ALL_SETS.filter((s) => s.stageId === id)
    .map((s) => decorateSet(s, favMap))
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  return { ...stage, sets };
}

export function getArtist(id: string): ArtistWithSets | undefined {
  const artist = ARTISTS.find((a) => a.id === id);
  if (!artist) return undefined;
  const sets = ALL_SETS.filter((s) => s.artistId === id)
    .map((s) => ({ ...s, stage: stageMap.get(s.stageId)! }))
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  return { ...artist, sets };
}

export function addFavorite(setId: string, customLeadTimeMinutes: number | null): UserFavorite {
  const favs = readFavorites();
  const existing = favs.find((f) => f.setId === setId);
  if (existing) return existing;
  const fav: UserFavorite = {
    setId,
    createdAt: new Date().toISOString(),
    customLeadTimeMinutes: customLeadTimeMinutes ?? null,
  };
  writeFavorites([...favs, fav]);
  return fav;
}

export function removeFavorite(setId: string): boolean {
  const favs = readFavorites();
  const next = favs.filter((f) => f.setId !== setId);
  if (next.length === favs.length) return false;
  writeFavorites(next);
  return true;
}

export function updateFavoriteLeadTime(
  setId: string,
  customLeadTimeMinutes: number | null,
): UserFavorite | undefined {
  const favs = readFavorites();
  const idx = favs.findIndex((f) => f.setId === setId);
  if (idx === -1) return undefined;
  favs[idx] = { ...favs[idx], customLeadTimeMinutes: customLeadTimeMinutes ?? null };
  writeFavorites(favs);
  return favs[idx];
}

export function getSettings(): Record<string, string> {
  return readSettings();
}

export function setSetting(key: string, value: string): void {
  const settings = readSettings();
  settings[key] = value;
  writeSettings(settings);
}

export function resetDemo(): void {
  localStorage.removeItem(FAVORITES_KEY);
  const settings = readSettings();
  settings.simulatedTime = "";
  writeSettings(settings);
}
