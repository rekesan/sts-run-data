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

export function computeRelicStats(runs: RunData[], minCount: number): ComputedRelicStats {
  const totalRuns = runs.length;
  const totalWins = runs.filter((r) => r.win).length;
  const overallWinrate = totalRuns > 0 ? totalWins / totalRuns : 0;

  const relicMap = new Map<string, { wins: number; total: number }>();
  for (const run of runs) {
    for (const relic of run.relics) {
      if (!relicMap.has(relic)) relicMap.set(relic, { wins: 0, total: 0 });
      const s = relicMap.get(relic)!;
      s.total++;
      if (run.win) s.wins++;
    }
  }

  const allRelicStats: RelicStats[] = [];
  relicMap.forEach((stats, relic) => {
    if (stats.total >= minCount) {
      const winrate = stats.wins / stats.total;
      allRelicStats.push({ relic, count: stats.total, winrate, delta: winrate - overallWinrate });
    }
  });
  allRelicStats.sort((a, b) => b.winrate - a.winrate || b.count - a.count);

  return {
    overallWinrate,
    allRelicStats,
    powerfulRelics: allRelicStats.filter((r) => r.winrate > overallWinrate),
    trapRelics: allRelicStats
      .filter((r) => r.winrate < overallWinrate)
      .sort((a, b) => a.winrate - b.winrate || b.count - a.count),
  };
}

// ─── Card Stats ─────────────────────────────────────────────────────

export function computeCardStats(runs: RunData[], minCount: number): CardStats[] {
  const offered: Record<string, number> = {};
  const picked: Record<string, number> = {};
  const wins: Record<string, number> = {};

  for (const run of runs) {
    for (const c of run.cardChoices) {
      if (c.inShop) continue;
      offered[c.cardName] = (offered[c.cardName] || 0) + 1;
      if (c.wasPicked) {
        picked[c.cardName] = (picked[c.cardName] || 0) + 1;
        if (run.win) wins[c.cardName] = (wins[c.cardName] || 0) + 1;
      }
    }
  }

  const stats: CardStats[] = [];
  for (const name in offered) {
    const o = offered[name] || 0;
    const p = picked[name] || 0;
    const w = wins[name] || 0;
    if (o >= minCount) {
      stats.push({
        cardName: name, timesOffered: o, timesPicked: p,
        pickRate: o > 0 ? p / o : 0, winsWhenPicked: w,
        winRateWhenPicked: p > 0 ? w / p : 0,
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

export function computeBossStats(runs: RunData[], minCount: number): ComputedBossStats {
  const bossMap = new Map<string, { encountered: number; defeated: number }>();
  const bossCharMap = new Map<string, { encountered: number; defeated: number }>();

  for (const run of runs) {
    for (const boss of run.bossesEncountered) {
      if (!bossMap.has(boss.name)) bossMap.set(boss.name, { encountered: 0, defeated: 0 });
      const s = bossMap.get(boss.name)!;
      s.encountered++;
      if (boss.defeated) s.defeated++;

      const key = `${boss.name}|||${run.character}`;
      if (!bossCharMap.has(key)) bossCharMap.set(key, { encountered: 0, defeated: 0 });
      const c = bossCharMap.get(key)!;
      c.encountered++;
      if (boss.defeated) c.defeated++;
    }
  }

  const bossStats: BossStats[] = [];
  bossMap.forEach((s, name) => {
    if (s.encountered >= minCount)
      bossStats.push({ name, ...s, winrate: s.encountered > 0 ? s.defeated / s.encountered : 0 });
  });
  bossStats.sort((a, b) => a.winrate - b.winrate || b.encountered - a.encountered);

  const bossCharacterStats: BossCharacterStats[] = [];
  bossCharMap.forEach((s, key) => {
    const [bossName, character] = key.split("|||");
    if (s.encountered >= Math.max(1, Math.floor(minCount / 2)))
      bossCharacterStats.push({ bossName, character, ...s, winrate: s.encountered > 0 ? s.defeated / s.encountered : 0 });
  });

  return { bossStats, bossCharacterStats, hasBossData: bossMap.size > 0 };
}

// ─── Death Stats ────────────────────────────────────────────────────

export interface KilledByStats {
  encounter: string;
  encounterType: string;
  count: number;
}

export interface DeathByActStats {
  act: string;
  count: number;
}

export interface DeathByFloorRange {
  range: string;
  count: number;
}

export interface ComputedDeathStats {
  killedBy: KilledByStats[];
  deathsByType: { type: string; count: number }[];
  deathsByAct: DeathByActStats[];
  deathsByFloorRange: DeathByFloorRange[];
  totalDeaths: number;
  hasDeathData: boolean;
}

export function computeDeathStats(runs: RunData[]): ComputedDeathStats {
  const losses = runs.filter((r) => !r.win && !r.wasAbandoned);

  const killedByMap = new Map<string, { type: string; count: number }>();
  const typeMap = new Map<string, number>();
  const actMap = new Map<string, number>();
  const floorRanges: { label: string; min: number; max: number; count: number }[] = [
    { label: "1-7", min: 1, max: 7, count: 0 },
    { label: "8-15", min: 8, max: 15, count: 0 },
    { label: "16-25", min: 16, max: 25, count: 0 },
    { label: "26-35", min: 26, max: 35, count: 0 },
    { label: "36-48", min: 36, max: 48, count: 0 },
  ];

  for (const run of losses) {
    // Killed by
    if (run.killedBy) {
      if (!killedByMap.has(run.killedBy)) {
        killedByMap.set(run.killedBy, { type: run.killedByType || "unknown", count: 0 });
      }
      killedByMap.get(run.killedBy)!.count++;
    }

    // Type
    const type = run.killedByType || "unknown";
    typeMap.set(type, (typeMap.get(type) || 0) + 1);

    // Act
    if (run.diedInAct) {
      actMap.set(run.diedInAct, (actMap.get(run.diedInAct) || 0) + 1);
    }

    // Floor range
    const bucket = floorRanges.find(
      (b) => run.maxFloorReached >= b.min && run.maxFloorReached <= b.max,
    );
    if (bucket) bucket.count++;
  }

  const killedBy: KilledByStats[] = [];
  killedByMap.forEach((s, encounter) => {
    killedBy.push({ encounter, encounterType: s.type, count: s.count });
  });
  killedBy.sort((a, b) => b.count - a.count);

  const deathsByType: { type: string; count: number }[] = [];
  typeMap.forEach((count, type) => deathsByType.push({ type, count }));
  deathsByType.sort((a, b) => b.count - a.count);

  const deathsByAct: DeathByActStats[] = [];
  actMap.forEach((count, act) => deathsByAct.push({ act, count }));
  deathsByAct.sort((a, b) => b.count - a.count);

  return {
    killedBy,
    deathsByType,
    deathsByAct,
    deathsByFloorRange: floorRanges.filter((b) => b.count > 0).map((b) => ({ range: b.label, count: b.count })),
    totalDeaths: losses.length,
    hasDeathData: killedBy.length > 0,
  };
}

// ─── Win Rate Over Time ─────────────────────────────────────────────

export interface WinRatePoint {
  runIndex: number;
  rollingWinrate: number;
  date: string;
  character: string;
  win: boolean;
}

export function computeWinRateOverTime(runs: RunData[], windowSize = 10): WinRatePoint[] {
  // runs are already sorted by startTime from parser
  const points: WinRatePoint[] = [];

  for (let i = 0; i < runs.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = runs.slice(start, i + 1);
    const winCount = window.filter((r) => r.win).length;
    const rollingWinrate = winCount / window.length;

    const date = runs[i].startTime > 0
      ? new Date(runs[i].startTime * 1000).toLocaleDateString()
      : `Run ${i + 1}`;

    points.push({
      runIndex: i + 1,
      rollingWinrate,
      date,
      character: runs[i].character,
      win: runs[i].win,
    });
  }

  return points;
}

// ─── Rest Site Stats ────────────────────────────────────────────────

export interface RestSiteStats {
  choice: string;
  count: number;
  winsWhenChosen: number;
  winRate: number;
}

export function computeRestSiteStats(runs: RunData[]): RestSiteStats[] {
  const choiceMap = new Map<string, { count: number; wins: number }>();

  for (const run of runs) {
    const choicesSeen = new Set<string>();
    for (const rsc of run.restSiteChoices) {
      choicesSeen.add(rsc.choice);
    }
    for (const choice of choicesSeen) {
      if (!choiceMap.has(choice)) choiceMap.set(choice, { count: 0, wins: 0 });
      const s = choiceMap.get(choice)!;
      s.count += run.restSiteChoices.filter((c) => c.choice === choice).length;
      if (run.win) s.wins += run.restSiteChoices.filter((c) => c.choice === choice).length;
    }
  }

  // Actually let's count per-choice (not per-run)
  const perChoice = new Map<string, { total: number; runsW: number; runsT: number }>();
  for (const run of runs) {
    const seen = new Set<string>();
    for (const rsc of run.restSiteChoices) {
      if (!perChoice.has(rsc.choice)) perChoice.set(rsc.choice, { total: 0, runsW: 0, runsT: 0 });
      perChoice.get(rsc.choice)!.total++;
      if (!seen.has(rsc.choice)) {
        perChoice.get(rsc.choice)!.runsT++;
        if (run.win) perChoice.get(rsc.choice)!.runsW++;
        seen.add(rsc.choice);
      }
    }
  }

  const stats: RestSiteStats[] = [];
  perChoice.forEach((s, choice) => {
    stats.push({
      choice,
      count: s.total,
      winsWhenChosen: s.runsW,
      winRate: s.runsT > 0 ? s.runsW / s.runsT : 0,
    });
  });
  stats.sort((a, b) => b.count - a.count);
  return stats;
}

// ─── Ancient/Neow Stats ─────────────────────────────────────────────

export interface AncientStats {
  name: string;
  timesChosen: number;
  timesOffered: number;
  pickRate: number;
  winRate: number;
}

export function computeAncientStats(runs: RunData[], minCount: number): AncientStats[] {
  const map = new Map<string, { chosen: number; offered: number; wins: number; runsChosen: number }>();

  for (const run of runs) {
    for (const ac of run.ancientChoices) {
      if (!map.has(ac.name)) map.set(ac.name, { chosen: 0, offered: 0, wins: 0, runsChosen: 0 });
      const s = map.get(ac.name)!;
      s.offered++;
      if (ac.wasChosen) {
        s.chosen++;
        s.runsChosen++;
        if (run.win) s.wins++;
      }
    }
  }

  const stats: AncientStats[] = [];
  map.forEach((s, name) => {
    if (s.offered >= minCount) {
      stats.push({
        name,
        timesChosen: s.chosen,
        timesOffered: s.offered,
        pickRate: s.offered > 0 ? s.chosen / s.offered : 0,
        winRate: s.runsChosen > 0 ? s.wins / s.runsChosen : 0,
      });
    }
  });
  stats.sort((a, b) => b.timesChosen - a.timesChosen);
  return stats;
}

// ─── Card Operations Stats ──────────────────────────────────────────

export interface CardOpStats {
  cardName: string;
  count: number;
  type: "upgrade" | "remove" | "transform";
  winRate: number;
}

export function computeCardOpStats(runs: RunData[], type: "upgrade" | "remove" | "transform"): CardOpStats[] {
  const cardMap = new Map<string, { count: number; wins: number; runsT: number }>();

  for (const run of runs) {
    const seen = new Set<string>();
    for (const op of run.cardOperations) {
      if (op.type !== type) continue;
      if (!cardMap.has(op.cardName)) cardMap.set(op.cardName, { count: 0, wins: 0, runsT: 0 });
      cardMap.get(op.cardName)!.count++;
      if (!seen.has(op.cardName)) {
        cardMap.get(op.cardName)!.runsT++;
        if (run.win) cardMap.get(op.cardName)!.wins++;
        seen.add(op.cardName);
      }
    }
  }

  const stats: CardOpStats[] = [];
  cardMap.forEach((s, cardName) => {
    stats.push({
      cardName,
      count: s.count,
      type,
      winRate: s.runsT > 0 ? s.wins / s.runsT : 0,
    });
  });
  stats.sort((a, b) => b.count - a.count);
  return stats;
}

// ─── Potion Stats ───────────────────────────────────────────────────

export interface PotionStats {
  name: string;
  timesUsed: number;
}

export function computePotionStats(runs: RunData[]): PotionStats[] {
  const map = new Map<string, number>();

  for (const run of runs) {
    for (const pe of run.potionEvents) {
      if (pe.action === "used") {
        map.set(pe.potionName, (map.get(pe.potionName) || 0) + 1);
      }
    }
  }

  const stats: PotionStats[] = [];
  map.forEach((count, name) => stats.push({ name, timesUsed: count }));
  stats.sort((a, b) => b.timesUsed - a.timesUsed);
  return stats;
}

// ─── Combat Turns Stats ─────────────────────────────────────────────

export interface CombatTurnsStats {
  avgTurnsMonster: number;
  avgTurnsElite: number;
  avgTurnsBoss: number;
  avgTurnsOverall: number;
}

export function computeCombatTurnsStats(runs: RunData[]): CombatTurnsStats {
  const byType: Record<string, number[]> = { monster: [], elite: [], boss: [] };
  const all: number[] = [];

  for (const run of runs) {
    for (const f of run.floors) {
      if (f.turnsTaken !== undefined && f.turnsTaken > 0) {
        all.push(f.turnsTaken);
        if (f.type in byType) byType[f.type].push(f.turnsTaken);
      }
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  return {
    avgTurnsMonster: avg(byType.monster),
    avgTurnsElite: avg(byType.elite),
    avgTurnsBoss: avg(byType.boss),
    avgTurnsOverall: avg(all),
  };
}

// ─── Deck Size Stats ────────────────────────────────────────────────

export interface DeckSizeBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  wins: number;
  winrate: number;
}

export function computeDeckStats(runs: RunData[]) {
  const withDecks = runs.filter((r) => r.deckSize > 0);
  const wins = withDecks.filter((r) => r.win);
  const losses = withDecks.filter((r) => !r.win);

  const avg = (arr: RunData[]) =>
    arr.length > 0 ? arr.reduce((s, r) => s + r.deckSize, 0) / arr.length : 0;

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
    const b = buckets.find((b) => run.deckSize >= b.min && run.deckSize <= b.max);
    if (b) { b.count++; if (run.win) b.wins++; }
  }
  for (const b of buckets) b.winrate = b.count > 0 ? b.wins / b.count : 0;

  return {
    avgDeckSizeWins: avg(wins),
    avgDeckSizeLosses: avg(losses),
    avgDeckSizeOverall: avg(withDecks),
    deckSizeBuckets: buckets.filter((b) => b.count > 0),
    hasDeckData: withDecks.length > 0,
  };
}

// ─── Multiplayer Stats ──────────────────────────────────────────────

export interface PlayerCountStats {
  playerCount: number;
  runs: number;
  wins: number;
  winRate: number;
  avgRunTime: number;
}

export interface TeamCompStats {
  teamComp: string;
  playerCount: number;
  runs: number;
  wins: number;
  winRate: number;
}

export interface CharacterPopularity {
  character: string;
  appearances: number;
  wins: number;
  winRate: number;
}

export interface ComputedMultiplayerStats {
  multiplayerRuns: number;
  soloRuns: number;
  playerCountStats: PlayerCountStats[];
  teamCompStats: TeamCompStats[];
  characterPopularity: CharacterPopularity[];
  hasMultiplayerData: boolean;
}

export function computeMultiplayerStats(runs: RunData[]): ComputedMultiplayerStats {
  const multiRuns = runs.filter((r) => r.playerCount > 1);
  const soloRuns = runs.filter((r) => r.playerCount === 1);

  // By player count
  const countMap = new Map<number, { runs: number; wins: number; totalTime: number }>();
  for (const run of runs) {
    if (!countMap.has(run.playerCount)) countMap.set(run.playerCount, { runs: 0, wins: 0, totalTime: 0 });
    const s = countMap.get(run.playerCount)!;
    s.runs++;
    if (run.win) s.wins++;
    s.totalTime += run.runTime;
  }

  const playerCountStats: PlayerCountStats[] = [];
  countMap.forEach((s, pc) => {
    playerCountStats.push({
      playerCount: pc,
      runs: s.runs,
      wins: s.wins,
      winRate: s.runs > 0 ? s.wins / s.runs : 0,
      avgRunTime: s.runs > 0 ? s.totalTime / s.runs : 0,
    });
  });
  playerCountStats.sort((a, b) => a.playerCount - b.playerCount);

  // Team compositions
  const compMap = new Map<string, { runs: number; wins: number; playerCount: number }>();
  for (const run of multiRuns) {
    if (!compMap.has(run.teamComp)) compMap.set(run.teamComp, { runs: 0, wins: 0, playerCount: run.playerCount });
    const s = compMap.get(run.teamComp)!;
    s.runs++;
    if (run.win) s.wins++;
  }

  const teamCompStats: TeamCompStats[] = [];
  compMap.forEach((s, comp) => {
    teamCompStats.push({
      teamComp: comp,
      playerCount: s.playerCount,
      runs: s.runs,
      wins: s.wins,
      winRate: s.runs > 0 ? s.wins / s.runs : 0,
    });
  });
  teamCompStats.sort((a, b) => b.runs - a.runs || b.winRate - a.winRate);

  // Character popularity in multiplayer (all players, not just player 0)
  const charMap = new Map<string, { apps: number; wins: number }>();
  for (const run of multiRuns) {
    const seen = new Set<string>();
    for (const p of run.allPlayers) {
      if (!charMap.has(p.character)) charMap.set(p.character, { apps: 0, wins: 0 });
      charMap.get(p.character)!.apps++;
      if (!seen.has(p.character) && run.win) {
        // Count win once per character per run even if duplicated
      }
      seen.add(p.character);
    }
    // Count wins per unique character in this run
    if (run.win) {
      const unique = new Set(run.allPlayers.map((p) => p.character));
      for (const c of unique) {
        if (charMap.has(c)) charMap.get(c)!.wins++;
      }
    }
  }

  const characterPopularity: CharacterPopularity[] = [];
  charMap.forEach((s, character) => {
    characterPopularity.push({
      character,
      appearances: s.apps,
      wins: s.wins,
      winRate: s.apps > 0 ? s.wins / s.apps : 0,
    });
  });
  characterPopularity.sort((a, b) => b.appearances - a.appearances);

  return {
    multiplayerRuns: multiRuns.length,
    soloRuns: soloRuns.length,
    playerCountStats,
    teamCompStats,
    characterPopularity,
    hasMultiplayerData: multiRuns.length > 0,
  };
}
