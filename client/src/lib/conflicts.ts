import type { SetWithDetails } from "@shared/schema";
import { toMs } from "./time";

export type Conflict = {
  a: SetWithDetails;
  b: SetWithDetails;
  overlapMinutes: number;
};

export function findConflicts(favorited: SetWithDetails[]): Conflict[] {
  const sorted = [...favorited].sort((x, y) => toMs(x.startTime) - toMs(y.startTime));
  const conflicts: Conflict[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const overlap =
        Math.min(toMs(a.endTime), toMs(b.endTime)) -
        Math.max(toMs(a.startTime), toMs(b.startTime));
      if (overlap > 0) {
        conflicts.push({ a, b, overlapMinutes: Math.round(overlap / 60000) });
      }
    }
  }
  return conflicts;
}

/**
 * Smart suggestion: count genre frequency across all favorites and score each
 * conflicting set by its primary genre's frequency. Higher score wins; on tie,
 * earlier start wins.
 */
export function suggestWinner(
  conflict: Conflict,
  allFavorites: SetWithDetails[],
): { winner: SetWithDetails; reason: string } {
  const freq = new Map<string, number>();
  for (const fav of allFavorites) {
    const genres = (fav.artist.genres ?? "").split(",").map((g) => g.trim()).filter(Boolean);
    for (const g of genres) freq.set(g, (freq.get(g) ?? 0) + 1);
  }
  const score = (s: SetWithDetails) => {
    const primary = (s.artist.genres ?? "").split(",")[0]?.trim();
    if (!primary) return 0;
    return freq.get(primary) ?? 0;
  };
  const sA = score(conflict.a);
  const sB = score(conflict.b);
  if (sA === sB) {
    const winner = toMs(conflict.a.startTime) <= toMs(conflict.b.startTime) ? conflict.a : conflict.b;
    return { winner, reason: `tie — earlier start wins (${winner.artist.name})` };
  }
  const winner = sA > sB ? conflict.a : conflict.b;
  const primary = (winner.artist.genres ?? "").split(",")[0]?.trim() ?? "that genre";
  return {
    winner,
    reason: `matches your taste — you've favorited ${
      sA > sB ? sA : sB
    } ${primary} sets this weekend`,
  };
}
