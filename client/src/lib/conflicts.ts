import type { SetWithDetails } from "@shared/schema";
import { toMs } from "./time";

export type Conflict = {
  a: SetWithDetails;
  b: SetWithDetails;
  overlapMinutes: number;
};

export type ConflictNetwork = {
  sets: SetWithDetails[];
  conflicts: Conflict[];
  totalOverlapMinutes: number;
  artistNames: string[];
};

export function findConflicts(favorited: SetWithDetails[]): Conflict[] {
  if (favorited.length < 2) return [];

  // Only consider sets with known times
  const timed = favorited.filter(
    (s): s is SetWithDetails & { startTime: string; endTime: string } =>
      s.startTime !== null && s.endTime !== null,
  );

  const sorted = [...timed].sort((x, y) => toMs(x.startTime) - toMs(y.startTime));
  const conflicts: Conflict[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const aStart = toMs(a.startTime);
    const aEnd = toMs(a.endTime);

    for (let j = i + 1; j < sorted.length && j < i + 10; j++) {
      const b = sorted[j];
      const bStart = toMs(b.startTime);

      if (bStart >= aEnd) break;

      const bEnd = toMs(b.endTime);
      const overlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);

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
    const winner = toMs(conflict.a.startTime ?? "") <= toMs(conflict.b.startTime ?? "") ? conflict.a : conflict.b;
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

/**
 * Groups conflicts into networks where sets are connected through conflicts.
 * For example, if A conflicts with B and B conflicts with C, they're all in one network.
 */
export function buildConflictNetworks(conflicts: Conflict[]): ConflictNetwork[] {
  if (conflicts.length === 0) return [];

  const adjacencyList = new Map<string, Set<string>>();
  const setMap = new Map<string, SetWithDetails>();

  conflicts.forEach(conflict => {
    const aId = conflict.a.id;
    const bId = conflict.b.id;

    if (!adjacencyList.has(aId)) adjacencyList.set(aId, new Set());
    if (!adjacencyList.has(bId)) adjacencyList.set(bId, new Set());

    adjacencyList.get(aId)!.add(bId);
    adjacencyList.get(bId)!.add(aId);

    setMap.set(aId, conflict.a);
    setMap.set(bId, conflict.b);
  });

  const visited = new Set<string>();
  const networks: ConflictNetwork[] = [];

  function dfs(setId: string, networkSets: SetWithDetails[], networkConflicts: Conflict[]): void {
    if (visited.has(setId)) return;
    visited.add(setId);

    const set = setMap.get(setId);
    if (!set) return;

    networkSets.push(set);

    const neighbors = adjacencyList.get(setId) || new Set();
    neighbors.forEach(neighborId => {
      const conflict = conflicts.find(c =>
        (c.a.id === setId && c.b.id === neighborId) ||
        (c.a.id === neighborId && c.b.id === setId)
      );
      if (conflict && !networkConflicts.includes(conflict)) {
        networkConflicts.push(conflict);
      }

      dfs(neighborId, networkSets, networkConflicts);
    });
  }

  for (const setId of Array.from(setMap.keys())) {
    if (!visited.has(setId)) {
      const networkSets: SetWithDetails[] = [];
      const networkConflicts: Conflict[] = [];
      dfs(setId, networkSets, networkConflicts);

      if (networkSets.length > 1) {
        const totalOverlap = networkConflicts.reduce((sum, c) => sum + c.overlapMinutes, 0);
        const artistNames = Array.from(new Set(networkSets.map(s => s.artist.name)));

        networks.push({
          sets: networkSets.sort((a, b) => toMs(a.startTime ?? "") - toMs(b.startTime ?? "")),
          conflicts: networkConflicts,
          totalOverlapMinutes: totalOverlap,
          artistNames,
        });
      }
    }
  }

  return networks;
}

/**
 * Suggests which sets to keep in a conflict network by prioritizing based on genre preferences
 */
export function suggestNetworkResolution(
  network: ConflictNetwork,
  allFavorites: SetWithDetails[]
): { keep: SetWithDetails[]; drop: SetWithDetails[]; reason: string } {
  const freq = new Map<string, number>();
  for (const fav of allFavorites) {
    const genres = (fav.artist.genres ?? "").split(",").map((g) => g.trim()).filter(Boolean);
    for (const g of genres) freq.set(g, (freq.get(g) ?? 0) + 1);
  }

  const scoredSets = network.sets.map(set => ({
    set,
    score: (() => {
      const primary = (set.artist.genres ?? "").split(",")[0]?.trim();
      if (!primary) return 0;
      return freq.get(primary) ?? 0;
    })(),
    startTime: toMs(set.startTime ?? ""),
  }));

  scoredSets.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.startTime - b.startTime;
  });

  const keep: SetWithDetails[] = [];
  const drop: SetWithDetails[] = [];

  for (const { set } of scoredSets) {
    const conflictsWithKept = keep.some(keptSet =>
      network.conflicts.some(c =>
        (c.a.id === set.id && c.b.id === keptSet.id) ||
        (c.a.id === keptSet.id && c.b.id === set.id)
      )
    );

    if (!conflictsWithKept) {
      keep.push(set);
    } else {
      drop.push(set);
    }
  }

  const topGenre = scoredSets[0]?.set.artist.genres?.split(",")[0]?.trim() || "preferred";
  const reason = `Keeps your ${topGenre} favorites that don't conflict`;

  return { keep, drop, reason };
}
