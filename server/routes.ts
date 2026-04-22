import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { storage } from "./storage";
import { seedDatabase } from "./seed";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pocketsets-admin";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const pw = (req.headers["x-admin-password"] as string) || (req.query.pw as string);
  if (!pw || pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Unauthorized — wrong admin password" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // One-time seed on boot
  seedDatabase();

  app.get("/api/festival", (_req: Request, res: Response) => {
    const festival = storage.getFestival();
    if (!festival) return res.status(404).json({ message: "No festival data" });
    res.json(festival);
  });

  app.get("/api/stages", (_req: Request, res: Response) => {
    res.json(storage.listStages());
  });

  app.get("/api/stages/:id", (req: Request, res: Response) => {
    const stage = storage.getStage(String(req.params.id));
    if (!stage) return res.status(404).json({ message: "Stage not found" });
    res.json(stage);
  });

  app.get("/api/artists", (_req: Request, res: Response) => {
    res.json(storage.listArtists());
  });

  app.get("/api/artists/:id", (req: Request, res: Response) => {
    const artist = storage.getArtist(String(req.params.id));
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    res.json(artist);
  });

  app.get("/api/sets", (_req: Request, res: Response) => {
    res.json(storage.listSets());
  });

  app.get("/api/sets/:id", (req: Request, res: Response) => {
    const s = storage.getSet(String(req.params.id));
    if (!s) return res.status(404).json({ message: "Set not found" });
    res.json(s);
  });

  app.get("/api/favorites", (_req: Request, res: Response) => {
    res.json(storage.listFavorites());
  });

  const favoriteBody = z.object({
    setId: z.string().min(1),
    customLeadTimeMinutes: z.number().int().min(0).max(240).nullable().optional(),
  });

  app.post("/api/favorites", (req: Request, res: Response) => {
    const parsed = favoriteBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const fav = storage.addFavorite(
      parsed.data.setId,
      parsed.data.customLeadTimeMinutes ?? null,
    );
    res.status(201).json(fav);
  });

  app.patch("/api/favorites/:setId", (req: Request, res: Response) => {
    const body = z
      .object({ customLeadTimeMinutes: z.number().int().min(0).max(240).nullable() })
      .safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ message: body.error.message });
    }
    const fav = storage.updateFavorite(String(req.params.setId), body.data.customLeadTimeMinutes);
    if (!fav) return res.status(404).json({ message: "Favorite not found" });
    res.json(fav);
  });

  app.delete("/api/favorites/:setId", (req: Request, res: Response) => {
    const ok = storage.removeFavorite(String(req.params.setId));
    if (!ok) return res.status(404).json({ message: "Favorite not found" });
    res.status(204).send();
  });

  app.get("/api/announcements", (_req: Request, res: Response) => {
    res.json(storage.listAnnouncements());
  });

  app.get("/api/settings", (_req: Request, res: Response) => {
    res.json(storage.getSettings());
  });

  const settingBody = z.object({
    key: z.string().min(1),
    value: z.string(),
  });
  app.put("/api/settings", (req: Request, res: Response) => {
    const parsed = settingBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    storage.setSetting(parsed.data.key, parsed.data.value);
    res.json(storage.getSettings());
  });

  // Convenience: reset demo state (clears favorites + simulated time override)
  app.post("/api/demo/reset", (_req: Request, res: Response) => {
    for (const fav of storage.listFavorites()) storage.removeFavorite(fav.setId);
    storage.setSetting("simulatedTime", "");
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------------------
  // Admin — password-protected endpoints for managing set times
  // ---------------------------------------------------------------------------

  // Serve the admin UI
  app.get("/admin", (_req: Request, res: Response) => {
    const htmlPath = path.resolve(__dirname, "admin.html");
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      // Fallback for dev mode (file is in server/ dir relative to source)
      const devPath = path.resolve(process.cwd(), "server", "admin.html");
      if (fs.existsSync(devPath)) {
        res.sendFile(devPath);
      } else {
        res.status(404).send("Admin page not found — make sure server/admin.html exists.");
      }
    }
  });

  // List all sets with artist/stage info
  app.get("/api/admin/sets", requireAdmin, (_req: Request, res: Response) => {
    res.json(storage.listSets());
  });

  // Update a set's start/end times
  const setTimesBody = z.object({
    startTime: z.string().nullable(),
    endTime: z.string().nullable(),
  });

  app.patch("/api/admin/sets/:id", requireAdmin, (req: Request, res: Response) => {
    const parsed = setTimesBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = storage.updateSetTimes(
      String(req.params.id),
      parsed.data.startTime,
      parsed.data.endTime,
    );
    if (!updated) return res.status(404).json({ message: "Set not found" });
    res.json(updated);
  });

  // Export updated ALL_SETS TypeScript for seedData.ts
  app.get("/api/admin/export-seed", requireAdmin, (_req: Request, res: Response) => {
    const rows = storage.listRawSets().sort((a, b) =>
      (a.startTime ?? "").localeCompare(b.startTime ?? "") ||
      a.day.localeCompare(b.day) ||
      a.stageId.localeCompare(b.stageId),
    );
    const lines = rows.map((s) =>
      `  { id: ${JSON.stringify(s.id)}, festivalId: ${JSON.stringify(s.festivalId)}, stageId: ${JSON.stringify(s.stageId)}, artistId: ${JSON.stringify(s.artistId)}, startTime: ${s.startTime ? JSON.stringify(s.startTime) : "null"}, endTime: ${s.endTime ? JSON.stringify(s.endTime) : "null"}, day: ${JSON.stringify(s.day)} },`,
    );
    const ts = `export const ALL_SETS: SetRow[] = [\n${lines.join("\n")}\n];\n`;
    res.type("text/plain").send(ts);
  });

  return httpServer;
}
