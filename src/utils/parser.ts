// ─── Types ──────────────────────────────────────────────────────────

export interface FloorData {
  floor: number;
  type: string; // "elite", "boss", "shop", "event", "rest", "monster", "treasure", etc.
  hpBefore?: number;
  hpAfter?: number;
  goldChange?: number;
}

export interface BossEncounter {
  name: string;
  defeated: boolean;
  floor?: number;
}

export interface RunData {
  filename: string;
  character: string;
  ascension: number | null;
  runTime: number; // minutes
  win: boolean;
  relics: string[];
  floors: FloorData[];
  bossesEncountered: BossEncounter[];
  finalDeck: string[];
  deckSize: number;
  maxFloorReached: number;
  // Card choice raw data (preserved per-run for dynamic re-computation)
  cardChoices: CardChoice[];
}

export interface CardChoice {
  cardName: string;
  wasPicked: boolean;
  inShop: boolean;
}

export interface RelicStats {
  relic: string;
  winrate: number;
  count: number;
  delta: number; // difference from overall winrate
}

export interface CardStats {
  cardName: string;
  timesOffered: number;
  timesPicked: number;
  pickRate: number;
  winsWhenPicked: number;
  winRateWhenPicked: number;
}

export interface ParseError {
  file: string;
  reason: string;
}

export interface AnalysisResult {
  runs: RunData[];
  totalRuns: number;
  totalWins: number;
  overallWinrate: number;
  characters: string[];
  ascensionLevels: number[];
  parseErrors: ParseError[];
  filesProcessed: number;
  filesSkipped: number;
}

// ─── Name Cleaners ──────────────────────────────────────────────────

function cleanRelicName(rawName: string): string {
  return rawName
    .replace("RELIC.", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function cleanCharacterName(rawName: string): string {
  return rawName
    .replace("CHARACTER.", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function cleanCardName(rawName: string): string {
  return rawName
    .replace("CARD.", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function cleanBossName(rawName: string): string {
  return rawName
    .replace("BOSS.", "")
    .replace("ENEMY.", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// ─── Extraction Helpers ─────────────────────────────────────────────

function extractCardChoices(
  obj: unknown,
  choices: CardChoice[],
  inShop = false,
): void {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractCardChoices(item, choices, inShop);
    }
  } else {
    const rec = obj as Record<string, unknown>;
    const currentInShop = inShop || rec.map_point_type === "shop";

    for (const key of Object.keys(rec)) {
      if (key === "card_choices") {
        const arr = rec[key];
        if (!Array.isArray(arr)) continue;
        for (const choice of arr) {
          const c = choice as Record<string, unknown>;
          const card = c.card as Record<string, unknown> | undefined;
          if (!card || typeof card.id !== "string") continue;
          choices.push({
            cardName: cleanCardName(card.id),
            wasPicked: Boolean(c.was_picked),
            inShop: currentInShop,
          });
        }
      } else {
        extractCardChoices(rec[key], choices, currentInShop);
      }
    }
  }
}

function extractFloors(data: Record<string, unknown>): FloorData[] {
  const floors: FloorData[] = [];

  // STS2 stores floor data in various structures — try common locations
  // Try players[0].path or data.path or data.floors
  const pathSources = [
    (data.players as Record<string, unknown>[])?.[0]?.path,
    data.path,
    data.floors,
    (data.players as Record<string, unknown>[])?.[0]?.floors,
  ];

  for (const source of pathSources) {
    if (!Array.isArray(source)) continue;
    for (const entry of source) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      floors.push({
        floor: typeof e.floor === "number" ? e.floor : floors.length + 1,
        type: typeof e.map_point_type === "string"
          ? e.map_point_type
          : typeof e.type === "string"
            ? e.type
            : "unknown",
        hpBefore: typeof e.current_hp === "number" ? e.current_hp : undefined,
        hpAfter: typeof e.hp_after === "number" ? e.hp_after : undefined,
        goldChange: typeof e.gold_change === "number" ? e.gold_change : undefined,
      });
    }
    if (floors.length > 0) break; // Use first source that has data
  }

  return floors;
}

function extractBosses(data: Record<string, unknown>): BossEncounter[] {
  const bosses: BossEncounter[] = [];

  // Try various known structures for boss data
  const bossSource =
    data.boss_relics ??
    data.bosses ??
    (data.players as Record<string, unknown>[])?.[0]?.bosses;

  // Extract from floor/path data — nodes with type boss
  const pathSources = [
    (data.players as Record<string, unknown>[])?.[0]?.path,
    data.path,
  ];

  for (const source of pathSources) {
    if (!Array.isArray(source)) continue;
    for (const entry of source) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      if (
        e.map_point_type === "boss" ||
        e.type === "boss"
      ) {
        const enemyName =
          typeof e.enemy === "string"
            ? e.enemy
            : typeof e.enemies === "string"
              ? e.enemies
              : typeof e.name === "string"
                ? e.name
                : null;
        if (enemyName) {
          bosses.push({
            name: cleanBossName(enemyName),
            defeated: Boolean(e.defeated ?? e.won ?? e.victory),
            floor: typeof e.floor === "number" ? e.floor : undefined,
          });
        }
      }
    }
  }

  // Also try explicit boss arrays
  if (Array.isArray(bossSource)) {
    for (const b of bossSource) {
      if (!b || typeof b !== "object") continue;
      const boss = b as Record<string, unknown>;
      const name =
        typeof boss.name === "string"
          ? boss.name
          : typeof boss.id === "string"
            ? boss.id
            : null;
      if (name && !bosses.some((existing) => existing.name === cleanBossName(name))) {
        bosses.push({
          name: cleanBossName(name),
          defeated: Boolean(boss.defeated ?? boss.won ?? true),
          floor: typeof boss.floor === "number" ? boss.floor : undefined,
        });
      }
    }
  }

  return bosses;
}

function extractFinalDeck(
  data: Record<string, unknown>,
  player: Record<string, unknown>,
): string[] {
  // Try player.deck, player.master_deck, data.master_deck
  const deckSources = [
    player.deck,
    player.master_deck,
    data.master_deck,
    player.cards,
  ];

  for (const source of deckSources) {
    if (!Array.isArray(source)) continue;
    const deck: string[] = [];
    for (const card of source) {
      if (typeof card === "string") {
        deck.push(cleanCardName(card));
      } else if (card && typeof card === "object") {
        const c = card as Record<string, unknown>;
        if (typeof c.id === "string") {
          deck.push(cleanCardName(c.id));
        }
      }
    }
    if (deck.length > 0) return deck;
  }

  return [];
}

// ─── Main Parser ────────────────────────────────────────────────────

export function parseRunDataFiles(files: File[]): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    const readerPromises = files.map((file) => {
      return new Promise<{ filename: string; data: unknown; error?: string }>(
        (res) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = JSON.parse(e.target?.result as string);
              res({ filename: file.name, data });
            } catch (err) {
              res({
                filename: file.name,
                data: null,
                error:
                  err instanceof Error ? err.message : "Invalid JSON",
              });
            }
          };
          reader.onerror = () => {
            res({ filename: file.name, data: null, error: "File read error" });
          };
          reader.readAsText(file);
        },
      );
    });

    Promise.all(readerPromises).then((results) => {
      const runs: RunData[] = [];
      const parseErrors: ParseError[] = [];
      const seenFiles = new Set<string>();
      let filesSkipped = 0;

      for (const { filename, data: rawData, error } of results) {
        // Parse error
        if (error || !rawData) {
          parseErrors.push({
            file: filename,
            reason: error || "Empty or null data",
          });
          filesSkipped++;
          continue;
        }

        // Duplicate detection
        if (seenFiles.has(filename)) {
          parseErrors.push({
            file: filename,
            reason: "Duplicate file — skipped",
          });
          filesSkipped++;
          continue;
        }
        seenFiles.add(filename);

        if (typeof rawData !== "object") {
          parseErrors.push({ file: filename, reason: "Not a JSON object" });
          filesSkipped++;
          continue;
        }

        const data = rawData as Record<string, unknown>;

        // Validate structure
        const players = Array.isArray(data.players) ? data.players : [];
        if (players.length === 0) {
          parseErrors.push({
            file: filename,
            reason: "No players array found — not a valid STS2 run file",
          });
          filesSkipped++;
          continue;
        }

        const player = players[0] as Record<string, unknown>;

        // Core metadata
        const win = Boolean(data.win);
        const character = cleanCharacterName(
          typeof player.character === "string" ? player.character : "",
        );
        const ascension =
          typeof data.ascension === "number" ? data.ascension : null;
        const runTime =
          typeof data.run_time === "number" ? data.run_time / 60 : 0;

        // Relics
        const rawRelics = Array.isArray(player.relics) ? player.relics : [];
        const relics = rawRelics.map((r: unknown) => {
          const rObj = r as Record<string, unknown>;
          return cleanRelicName(typeof rObj?.id === "string" ? rObj.id : "");
        });

        // Card choices
        const cardChoices: CardChoice[] = [];
        extractCardChoices(data, cardChoices);

        // Floors
        const floors = extractFloors(data);

        // Bosses
        const bossesEncountered = extractBosses(data);

        // Final deck
        const finalDeck = extractFinalDeck(data, player);

        // Max floor
        const maxFloorReached =
          floors.length > 0
            ? Math.max(...floors.map((f) => f.floor))
            : typeof data.floor_reached === "number"
              ? (data.floor_reached as number)
              : 0;

        runs.push({
          filename,
          character,
          ascension,
          runTime,
          win,
          relics,
          floors,
          bossesEncountered,
          finalDeck,
          deckSize: finalDeck.length,
          maxFloorReached,
          cardChoices,
        });
      }

      // Compute aggregate metadata
      const totalRuns = runs.length;
      const totalWins = runs.filter((r) => r.win).length;
      const overallWinrate = totalRuns > 0 ? totalWins / totalRuns : 0;

      const characters = [...new Set(runs.map((r) => r.character))].filter(
        (c) => c.length > 0,
      ).sort();
      const ascensionLevels = [
        ...new Set(
          runs.map((r) => r.ascension).filter((a): a is number => a !== null),
        ),
      ].sort((a, b) => a - b);

      resolve({
        runs,
        totalRuns,
        totalWins,
        overallWinrate,
        characters,
        ascensionLevels,
        parseErrors,
        filesProcessed: totalRuns,
        filesSkipped,
      });
    });
  });
}
