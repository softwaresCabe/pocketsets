import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { seedDatabase } from "./seed";

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

  return httpServer;
}
