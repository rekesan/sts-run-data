export interface RunData {
  filename: string;
  character: string;
  ascension: number | null;
  runTime: number; // min
  win: boolean;
  relics: string[];
}

export interface RelicStats {
  relic: string;
  winrate: number;
  count: number;
}

export interface CardStats {
  cardName: string;
  timesOffered: number;
  timesPicked: number;
  pickRate: number;
  winsWhenPicked: number;
  winRateWhenPicked: number;
}

export interface AnalysisResult {
  overallWinrate: number;
  relicStats: RelicStats[];
  powerfulRelics: RelicStats[];
  trapRelics: RelicStats[];
  cardStats: CardStats[];
}

function cleanRelicName(rawName: string) {
  return rawName
    .replace("RELIC.", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function cleanCharacterName(rawName: string) {
  return rawName
    .replace("CHARACTER.", "")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function cleanCardName(rawName: string) {
  return rawName
    .replace("CARD.", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function parseRunDataFiles(files: File[]): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    const readerPromises = files.map((file) => {
      return new Promise<{ filename: string; data: unknown }>((res) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            res({ filename: file.name, data });
          } catch {
            res({ filename: file.name, data: null });
          }
        };
        reader.readAsText(file);
      });
    });

    Promise.all(readerPromises).then((results) => {
      const allRuns: RunData[] = [];
      const cardOfferedCounts: Record<string, number> = {};
      const cardPickedCounts: Record<string, number> = {};
      const cardWinCounts: Record<string, number> = {};

      let totalWins = 0;
      let totalRuns = 0;

      for (const { filename, data: rawData } of results) {
        if (!rawData || typeof rawData !== "object") continue;
        const data = rawData as Record<string, unknown>;

        // Parse run details
        const players = Array.isArray(data.players) ? data.players : [];
        if (players.length === 0) continue; // Not a valid run file format we expect

        const win = Boolean(data.win);
        if (win) totalWins++;
        totalRuns++;

        const player = players[0] as Record<string, unknown>;
        const rawRelics = Array.isArray(player.relics) ? player.relics : [];
        const relics = rawRelics.map((r: unknown) => {
          const rObj = r as Record<string, unknown>;
          return cleanRelicName(typeof rObj?.id === "string" ? rObj.id : "");
        });

        allRuns.push({
          filename,
          character: cleanCharacterName(
            typeof player.character === "string" ? player.character : "",
          ),
          ascension: typeof data.ascension === "number" ? data.ascension : null,
          runTime: typeof data.run_time === "number" ? data.run_time / 60 : 0,
          win,
          relics,
        });

        // Parse cards recursively
        function extractCards(obj: unknown, inShop = false) {
          if (!obj) return;
          if (typeof obj !== "object") return;

          if (Array.isArray(obj)) {
            for (const item of obj) {
              extractCards(item, inShop);
            }
          } else {
            const objRecord = obj as Record<string, unknown>;
            const currentInShop = inShop || objRecord.map_point_type === "shop";
            for (const key of Object.keys(obj)) {
              if (key === "card_choices") {
                if (currentInShop) continue;
                const choices = objRecord[key];
                if (!Array.isArray(choices)) continue;
                for (const choice of choices) {
                  const choiceRecord = choice as Record<string, unknown>;
                  const card = choiceRecord.card as
                    | Record<string, unknown>
                    | undefined;
                  if (!card || typeof card.id !== "string") continue;
                  const cardName = cleanCardName(card.id);

                  cardOfferedCounts[cardName] =
                    (cardOfferedCounts[cardName] || 0) + 1;

                  if (choiceRecord.was_picked) {
                    cardPickedCounts[cardName] =
                      (cardPickedCounts[cardName] || 0) + 1;
                    if (win) {
                      cardWinCounts[cardName] =
                        (cardWinCounts[cardName] || 0) + 1;
                    }
                  }
                }
              } else {
                extractCards(objRecord[key], currentInShop);
              }
            }
          }
        }

        extractCards(data);
      }

      // Compute Relic Stats
      const relicMap = new Map<string, { wins: number; total: number }>();
      allRuns.forEach((run) => {
        run.relics.forEach((relic) => {
          if (!relicMap.has(relic)) {
            relicMap.set(relic, { wins: 0, total: 0 });
          }
          const stats = relicMap.get(relic)!;
          stats.total++;
          if (run.win) stats.wins++;
        });
      });

      const overallWinrate = totalRuns > 0 ? totalWins / totalRuns : 0;

      let relicStats: RelicStats[] = [];
      relicMap.forEach((stats, relic) => {
        relicStats.push({
          relic,
          count: stats.total,
          winrate: stats.wins / stats.total,
        });
      });

      // Filter min_count = 5
      relicStats = relicStats.filter((r) => r.count >= 5);
      relicStats.sort((a, b) => b.winrate - a.winrate || b.count - a.count);

      const powerfulRelics = relicStats
        .filter((r) => r.winrate > overallWinrate)
        .sort((a, b) => b.winrate - a.winrate || b.count - a.count);
      const trapRelics = relicStats
        .filter((r) => r.winrate < overallWinrate)
        .sort((a, b) => a.winrate - b.winrate || b.count - a.count); // Low winrate first

      // Compute Card Stats
      const cardStats: CardStats[] = [];
      for (const cardName in cardOfferedCounts) {
        const offered = cardOfferedCounts[cardName] || 0;
        const picked = cardPickedCounts[cardName] || 0;
        const wins = cardWinCounts[cardName] || 0;

        if (offered >= 5) {
          // Filter out cards seen less than 5 times
          cardStats.push({
            cardName,
            timesOffered: offered,
            timesPicked: picked,
            pickRate: offered > 0 ? picked / offered : 0,
            winsWhenPicked: wins,
            winRateWhenPicked: picked > 0 ? wins / picked : 0,
          });
        }
      }

      // Sort by pick rate as default
      cardStats.sort(
        (a, b) => b.pickRate - a.pickRate || b.timesOffered - a.timesOffered,
      );

      resolve({
        overallWinrate,
        relicStats,
        powerfulRelics,
        trapRelics,
        cardStats,
      });
    });
  });
}
