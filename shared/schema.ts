import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * PocketSets — web companion for EDC Las Vegas 2026.
 * All timestamps are ISO 8601 strings in UTC unless otherwise noted.
 */

// ---------------------------------------------------------------------------
// FESTIVAL DATA (published, read-only on client)
// ---------------------------------------------------------------------------

export const festivals = sqliteTable("festivals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  location: text("location").notNull(),
  dataVersion: integer("data_version").notNull().default(0),
});

export const stages = sqliteTable("stages", {
  id: text("id").primaryKey(),
  festivalId: text("festival_id").notNull(),
  name: text("name").notNull(),
  shortCode: text("short_code").notNull(),
  color: text("color").notNull(),
  genreFocus: text("genre_focus"),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
});

export const artists = sqliteTable("artists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  bio: text("bio"),
  genres: text("genres"), // comma-separated list
  country: text("country"),
  spotifyUrl: text("spotify_url"),
  appleMusicUrl: text("apple_music_url"),
  soundcloudUrl: text("soundcloud_url"),
  instagramUrl: text("instagram_url"),
  imageHue: integer("image_hue"), // deterministic color for generated avatar
});

export const sets = sqliteTable("sets", {
  id: text("id").primaryKey(),
  festivalId: text("festival_id").notNull(),
  stageId: text("stage_id").notNull(),
  artistId: text("artist_id").notNull(),
  startTime: text("start_time"), // ISO UTC — null until Insomniac publishes times
  endTime: text("end_time"),
  day: text("day", { enum: ["fri", "sat", "sun"] }).notNull(),
});

export const announcements = sqliteTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  publishedAt: text("published_at").notNull(),
  severity: text("severity", { enum: ["info", "warning", "alert"] })
    .notNull()
    .default("info"),
});

// ---------------------------------------------------------------------------
// USER DATA (local to the web app — single anonymous user per server instance)
// ---------------------------------------------------------------------------

export const userFavorites = sqliteTable("user_favorites", {
  setId: text("set_id").primaryKey(),
  createdAt: text("created_at").notNull(),
  customLeadTimeMinutes: integer("custom_lead_time_minutes"),
});

export const userSettings = sqliteTable("user_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const insertFavoriteSchema = createInsertSchema(userFavorites).pick({
  setId: true,
  customLeadTimeMinutes: true,
});

export const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Festival = typeof festivals.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type Artist = typeof artists.$inferSelect;
export type SetRow = typeof sets.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type UserSetting = typeof userSettings.$inferSelect;

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type UpdateSetting = z.infer<typeof updateSettingSchema>;

// Rich denormalized shapes used by the API for fast client reads
export type SetWithDetails = SetRow & {
  artist: Artist;
  stage: Stage;
  isFavorite: boolean;
  customLeadTimeMinutes: number | null;
};

export type ArtistWithSets = Artist & {
  sets: (SetRow & { stage: Stage })[];
};

export type StageWithSets = Stage & {
  sets: (SetRow & { artist: Artist })[];
};
