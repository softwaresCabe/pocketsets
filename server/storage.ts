import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { and, asc, eq } from "drizzle-orm";
import {
  festivals,
  stages,
  artists,
  sets,
  announcements,
  userFavorites,
  userSettings,
  type Festival,
  type Stage,
  type Artist,
  type SetRow,
  type Announcement,
  type UserFavorite,
  type SetWithDetails,
  type ArtistWithSets,
  type StageWithSets,
} from "@shared/schema";

const sqlite = new Database("pocketsets.db");
sqlite.pragma("journal_mode = WAL");

/**
 * Bootstrap tables directly in SQL so the server starts cleanly without
 * requiring a separate migration step. Drizzle handles queries at runtime;
 * this keeps first-launch friction to zero.
 */
function ensureSchema(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS festivals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
      location TEXT NOT NULL,
      data_version INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY,
      festival_id TEXT NOT NULL,
      name TEXT NOT NULL,
      short_code TEXT NOT NULL,
      color TEXT NOT NULL,
      genre_focus TEXT,
      description TEXT,
      display_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bio TEXT,
      genres TEXT,
      country TEXT,
      spotify_url TEXT,
      apple_music_url TEXT,
      soundcloud_url TEXT,
      instagram_url TEXT,
      image_hue INTEGER
    );
    CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY,
      festival_id TEXT NOT NULL,
      stage_id TEXT NOT NULL,
      artist_id TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      day TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      published_at TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info'
    );
    CREATE TABLE IF NOT EXISTS user_favorites (
      set_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      custom_lead_time_minutes INTEGER
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sets_day ON sets(day);
    CREATE INDEX IF NOT EXISTS sets_stage ON sets(stage_id);
    CREATE INDEX IF NOT EXISTS sets_artist ON sets(artist_id);
  `);
}
ensureSchema();

export const db = drizzle(sqlite);

// ---------------------------------------------------------------------------
// Storage interface
// ---------------------------------------------------------------------------

export interface IStorage {
  getFestival(): Festival | undefined;
  listStages(): Stage[];
  listArtists(): Artist[];
  listSets(): SetWithDetails[];
  listRawSets(): SetRow[];
  getSet(id: string): SetWithDetails | undefined;
  getArtist(id: string): ArtistWithSets | undefined;
  getStage(id: string): StageWithSets | undefined;
  listAnnouncements(): Announcement[];
  updateSetTimes(id: string, startTime: string | null, endTime: string | null): SetRow | undefined;

  listFavorites(): UserFavorite[];
  addFavorite(setId: string, customLeadTimeMinutes: number | null): UserFavorite;
  updateFavorite(setId: string, customLeadTimeMinutes: number | null): UserFavorite | undefined;
  removeFavorite(setId: string): boolean;

  getSettings(): Record<string, string>;
  setSetting(key: string, value: string): void;
}

function decorateSet(
  row: SetRow,
  allStages: Map<string, Stage>,
  allArtists: Map<string, Artist>,
  favs: Map<string, UserFavorite>,
): SetWithDetails {
  const stage = allStages.get(row.stageId)!;
  const artist = allArtists.get(row.artistId)!;
  const fav = favs.get(row.id);
  return {
    ...row,
    stage,
    artist,
    isFavorite: !!fav,
    customLeadTimeMinutes: fav?.customLeadTimeMinutes ?? null,
  };
}

export class DatabaseStorage implements IStorage {
  getFestival(): Festival | undefined {
    return db.select().from(festivals).get();
  }

  listStages(): Stage[] {
    return db.select().from(stages).orderBy(asc(stages.displayOrder)).all();
  }

  listArtists(): Artist[] {
    return db.select().from(artists).orderBy(asc(artists.name)).all();
  }

  listSets(): SetWithDetails[] {
    const rows = db.select().from(sets).all();
    const stageMap = new Map(this.listStages().map((s) => [s.id, s]));
    const artistMap = new Map(this.listArtists().map((a) => [a.id, a]));
    const favMap = new Map(this.listFavorites().map((f) => [f.setId, f]));
    return rows
      .map((r) => decorateSet(r, stageMap, artistMap, favMap))
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  }

  listRawSets(): SetRow[] {
    return db.select().from(sets).all();
  }

  updateSetTimes(id: string, startTime: string | null, endTime: string | null): SetRow | undefined {
    const existing = db.select().from(sets).where(eq(sets.id, id)).get();
    if (!existing) return undefined;
    db.update(sets).set({ startTime: startTime ?? null, endTime: endTime ?? null }).where(eq(sets.id, id)).run();
    return { ...existing, startTime: startTime ?? null, endTime: endTime ?? null };
  }

  getSet(id: string): SetWithDetails | undefined {
    const row = db.select().from(sets).where(eq(sets.id, id)).get();
    if (!row) return undefined;
    const stage = db.select().from(stages).where(eq(stages.id, row.stageId)).get();
    const artist = db.select().from(artists).where(eq(artists.id, row.artistId)).get();
    const fav = db.select().from(userFavorites).where(eq(userFavorites.setId, id)).get();
    if (!stage || !artist) return undefined;
    return {
      ...row,
      stage,
      artist,
      isFavorite: !!fav,
      customLeadTimeMinutes: fav?.customLeadTimeMinutes ?? null,
    };
  }

  getArtist(id: string): ArtistWithSets | undefined {
    const row = db.select().from(artists).where(eq(artists.id, id)).get();
    if (!row) return undefined;
    const artistSets = db.select().from(sets).where(eq(sets.artistId, id)).all();
    const stageMap = new Map(this.listStages().map((s) => [s.id, s]));
    return {
      ...row,
      sets: artistSets
        .map((s) => ({ ...s, stage: stageMap.get(s.stageId)! }))
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
    };
  }

  getStage(id: string): StageWithSets | undefined {
    const row = db.select().from(stages).where(eq(stages.id, id)).get();
    if (!row) return undefined;
    const stageSets = db.select().from(sets).where(eq(sets.stageId, id)).all();
    const artistMap = new Map(this.listArtists().map((a) => [a.id, a]));
    return {
      ...row,
      sets: stageSets
        .map((s) => ({ ...s, artist: artistMap.get(s.artistId)! }))
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
    };
  }

  listAnnouncements(): Announcement[] {
    return db.select().from(announcements).all().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  listFavorites(): UserFavorite[] {
    return db.select().from(userFavorites).all();
  }

  addFavorite(setId: string, customLeadTimeMinutes: number | null): UserFavorite {
    const existing = db.select().from(userFavorites).where(eq(userFavorites.setId, setId)).get();
    if (existing) return existing;
    const row = {
      setId,
      createdAt: new Date().toISOString(),
      customLeadTimeMinutes: customLeadTimeMinutes ?? null,
    };
    db.insert(userFavorites).values(row).run();
    return row;
  }

  updateFavorite(setId: string, customLeadTimeMinutes: number | null): UserFavorite | undefined {
    const existing = db.select().from(userFavorites).where(eq(userFavorites.setId, setId)).get();
    if (!existing) return undefined;
    db.update(userFavorites)
      .set({ customLeadTimeMinutes: customLeadTimeMinutes ?? null })
      .where(eq(userFavorites.setId, setId))
      .run();
    return { ...existing, customLeadTimeMinutes: customLeadTimeMinutes ?? null };
  }

  removeFavorite(setId: string): boolean {
    const res = db.delete(userFavorites).where(eq(userFavorites.setId, setId)).run();
    return res.changes > 0;
  }

  getSettings(): Record<string, string> {
    const rows = db.select().from(userSettings).all();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  setSetting(key: string, value: string): void {
    const existing = db.select().from(userSettings).where(eq(userSettings.key, key)).get();
    if (existing) {
      db.update(userSettings).set({ value }).where(eq(userSettings.key, key)).run();
    } else {
      db.insert(userSettings).values({ key, value }).run();
    }
  }
}

export const storage = new DatabaseStorage();
