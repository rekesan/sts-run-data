// ─── Types ──────────────────────────────────────────────────────────

export interface FloorData {
  floor: number;
  type: string;
  hpBefore?: number;
  hpAfter?: number;
  maxHp?: number;
  damageTaken?: number;
  goldChange?: number;
  currentGold?: number;
  encounter?: string;      // rooms[0].model_id
  monsterIds?: string[];    // rooms[0].monster_ids
  turnsTaken?: number;      // rooms[0].turns_taken
}

export interface BossEncounter {
  name: string;
  defeated: boolean;
  floor?: number;
}

export interface RestSiteChoice {
  choice: string; // SMITH, HEAL, DIG, etc.
  floor: number;
}

export interface AncientChoice {
  name: string;    // TextKey
  wasChosen: boolean;
}

export interface CardOperation {
  cardName: string;
  floor: number;
  type: "upgrade" | "remove" | "transform";
}

export interface PotionEvent {
  potionName: string;
  action: "used" | "picked" | "discarded";
}

export interface RunData {
  filename: string;
  character: string;
  ascension: number | null;
  runTime: number; // minutes
  win: boolean;
  wasAbandoned: boolean;
  startTime: number; // unix timestamp
  killedBy: string | null; // encounter that killed the player
  killedByType: string | null; // elite/boss/monster
  acts: string[]; // e.g. ["ACT.UNDERDOCKS", "ACT.HIVE", "ACT.GLORY"]
  diedInAct: string | null;
  relics: string[];
  floors: FloorData[];
  bossesEncountered: BossEncounter[];
  finalDeck: string[];
  deckSize: number;
  maxFloorReached: number;
  cardChoices: CardChoice[];
  restSiteChoices: RestSiteChoice[];
  ancientChoices: AncientChoice[];
  cardOperations: CardOperation[];
  potionEvents: PotionEvent[];
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
  delta: number;
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
    .replace("MONSTER.", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function cleanEncounterName(rawName: string): string {
  return rawName
    .replace("ENCOUNTER.", "")
    .replace("_BOSS", "")
    .replace("_ELITE", "")
    .replace("_NORMAL", "")
    .replace("_WEAK", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function cleanPotionName(rawName: string): string {
  return rawName
    .replace("POTION.", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function cleanActName(rawName: string): string {
  return rawName
    .replace("ACT.", "")
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
  const mapPointHistory = data.map_point_history;
  if (!Array.isArray(mapPointHistory)) return floors;

  let floorNum = 0;
  for (const act of mapPointHistory) {
    if (!Array.isArray(act)) continue;
    for (const entry of act) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      floorNum++;

      const ps = Array.isArray(e.player_stats)
        ? (e.player_stats[0] as Record<string, unknown> | undefined)
        : undefined;

      const rooms = Array.isArray(e.rooms) ? e.rooms : [];
      const room = rooms[0] as Record<string, unknown> | undefined;

      const damageTaken = typeof ps?.damage_taken === "number" ? (ps.damage_taken as number) : 0;
      const hpAfter = typeof ps?.current_hp === "number" ? (ps.current_hp as number) : undefined;

      floors.push({
        floor: floorNum,
        type: typeof e.map_point_type === "string" ? e.map_point_type : "unknown",
        hpBefore: hpAfter !== undefined ? hpAfter + damageTaken : undefined,
        hpAfter,
        maxHp: typeof ps?.max_hp === "number" ? (ps.max_hp as number) : undefined,
        damageTaken: damageTaken > 0 ? damageTaken : undefined,
        goldChange: ps
          ? ((typeof ps.gold_gained === "number" ? (ps.gold_gained as number) : 0)
            - (typeof ps.gold_spent === "number" ? (ps.gold_spent as number) : 0)
            - (typeof ps.gold_lost === "number" ? (ps.gold_lost as number) : 0))
          : undefined,
        currentGold: typeof ps?.current_gold === "number" ? (ps.current_gold as number) : undefined,
        encounter: typeof room?.model_id === "string" ? (room.model_id as string) : undefined,
        monsterIds: Array.isArray(room?.monster_ids) ? (room.monster_ids as string[]) : undefined,
        turnsTaken: typeof room?.turns_taken === "number" ? (room.turns_taken as number) : undefined,
      });
    }
  }

  return floors;
}

function extractBosses(data: Record<string, unknown>, runWin: boolean): BossEncounter[] {
  const bosses: BossEncounter[] = [];
  const mapPointHistory = data.map_point_history;
  if (!Array.isArray(mapPointHistory)) return bosses;

  let floorNum = 0;
  const totalActs = mapPointHistory.length;

  for (let actIdx = 0; actIdx < totalActs; actIdx++) {
    const act = mapPointHistory[actIdx];
    if (!Array.isArray(act)) continue;

    for (const entry of act) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      floorNum++;

      if (e.map_point_type !== "boss") continue;

      const rooms = Array.isArray(e.rooms) ? e.rooms : [];
      const room = rooms[0] as Record<string, unknown> | undefined;

      let bossName: string;
      if (room) {
        const monsterIds = Array.isArray(room.monster_ids) ? room.monster_ids : [];
        if (monsterIds.length > 0) {
          bossName = (monsterIds as string[])
            .map((id) => cleanBossName(typeof id === "string" ? id : ""))
            .filter((n) => n.length > 0)
            .join(" & ");
        } else {
          bossName = typeof room.model_id === "string"
            ? cleanEncounterName(room.model_id)
            : "Unknown Boss";
        }
      } else {
        bossName = "Unknown Boss";
      }

      const ps = Array.isArray(e.player_stats)
        ? (e.player_stats[0] as Record<string, unknown> | undefined)
        : undefined;
      const hpAfter = typeof ps?.current_hp === "number" ? (ps.current_hp as number) : -1;
      const defeated = hpAfter > 0 || (actIdx === totalActs - 1 && runWin);

      bosses.push({ name: bossName, defeated, floor: floorNum });
    }
  }

  return bosses;
}

function extractFinalDeck(
  _data: Record<string, unknown>,
  player: Record<string, unknown>,
): string[] {
  const deckSources = [
    player.deck,
    player.master_deck,
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

function extractRestSiteChoices(data: Record<string, unknown>): RestSiteChoice[] {
  const choices: RestSiteChoice[] = [];
  const mph = data.map_point_history;
  if (!Array.isArray(mph)) return choices;

  let floorNum = 0;
  for (const act of mph) {
    if (!Array.isArray(act)) continue;
    for (const entry of act) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      floorNum++;
      if (e.map_point_type !== "rest_site") continue;

      const playerStats = Array.isArray(e.player_stats) ? e.player_stats : [];
      for (const ps of playerStats) {
        if (!ps || typeof ps !== "object") continue;
        const psr = ps as Record<string, unknown>;
        const rsc = Array.isArray(psr.rest_site_choices) ? psr.rest_site_choices : [];
        for (const rc of rsc) {
          let choiceName: string;
          if (typeof rc === "string") {
            choiceName = rc;
          } else if (rc && typeof rc === "object") {
            const rcr = rc as Record<string, unknown>;
            choiceName = typeof rcr.choice === "string" ? rcr.choice : "";
          } else {
            continue;
          }
          if (choiceName) {
            choices.push({ choice: choiceName, floor: floorNum });
          }
        }
      }
    }
  }

  return choices;
}

function extractAncientChoices(data: Record<string, unknown>): AncientChoice[] {
  const choices: AncientChoice[] = [];
  const mph = data.map_point_history;
  if (!Array.isArray(mph)) return choices;

  for (const act of mph) {
    if (!Array.isArray(act)) continue;
    for (const entry of act) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      if (e.map_point_type !== "ancient") continue;

      const playerStats = Array.isArray(e.player_stats) ? e.player_stats : [];
      for (const ps of playerStats) {
        if (!ps || typeof ps !== "object") continue;
        const psr = ps as Record<string, unknown>;
        const ac = Array.isArray(psr.ancient_choice) ? psr.ancient_choice : [];
        for (const choice of ac) {
          if (!choice || typeof choice !== "object") continue;
          const cr = choice as Record<string, unknown>;
          const textKey = typeof cr.TextKey === "string" ? cr.TextKey : "";
          if (textKey) {
            choices.push({
              name: textKey.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
              wasChosen: Boolean(cr.was_chosen),
            });
          }
        }
      }
    }
  }

  return choices;
}

function extractCardOperations(data: Record<string, unknown>): CardOperation[] {
  const ops: CardOperation[] = [];
  const mph = data.map_point_history;
  if (!Array.isArray(mph)) return ops;

  let floorNum = 0;
  for (const act of mph) {
    if (!Array.isArray(act)) continue;
    for (const entry of act) {
      if (!entry || typeof entry !== "object") continue;
      floorNum++;
      const e = entry as Record<string, unknown>;

      const playerStats = Array.isArray(e.player_stats) ? e.player_stats : [];
      for (const ps of playerStats) {
        if (!ps || typeof ps !== "object") continue;
        const psr = ps as Record<string, unknown>;

        // Upgrades
        const upgraded = Array.isArray(psr.upgraded_cards) ? psr.upgraded_cards : [];
        for (const card of upgraded) {
          const id = typeof card === "string" ? card : (card && typeof card === "object" ? (card as Record<string, unknown>).id : null);
          if (typeof id === "string") {
            ops.push({ cardName: cleanCardName(id), floor: floorNum, type: "upgrade" });
          }
        }

        // Removals
        const removed = Array.isArray(psr.cards_removed) ? psr.cards_removed : [];
        for (const card of removed) {
          const id = typeof card === "string" ? card : (card && typeof card === "object" ? (card as Record<string, unknown>).id : null);
          if (typeof id === "string") {
            ops.push({ cardName: cleanCardName(id), floor: floorNum, type: "remove" });
          }
        }

        // Transforms
        const transformed = Array.isArray(psr.cards_transformed) ? psr.cards_transformed : [];
        for (const card of transformed) {
          if (!card || typeof card !== "object") continue;
          const cr = card as Record<string, unknown>;
          const orig = cr.original_card as Record<string, unknown> | undefined;
          if (orig && typeof orig.id === "string") {
            ops.push({ cardName: cleanCardName(orig.id), floor: floorNum, type: "transform" });
          }
        }
      }
    }
  }

  return ops;
}

function extractPotionEvents(data: Record<string, unknown>): PotionEvent[] {
  const events: PotionEvent[] = [];
  const mph = data.map_point_history;
  if (!Array.isArray(mph)) return events;

  for (const act of mph) {
    if (!Array.isArray(act)) continue;
    for (const entry of act) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;

      const playerStats = Array.isArray(e.player_stats) ? e.player_stats : [];
      for (const ps of playerStats) {
        if (!ps || typeof ps !== "object") continue;
        const psr = ps as Record<string, unknown>;

        // Used
        const used = Array.isArray(psr.potion_used) ? psr.potion_used : [];
        for (const p of used) {
          const name = typeof p === "string" ? p : "";
          if (name) events.push({ potionName: cleanPotionName(name), action: "used" });
        }

        // Picked
        const choices = Array.isArray(psr.potion_choices) ? psr.potion_choices : [];
        for (const p of choices) {
          if (!p || typeof p !== "object") continue;
          const pr = p as Record<string, unknown>;
          if (typeof pr.choice === "string" && pr.was_picked) {
            events.push({ potionName: cleanPotionName(pr.choice as string), action: "picked" });
          }
        }

        // Discarded
        const discarded = Array.isArray(psr.potion_discarded) ? psr.potion_discarded : [];
        for (const p of discarded) {
          const name = typeof p === "string" ? p : "";
          if (name) events.push({ potionName: cleanPotionName(name), action: "discarded" });
        }
      }
    }
  }

  return events;
}

function findKilledByType(data: Record<string, unknown>, killedByEncounter: string): string | null {
  const mph = data.map_point_history;
  if (!Array.isArray(mph)) return null;

  for (const act of mph) {
    if (!Array.isArray(act)) continue;
    for (const entry of act) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const rooms = Array.isArray(e.rooms) ? e.rooms : [];
      for (const room of rooms) {
        if (!room || typeof room !== "object") continue;
        const r = room as Record<string, unknown>;
        if (r.model_id === killedByEncounter) {
          return typeof e.map_point_type === "string" ? (e.map_point_type as string) : null;
        }
      }
    }
  }
  return null;
}

function findDiedInAct(data: Record<string, unknown>): string | null {
  if (data.win) return null;
  const mph = data.map_point_history;
  const acts = data.acts;
  if (!Array.isArray(mph) || !Array.isArray(acts)) return null;

  // The last act with floors is where they died
  let lastActIdx = -1;
  for (let i = 0; i < mph.length; i++) {
    if (Array.isArray(mph[i]) && (mph[i] as unknown[]).length > 0) {
      lastActIdx = i;
    }
  }

  if (lastActIdx >= 0 && lastActIdx < acts.length) {
    return cleanActName(acts[lastActIdx] as string);
  }
  return null;
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
                error: err instanceof Error ? err.message : "Invalid JSON",
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
        if (error || !rawData) {
          parseErrors.push({ file: filename, reason: error || "Empty or null data" });
          filesSkipped++;
          continue;
        }

        if (seenFiles.has(filename)) {
          parseErrors.push({ file: filename, reason: "Duplicate file — skipped" });
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
        const players = Array.isArray(data.players) ? data.players : [];
        if (players.length === 0) {
          parseErrors.push({ file: filename, reason: "No players array found" });
          filesSkipped++;
          continue;
        }

        const player = players[0] as Record<string, unknown>;

        // Core metadata
        const win = Boolean(data.win);
        const wasAbandoned = Boolean(data.was_abandoned);
        const startTime = typeof data.start_time === "number" ? data.start_time : 0;
        const character = cleanCharacterName(
          typeof player.character === "string" ? player.character : "",
        );
        const ascension = typeof data.ascension === "number" ? data.ascension : null;
        const runTime = typeof data.run_time === "number" ? data.run_time / 60 : 0;

        // Killed by
        const killedByRaw = typeof data.killed_by_encounter === "string"
          ? data.killed_by_encounter : null;
        const killedBy = killedByRaw && killedByRaw !== "NONE.NONE"
          ? cleanEncounterName(killedByRaw)
          : null;
        const killedByType = killedByRaw && killedByRaw !== "NONE.NONE"
          ? findKilledByType(data, killedByRaw)
          : null;

        // Acts
        const acts = Array.isArray(data.acts)
          ? (data.acts as string[]).map(cleanActName)
          : [];
        const diedInAct = findDiedInAct(data);

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
        const bossesEncountered = extractBosses(data, win);

        // Final deck
        const finalDeck = extractFinalDeck(data, player);

        // Rest site choices
        const restSiteChoices = extractRestSiteChoices(data);

        // Ancient/Neow choices
        const ancientChoices = extractAncientChoices(data);

        // Card operations
        const cardOperations = extractCardOperations(data);

        // Potion events
        const potionEvents = extractPotionEvents(data);

        // Max floor
        const maxFloorReached =
          floors.length > 0
            ? Math.max(...floors.map((f) => f.floor))
            : 0;

        runs.push({
          filename,
          character,
          ascension,
          runTime,
          win,
          wasAbandoned,
          startTime,
          killedBy,
          killedByType,
          acts,
          diedInAct,
          relics,
          floors,
          bossesEncountered,
          finalDeck,
          deckSize: finalDeck.length,
          maxFloorReached,
          cardChoices,
          restSiteChoices,
          ancientChoices,
          cardOperations,
          potionEvents,
        });
      }

      // Sort runs by start time
      runs.sort((a, b) => a.startTime - b.startTime);

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
