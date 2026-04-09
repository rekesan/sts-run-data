import React, { useState, useMemo } from "react";
import type { AnalysisResult } from "../utils/parser";
import {
  computeRelicStats,
  computeCardStats,
  computeBossStats,
  computeDeathStats,
  computeWinRateOverTime,
  computeRestSiteStats,
  computeAncientStats,
  computeCardOpStats,
  computePotionStats,
  computeCombatTurnsStats,
  computeMultiplayerStats,
} from "../utils/statsEngine";
import { Activity, Trophy, TrendingUp, TrendingDown, Ghost } from "lucide-react";
import { FilterBar } from "./FilterBar";
import { RelicPanel } from "./RelicPanel";
import { CardPanel } from "./CardPanel";
import { RunsPanel } from "./RunsPanel";
import { BossPanel } from "./BossPanel";
import { DeathPanel } from "./DeathPanel";
import { ProgressPanel } from "./ProgressPanel";
import { StrategyPanel } from "./StrategyPanel";
import { MultiplayerPanel } from "./MultiplayerPanel";

interface DashboardProps {
  data: AnalysisResult;
  onReset: () => void;
}

type TabKey = "relics" | "cards" | "runs" | "bosses" | "deaths" | "progress" | "strategy" | "multiplayer";

export const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("progress");
  const [selectedCharacter, setSelectedCharacter] = useState("all");
  const [selectedAscension, setSelectedAscension] = useState("all");
  const [selectedMode, setSelectedMode] = useState("all");
  const [minCount, setMinCount] = useState(5);
  const [excludeAbandoned, setExcludeAbandoned] = useState(true);

  const formatPercent = (val: number) => (val * 100).toFixed(1) + "%";

  // Count abandoned
  const abandonedCount = useMemo(
    () => data.runs.filter((r) => r.wasAbandoned).length,
    [data.runs],
  );

  // Filter runs
  const filteredRuns = useMemo(() => {
    return data.runs.filter((run) => {
      if (excludeAbandoned && run.wasAbandoned) return false;
      if (selectedCharacter !== "all" && run.character !== selectedCharacter) return false;
      if (selectedAscension !== "all" && run.ascension !== Number(selectedAscension)) return false;
      if (selectedMode === "solo" && run.playerCount !== 1) return false;
      if (selectedMode === "multi" && run.playerCount === 1) return false;
      return true;
    });
  }, [data.runs, selectedCharacter, selectedAscension, selectedMode, excludeAbandoned]);

  // Compute all stats from filtered runs
  const relicResult = useMemo(() => computeRelicStats(filteredRuns, minCount), [filteredRuns, minCount]);
  const cardResult = useMemo(() => computeCardStats(filteredRuns, minCount), [filteredRuns, minCount]);
  const bossResult = useMemo(() => computeBossStats(filteredRuns, minCount), [filteredRuns, minCount]);
  const deathResult = useMemo(() => computeDeathStats(filteredRuns), [filteredRuns]);
  const winRateData = useMemo(() => computeWinRateOverTime(filteredRuns), [filteredRuns]);
  const restSiteResult = useMemo(() => computeRestSiteStats(filteredRuns), [filteredRuns]);
  const ancientResult = useMemo(() => computeAncientStats(filteredRuns, Math.max(1, Math.floor(minCount / 2))), [filteredRuns, minCount]);
  const upgradeResult = useMemo(() => computeCardOpStats(filteredRuns, "upgrade"), [filteredRuns]);
  const removalResult = useMemo(() => computeCardOpStats(filteredRuns, "remove"), [filteredRuns]);
  const potionResult = useMemo(() => computePotionStats(filteredRuns), [filteredRuns]);
  const combatTurns = useMemo(() => computeCombatTurnsStats(filteredRuns), [filteredRuns]);
  const multiplayerResult = useMemo(() => computeMultiplayerStats(filteredRuns), [filteredRuns]);

  // Overview
  const totalFiltered = filteredRuns.length;
  const totalWinsFiltered = filteredRuns.filter((r) => r.win).length;
  const totalLossesFiltered = filteredRuns.filter((r) => !r.win).length;
  const filteredWinrate = totalFiltered > 0 ? totalWinsFiltered / totalFiltered : 0;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "progress", label: "Progress" },
    { key: "deaths", label: "Deaths" },
    { key: "relics", label: "Relics" },
    { key: "cards", label: "Cards" },
    { key: "strategy", label: "Strategy" },
    { key: "bosses", label: "Bosses" },
    { key: "multiplayer", label: "Co-op" },
    { key: "runs", label: "Runs" },
  ];

  return (
    <div className="dashboard-grid">
      {/* Overview */}
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2><Activity size={24} /> Overview</h2>
          <button className="reset-btn" onClick={onReset}>New Analysis</button>
        </div>
        <div className="stat-overview">
          <div className="stat-card">
            <h4>Total Runs</h4>
            <div className="value">{totalFiltered}</div>
            {(totalFiltered !== data.totalRuns || abandonedCount > 0) && (
              <div className="stat-subtitle">
                {abandonedCount > 0 && excludeAbandoned
                  ? `${abandonedCount} abandoned excluded`
                  : totalFiltered !== data.totalRuns
                    ? `of ${data.totalRuns} total`
                    : ""}
              </div>
            )}
          </div>
          <div className="stat-card">
            <h4><Trophy size={16} /> Wins</h4>
            <div className="value win-value">{totalWinsFiltered}</div>
          </div>
          <div className="stat-card">
            <h4><TrendingDown size={16} /> Losses</h4>
            <div className="value loss-value">{totalLossesFiltered}</div>
          </div>
          <div className="stat-card">
            <h4><TrendingUp size={16} /> Winrate</h4>
            <div className="value">{formatPercent(filteredWinrate)}</div>
          </div>
          <div className="stat-card">
            <h4>Relics Tracked</h4>
            <div className="value">{relicResult.allRelicStats.length}</div>
          </div>
          <div className="stat-card">
            <h4>Cards Tracked</h4>
            <div className="value">{cardResult.length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel full-width filter-panel">
        <FilterBar
          characters={data.characters}
          ascensionLevels={data.ascensionLevels}
          selectedCharacter={selectedCharacter}
          selectedAscension={selectedAscension}
          selectedMode={selectedMode}
          minCount={minCount}
          onCharacterChange={setSelectedCharacter}
          onAscensionChange={setSelectedAscension}
          onModeChange={setSelectedMode}
          onMinCountChange={setMinCount}
        />
        {abandonedCount > 0 && (
          <div className="abandoned-toggle">
            <label>
              <input
                type="checkbox"
                checked={excludeAbandoned}
                onChange={(e) => setExcludeAbandoned(e.target.checked)}
              />
              <Ghost size={14} />
              Exclude {abandonedCount} abandoned run{abandonedCount !== 1 ? "s" : ""}
            </label>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        className="glass-panel full-width"
        style={{ paddingBottom: 0, borderBottom: "none", background: "transparent", boxShadow: "none" }}
      >
        <div className="tabs">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "progress" && (
        <ProgressPanel winRateData={winRateData} overallWinrate={filteredWinrate} />
      )}

      {activeTab === "deaths" && (
        <DeathPanel deathStats={deathResult} />
      )}

      {activeTab === "relics" && (
        <RelicPanel
          powerfulRelics={relicResult.powerfulRelics}
          trapRelics={relicResult.trapRelics}
          overallWinrate={relicResult.overallWinrate}
        />
      )}

      {activeTab === "cards" && (
        <CardPanel cardStats={cardResult} overallWinrate={filteredWinrate} />
      )}

      {activeTab === "strategy" && (
        <StrategyPanel
          restSiteStats={restSiteResult}
          ancientStats={ancientResult}
          upgradeStats={upgradeResult}
          removalStats={removalResult}
          potionStats={potionResult}
          combatTurns={combatTurns}
          overallWinrate={filteredWinrate}
        />
      )}

      {activeTab === "bosses" && (
        <BossPanel
          bossStats={bossResult.bossStats}
          bossCharacterStats={bossResult.bossCharacterStats}
          hasBossData={bossResult.hasBossData}
        />
      )}

      {activeTab === "multiplayer" && (
        <MultiplayerPanel stats={multiplayerResult} />
      )}

      {activeTab === "runs" && <RunsPanel runs={filteredRuns} />}
    </div>
  );
};
