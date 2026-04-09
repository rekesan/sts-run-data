import React, { useState, useMemo } from "react";
import type { AnalysisResult } from "../utils/parser";
import {
  computeRelicStats,
  computeCardStats,
  computeBossStats,
} from "../utils/statsEngine";
import { Activity, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { FilterBar } from "./FilterBar";
import { RelicPanel } from "./RelicPanel";
import { CardPanel } from "./CardPanel";
import { RunsPanel } from "./RunsPanel";
import { BossPanel } from "./BossPanel";

interface DashboardProps {
  data: AnalysisResult;
  onReset: () => void;
}

type TabKey = "relics" | "cards" | "runs" | "bosses";

export const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("relics");
  const [selectedCharacter, setSelectedCharacter] = useState("all");
  const [selectedAscension, setSelectedAscension] = useState("all");
  const [minCount, setMinCount] = useState(5);

  const formatPercent = (val: number) => (val * 100).toFixed(1) + "%";

  // Filter runs based on selections
  const filteredRuns = useMemo(() => {
    return data.runs.filter((run) => {
      if (selectedCharacter !== "all" && run.character !== selectedCharacter)
        return false;
      if (selectedAscension !== "all") {
        const asc = Number(selectedAscension);
        if (run.ascension !== asc) return false;
      }
      return true;
    });
  }, [data.runs, selectedCharacter, selectedAscension]);

  // Compute stats from filtered runs
  const relicResult = useMemo(
    () => computeRelicStats(filteredRuns, minCount),
    [filteredRuns, minCount],
  );

  const cardResult = useMemo(
    () => computeCardStats(filteredRuns, minCount),
    [filteredRuns, minCount],
  );

  const bossResult = useMemo(
    () => computeBossStats(filteredRuns, minCount),
    [filteredRuns, minCount],
  );

  // Overview numbers
  const totalFiltered = filteredRuns.length;
  const totalWinsFiltered = filteredRuns.filter((r) => r.win).length;
  const totalLossesFiltered = totalFiltered - totalWinsFiltered;
  const filteredWinrate =
    totalFiltered > 0 ? totalWinsFiltered / totalFiltered : 0;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "relics", label: "Relics" },
    { key: "cards", label: "Cards" },
    { key: "runs", label: "Runs" },
    { key: "bosses", label: "Bosses" },
  ];

  return (
    <div className="dashboard-grid">
      {/* Overview */}
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2>
            <Activity size={24} /> Overview
          </h2>
          <button className="reset-btn" onClick={onReset}>
            New Analysis
          </button>
        </div>
        <div className="stat-overview">
          <div className="stat-card">
            <h4>Total Runs</h4>
            <div className="value">{totalFiltered}</div>
            {totalFiltered !== data.totalRuns && (
              <div className="stat-subtitle">
                of {data.totalRuns} total
              </div>
            )}
          </div>
          <div className="stat-card">
            <h4>
              <Trophy size={16} /> Wins
            </h4>
            <div className="value win-value">{totalWinsFiltered}</div>
          </div>
          <div className="stat-card">
            <h4>
              <TrendingDown size={16} /> Losses
            </h4>
            <div className="value loss-value">{totalLossesFiltered}</div>
          </div>
          <div className="stat-card">
            <h4>
              <TrendingUp size={16} /> Winrate
            </h4>
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

      {/* Filter Bar */}
      <div className="glass-panel full-width filter-panel">
        <FilterBar
          characters={data.characters}
          ascensionLevels={data.ascensionLevels}
          selectedCharacter={selectedCharacter}
          selectedAscension={selectedAscension}
          minCount={minCount}
          onCharacterChange={setSelectedCharacter}
          onAscensionChange={setSelectedAscension}
          onMinCountChange={setMinCount}
        />
      </div>

      {/* Tabs */}
      <div
        className="glass-panel full-width"
        style={{
          paddingBottom: 0,
          borderBottom: "none",
          background: "transparent",
          boxShadow: "none",
        }}
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
      {activeTab === "relics" && (
        <RelicPanel
          powerfulRelics={relicResult.powerfulRelics}
          trapRelics={relicResult.trapRelics}
          overallWinrate={relicResult.overallWinrate}
        />
      )}

      {activeTab === "cards" && (
        <CardPanel
          cardStats={cardResult}
          overallWinrate={filteredWinrate}
        />
      )}

      {activeTab === "runs" && <RunsPanel runs={filteredRuns} />}

      {activeTab === "bosses" && (
        <BossPanel
          bossStats={bossResult.bossStats}
          bossCharacterStats={bossResult.bossCharacterStats}
          hasBossData={bossResult.hasBossData}
        />
      )}
    </div>
  );
};
