import type {
  RunData,
  RelicStats,
  CardStats,
} from "./parser";

// ─── Relic Stats ────────────────────────────────────────────────────

export interface ComputedRelicStats {
  overallWinrate: number;
  allRelicStats: RelicStats[];
  powerfulRelics: RelicStats[];
  trapRelics: RelicStats[];
}

export function computeRelicStats(
  runs: RunData[],
  minCount: number,
): ComputedRelicStats {
  const totalRuns = runs.length;
  const totalWins = runs.filter((r) => r.win).length;
  const overallWinrate = totalRuns > 0 ? totalWins / totalRuns : 0;

  const relicMap = new Map<string, { wins: number; total: number }>();
  for (const run of runs) {
    for (const relic of run.relics) {
      if (!relicMap.has(relic)) {
        relicMap.set(relic, { wins: 0, total: 0 });
      }
      const stats = relicMap.get(relic)!;
      stats.total++;
      if (run.win) stats.wins++;
    }
  }

  let allRelicStats: RelicStats[] = [];
  relicMap.forEach((stats, relic) => {
    if (stats.total >= minCount) {
      const winrate = stats.wins / stats.total;
      allRelicStats.push({
        relic,
        count: stats.total,
        winrate,
        delta: winrate - overallWinrate,
      });
    }
  });

  allRelicStats.sort((a, b) => b.winrate - a.winrate || b.count - a.count);

  const powerfulRelics = allRelicStats
    .filter((r) => r.winrate > overallWinrate)
    .sort((a, b) => b.winrate - a.winrate || b.count - a.count);

  const trapRelics = allRelicStats
    .filter((r) => r.winrate < overallWinrate)
    .sort((a, b) => a.winrate - b.winrate || b.count - a.count);

  return { overallWinrate, allRelicStats, powerfulRelics, trapRelics };
}

// ─── Card Stats ─────────────────────────────────────────────────────

export function computeCardStats(
  runs: RunData[],
  minCount: number,
): CardStats[] {
  const cardOffered: Record<string, number> = {};
  const cardPicked: Record<string, number> = {};
  const cardWins: Record<string, number> = {};

  for (const run of runs) {
    for (const choice of run.cardChoices) {
      if (choice.inShop) continue; // Skip shop purchases

      const name = choice.cardName;
      cardOffered[name] = (cardOffered[name] || 0) + 1;

      if (choice.wasPicked) {
        cardPicked[name] = (cardPicked[name] || 0) + 1;
        if (run.win) {
          cardWins[name] = (cardWins[name] || 0) + 1;
        }
      }
    }
  }

  const stats: CardStats[] = [];
  for (const cardName in cardOffered) {
    const offered = cardOffered[cardName] || 0;
    const picked = cardPicked[cardName] || 0;
    const wins = cardWins[cardName] || 0;

    if (offered >= minCount) {
      stats.push({
        cardName,
        timesOffered: offered,
        timesPicked: picked,
        pickRate: offered > 0 ? picked / offered : 0,
        winsWhenPicked: wins,
        winRateWhenPicked: picked > 0 ? wins / picked : 0,
      });
    }
  }

  stats.sort((a, b) => b.pickRate - a.pickRate || b.timesOffered - a.timesOffered);
  return stats;
}

// ─── Boss Stats ─────────────────────────────────────────────────────

export interface BossStats {
  name: string;
  encountered: number;
  defeated: number;
  winrate: number;
}

export interface BossCharacterStats {
  bossName: string;
  character: string;
  encountered: number;
  defeated: number;
  winrate: number;
}

export interface ComputedBossStats {
  bossStats: BossStats[];
  bossCharacterStats: BossCharacterStats[];
  hasBossData: boolean;
}

export function computeBossStats(
  runs: RunData[],
  minCount: number,
): ComputedBossStats {
  const bossMap = new Map<string, { encountered: number; defeated: number }>();
  const bossCharMap = new Map<
    string,
    { encountered: number; defeated: number }
  >();

  for (const run of runs) {
    for (const boss of run.bossesEncountered) {
      // Overall boss stats
      if (!bossMap.has(boss.name)) {
        bossMap.set(boss.name, { encountered: 0, defeated: 0 });
      }
      const stats = bossMap.get(boss.name)!;
      stats.encountered++;
      if (boss.defeated) stats.defeated++;

      // Boss-by-character
      const key = `${boss.name}|||${run.character}`;
      if (!bossCharMap.has(key)) {
        bossCharMap.set(key, { encountered: 0, defeated: 0 });
      }
      const charStats = bossCharMap.get(key)!;
      charStats.encountered++;
      if (boss.defeated) charStats.defeated++;
    }
  }

  const bossStats: BossStats[] = [];
  bossMap.forEach((stats, name) => {
    if (stats.encountered >= minCount) {
      bossStats.push({
        name,
        encountered: stats.encountered,
        defeated: stats.defeated,
        winrate: stats.encountered > 0 ? stats.defeated / stats.encountered : 0,
      });
    }
  });
  bossStats.sort((a, b) => a.winrate - b.winrate || b.encountered - a.encountered);

  const bossCharacterStats: BossCharacterStats[] = [];
  bossCharMap.forEach((stats, key) => {
    const [bossName, character] = key.split("|||");
    if (stats.encountered >= Math.max(1, Math.floor(minCount / 2))) {
      bossCharacterStats.push({
        bossName,
        character,
        encountered: stats.encountered,
        defeated: stats.defeated,
        winrate:
          stats.encountered > 0 ? stats.defeated / stats.encountered : 0,
      });
    }
  });

  return {
    bossStats,
    bossCharacterStats,
    hasBossData: bossMap.size > 0,
  };
}

// ─── Floor / Path Stats ─────────────────────────────────────────────

export interface FloorTypeStats {
  type: string;
  count: number;
  avgPerRun: number;
}

export interface ComputedFloorStats {
  avgFloorReachedWins: number;
  avgFloorReachedLosses: number;
  avgFloorReachedOverall: number;
  floorTypeCounts: FloorTypeStats[];
  hasFloorData: boolean;
}

export function computeFloorStats(runs: RunData[]): ComputedFloorStats {
  const wins = runs.filter((r) => r.win);
  const losses = runs.filter((r) => !r.win);

  const avgFloor = (arr: RunData[]) =>
    arr.length > 0
      ? arr.reduce((sum, r) => sum + r.maxFloorReached, 0) / arr.length
      : 0;

  const typeMap = new Map<string, number>();
  let runsWithFloors = 0;

  for (const run of runs) {
    if (run.floors.length > 0) {
      runsWithFloors++;
      for (const floor of run.floors) {
        typeMap.set(floor.type, (typeMap.get(floor.type) || 0) + 1);
      }
    }
  }

  const floorTypeCounts: FloorTypeStats[] = [];
  typeMap.forEach((count, type) => {
    floorTypeCounts.push({
      type,
      count,
      avgPerRun: runsWithFloors > 0 ? count / runsWithFloors : 0,
    });
  });
  floorTypeCounts.sort((a, b) => b.count - a.count);

  return {
    avgFloorReachedWins: avgFloor(wins),
    avgFloorReachedLosses: avgFloor(losses),
    avgFloorReachedOverall: avgFloor(runs),
    floorTypeCounts,
    hasFloorData: runsWithFloors > 0,
  };
}

// ─── Deck Stats ─────────────────────────────────────────────────────

export interface DeckSizeBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  wins: number;
  winrate: number;
}

export interface ComputedDeckStats {
  avgDeckSizeWins: number;
  avgDeckSizeLosses: number;
  avgDeckSizeOverall: number;
  deckSizeBuckets: DeckSizeBucket[];
  hasDeckData: boolean;
}

export function computeDeckStats(runs: RunData[]): ComputedDeckStats {
  const withDecks = runs.filter((r) => r.deckSize > 0);
  const wins = withDecks.filter((r) => r.win);
  const losses = withDecks.filter((r) => !r.win);

  const avg = (arr: RunData[]) =>
    arr.length > 0
      ? arr.reduce((sum, r) => sum + r.deckSize, 0) / arr.length
      : 0;

  // Build bucket ranges
  const buckets: DeckSizeBucket[] = [
    { range: "1-10", min: 1, max: 10, count: 0, wins: 0, winrate: 0 },
    { range: "11-15", min: 11, max: 15, count: 0, wins: 0, winrate: 0 },
    { range: "16-20", min: 16, max: 20, count: 0, wins: 0, winrate: 0 },
    { range: "21-25", min: 21, max: 25, count: 0, wins: 0, winrate: 0 },
    { range: "26-30", min: 26, max: 30, count: 0, wins: 0, winrate: 0 },
    { range: "31-35", min: 31, max: 35, count: 0, wins: 0, winrate: 0 },
    { range: "36-40", min: 36, max: 40, count: 0, wins: 0, winrate: 0 },
    { range: "41+", min: 41, max: Infinity, count: 0, wins: 0, winrate: 0 },
  ];

  for (const run of withDecks) {
    const bucket = buckets.find(
      (b) => run.deckSize >= b.min && run.deckSize <= b.max,
    );
    if (bucket) {
      bucket.count++;
      if (run.win) bucket.wins++;
    }
  }

  for (const bucket of buckets) {
    bucket.winrate = bucket.count > 0 ? bucket.wins / bucket.count : 0;
  }

  return {
    avgDeckSizeWins: avg(wins),
    avgDeckSizeLosses: avg(losses),
    avgDeckSizeOverall: avg(withDecks),
    deckSizeBuckets: buckets.filter((b) => b.count > 0),
    hasDeckData: withDecks.length > 0,
  };
}
