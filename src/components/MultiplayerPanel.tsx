import React from "react";
import { Users, UserPlus, Trophy } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { ComputedMultiplayerStats, TeamCompStats, CharacterPopularity, PlayerCountStats } from "../utils/statsEngine";
import { SortableTable } from "./SortableTable";
import type { ColumnDef } from "./SortableTable";

interface MultiplayerPanelProps {
  stats: ComputedMultiplayerStats;
}

const formatPercent = (val: number) => (val * 100).toFixed(1) + "%";

export const MultiplayerPanel: React.FC<MultiplayerPanelProps> = ({ stats }) => {
  if (!stats.hasMultiplayerData) {
    return (
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2><Users size={24} /> Multiplayer</h2>
        </div>
        <div className="empty-state">
          <Users size={48} />
          <h3>No Multiplayer Data</h3>
          <p>All runs are solo. Play some co-op runs to see multiplayer analytics!</p>
        </div>
      </div>
    );
  }

  // Player count chart
  const countChartData = stats.playerCountStats.map((s) => ({
    label: s.playerCount === 1 ? "Solo" : `${s.playerCount}P`,
    runs: s.runs,
    winPct: Math.round(s.winRate * 100),
  }));

  // Team comp columns
  const teamColumns: ColumnDef<TeamCompStats>[] = [
    { key: "teamComp", label: "Team Composition", accessor: (r) => r.teamComp },
    {
      key: "playerCount", label: "Players", accessor: (r) => r.playerCount, numeric: true,
      render: (r) => `${r.playerCount}P`,
      width: "70px",
    },
    { key: "runs", label: "Runs", accessor: (r) => r.runs, numeric: true, width: "70px" },
    {
      key: "record", label: "Record", accessor: (r) => r.wins, numeric: true,
      render: (r) => `${r.wins}W / ${r.runs - r.wins}L`,
      width: "100px",
    },
    {
      key: "winRate", label: "Win Rate", accessor: (r) => r.winRate, numeric: true,
      render: (r) => (
        <span className={`badge ${r.winRate >= 0.5 ? "positive" : r.winRate > 0 ? "neutral" : "negative"}`}>
          {formatPercent(r.winRate)}
        </span>
      ),
      width: "90px",
    },
  ];

  // Character popularity columns
  const charColumns: ColumnDef<CharacterPopularity>[] = [
    { key: "character", label: "Character", accessor: (r) => r.character },
    { key: "appearances", label: "Appearances", accessor: (r) => r.appearances, numeric: true },
    {
      key: "winRate", label: "Win Rate", accessor: (r) => r.winRate, numeric: true,
      render: (r) => (
        <span className={`badge ${r.winRate >= 0.5 ? "positive" : "negative"}`}>
          {formatPercent(r.winRate)}
        </span>
      ),
    },
  ];

  // Player count stats columns
  const countColumns: ColumnDef<PlayerCountStats>[] = [
    {
      key: "playerCount", label: "Mode", accessor: (r) => r.playerCount,
      render: (r) => (
        <span className="badge neutral">
          {r.playerCount === 1 ? "Solo" : `${r.playerCount}-Player`}
        </span>
      ),
    },
    { key: "runs", label: "Runs", accessor: (r) => r.runs, numeric: true },
    {
      key: "record", label: "Record", accessor: (r) => r.wins, numeric: true,
      render: (r) => `${r.wins}W / ${r.runs - r.wins}L`,
    },
    {
      key: "winRate", label: "Win Rate", accessor: (r) => r.winRate, numeric: true,
      render: (r) => (
        <span className={`badge ${r.winRate >= 0.5 ? "positive" : "negative"}`}>
          {formatPercent(r.winRate)}
        </span>
      ),
    },
    {
      key: "avgTime", label: "Avg Time", accessor: (r) => r.avgRunTime, numeric: true,
      render: (r) => `${r.avgRunTime.toFixed(1)}m`,
    },
  ];

  return (
    <>
      {/* Overview */}
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2><Users size={24} /> Multiplayer Overview</h2>
        </div>
        <div className="stat-overview four-col">
          <div className="stat-card mini">
            <h4><UserPlus size={14} /> Co-op Runs</h4>
            <div className="value">{stats.multiplayerRuns}</div>
            <div className="stat-subtitle">of {stats.multiplayerRuns + stats.soloRuns} total</div>
          </div>
          <div className="stat-card mini">
            <h4>Solo Runs</h4>
            <div className="value">{stats.soloRuns}</div>
          </div>
          <div className="stat-card mini">
            <h4><Trophy size={14} /> Co-op Win Rate</h4>
            <div className="value win-value">
              {formatPercent(
                stats.playerCountStats
                  .filter((s) => s.playerCount > 1)
                  .reduce((w, s) => w + s.wins, 0) /
                Math.max(1, stats.playerCountStats
                  .filter((s) => s.playerCount > 1)
                  .reduce((r, s) => r + s.runs, 0))
              )}
            </div>
          </div>
          <div className="stat-card mini">
            <h4>Team Comps</h4>
            <div className="value">{stats.teamCompStats.length}</div>
          </div>
        </div>

        {/* Win rate by player count chart */}
        <h4 style={{ color: "var(--text-secondary)", margin: "1rem 0 0.5rem" }}>Win Rate by Party Size</h4>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={countChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <XAxis dataKey="label" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-primary)",
                  borderColor: "var(--border-color)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="runs" fill="var(--accent-tertiary)" radius={[4, 4, 0, 0]} name="Runs" />
              <Bar dataKey="winPct" fill="var(--accent-success)" radius={[4, 4, 0, 0]} name="Win %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <SortableTable
          columns={countColumns}
          data={stats.playerCountStats}
          keyExtractor={(r) => String(r.playerCount)}
          exportFilename="player_count_stats.csv"
        />
      </div>

      {/* Team Compositions */}
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2><Users size={24} /> Team Compositions</h2>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>
          All team compositions used in multiplayer. Sorted by frequency.
        </p>
        <SortableTable
          columns={teamColumns}
          data={stats.teamCompStats}
          keyExtractor={(r) => r.teamComp}
          searchPlaceholder="Search teams..."
          searchAccessor={(r) => r.teamComp}
          exportFilename="team_compositions.csv"
        />
      </div>

      {/* Character popularity in co-op */}
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2><UserPlus size={24} /> Character Popularity (Co-op)</h2>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>
          How often each character appears across all multiplayer runs (all players counted, not just you).
        </p>
        <SortableTable
          columns={charColumns}
          data={stats.characterPopularity}
          keyExtractor={(r) => r.character}
          exportFilename="coop_character_popularity.csv"
        />
      </div>
    </>
  );
};
