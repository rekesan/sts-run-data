import React from "react";
import { Flame, Sparkles, Trash2, FlaskConical, Swords, Wand2, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { RestSiteStats, AncientStats, CardOpStats, PotionStats, CombatTurnsStats } from "../utils/statsEngine";
import { SortableTable } from "./SortableTable";
import type { ColumnDef } from "./SortableTable";

interface StrategyPanelProps {
  restSiteStats: RestSiteStats[];
  ancientStats: AncientStats[];
  upgradeStats: CardOpStats[];
  removalStats: CardOpStats[];
  potionStats: PotionStats[];
  combatTurns: CombatTurnsStats;
  overallWinrate: number;
}

const formatPercent = (val: number) => (val * 100).toFixed(1) + "%";

export const StrategyPanel: React.FC<StrategyPanelProps> = ({
  restSiteStats,
  ancientStats,
  upgradeStats,
  removalStats,
  potionStats,
  combatTurns,
  overallWinrate,
}) => {
  // Rest site columns
  const restColumns: ColumnDef<RestSiteStats>[] = [
    { key: "choice", label: "Choice", accessor: (r) => r.choice },
    { key: "count", label: "Times", accessor: (r) => r.count, numeric: true },
    {
      key: "winRate", label: "Win Rate (runs)", accessor: (r) => r.winRate, numeric: true,
      render: (r) => (
        <span className={`badge ${r.winRate >= overallWinrate ? "positive" : "negative"}`}>
          {formatPercent(r.winRate)}
        </span>
      ),
    },
  ];

  // Ancient columns
  const ancientColumns: ColumnDef<AncientStats>[] = [
    { key: "name", label: "Bonus", accessor: (r) => r.name },
    { key: "timesChosen", label: "Chosen", accessor: (r) => r.timesChosen, numeric: true },
    { key: "timesOffered", label: "Offered", accessor: (r) => r.timesOffered, numeric: true },
    {
      key: "pickRate", label: "Pick Rate", accessor: (r) => r.pickRate, numeric: true,
      render: (r) => formatPercent(r.pickRate),
    },
    {
      key: "winRate", label: "Win Rate", accessor: (r) => r.winRate, numeric: true,
      render: (r) => r.timesChosen > 0 ? (
        <span className={`badge ${r.winRate >= overallWinrate ? "positive" : "negative"}`}>
          {formatPercent(r.winRate)}
        </span>
      ) : <span className="badge">—</span>,
    },
  ];

  // Upgrade columns
  const upgradeColumns: ColumnDef<CardOpStats>[] = [
    { key: "cardName", label: "Card", accessor: (r) => r.cardName },
    { key: "count", label: "Times", accessor: (r) => r.count, numeric: true },
    {
      key: "winRate", label: "Win Rate", accessor: (r) => r.winRate, numeric: true,
      render: (r) => (
        <span className={`badge ${r.winRate >= overallWinrate ? "positive" : "negative"}`}>
          {formatPercent(r.winRate)}
        </span>
      ),
    },
  ];

  // Removal columns
  const removalColumns: ColumnDef<CardOpStats>[] = [
    { key: "cardName", label: "Card", accessor: (r) => r.cardName },
    { key: "count", label: "Times", accessor: (r) => r.count, numeric: true },
    {
      key: "winRate", label: "Win Rate", accessor: (r) => r.winRate, numeric: true,
      render: (r) => (
        <span className={`badge ${r.winRate >= overallWinrate ? "positive" : "negative"}`}>
          {formatPercent(r.winRate)}
        </span>
      ),
    },
  ];

  // Potion columns
  const potionColumns: ColumnDef<PotionStats>[] = [
    { key: "name", label: "Potion", accessor: (r) => r.name },
    { key: "timesUsed", label: "Times Used", accessor: (r) => r.timesUsed, numeric: true },
  ];

  // Rest site bar chart
  const restChartData = restSiteStats.slice(0, 8).map((r) => ({
    choice: r.choice, count: r.count, winPct: r.winRate * 100,
  }));

  return (
    <>
      {/* Combat Stats Summary */}
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2><Clock size={24} /> Combat Efficiency</h2>
        </div>
        <div className="stat-overview four-col">
          <div className="stat-card mini">
            <h4><Swords size={14} /> Avg Turns (Monster)</h4>
            <div className="value">{combatTurns.avgTurnsMonster.toFixed(1)}</div>
          </div>
          <div className="stat-card mini">
            <h4><Swords size={14} /> Avg Turns (Elite)</h4>
            <div className="value">{combatTurns.avgTurnsElite.toFixed(1)}</div>
          </div>
          <div className="stat-card mini">
            <h4><Swords size={14} /> Avg Turns (Boss)</h4>
            <div className="value">{combatTurns.avgTurnsBoss.toFixed(1)}</div>
          </div>
          <div className="stat-card mini">
            <h4><Clock size={14} /> Avg Overall</h4>
            <div className="value">{combatTurns.avgTurnsOverall.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Rest Site Decisions */}
      <div className="glass-panel">
        <div className="panel-header">
          <h2><Flame size={24} /> Rest Site Decisions</h2>
        </div>
        {restChartData.length > 0 && (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={restChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="choice" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-color)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <SortableTable
          columns={restColumns}
          data={restSiteStats}
          keyExtractor={(r) => r.choice}
          exportFilename="rest_site_choices.csv"
          emptyMessage="No rest site data"
        />
      </div>

      {/* Ancient/Neow Choices */}
      <div className="glass-panel">
        <div className="panel-header">
          <h2><Sparkles size={24} /> Ancient Bonus Choices</h2>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>
          Which starting bonuses do you pick and how do they perform?
        </p>
        <SortableTable
          columns={ancientColumns}
          data={ancientStats}
          keyExtractor={(r) => r.name}
          searchPlaceholder="Search bonuses..."
          searchAccessor={(r) => r.name}
          exportFilename="ancient_choices.csv"
          emptyMessage="No ancient choice data"
        />
      </div>

      {/* Card Upgrades */}
      <div className="glass-panel">
        <div className="panel-header">
          <h2><Wand2 size={24} /> Most Upgraded Cards</h2>
        </div>
        <SortableTable
          columns={upgradeColumns}
          data={upgradeStats.slice(0, 50)}
          keyExtractor={(r) => r.cardName}
          searchPlaceholder="Search cards..."
          searchAccessor={(r) => r.cardName}
          exportFilename="card_upgrades.csv"
          emptyMessage="No upgrade data"
        />
      </div>

      {/* Card Removals */}
      <div className="glass-panel">
        <div className="panel-header">
          <h2><Trash2 size={24} /> Most Removed Cards</h2>
        </div>
        <SortableTable
          columns={removalColumns}
          data={removalStats.slice(0, 50)}
          keyExtractor={(r) => r.cardName}
          searchPlaceholder="Search cards..."
          searchAccessor={(r) => r.cardName}
          exportFilename="card_removals.csv"
          emptyMessage="No removal data"
        />
      </div>

      {/* Potion Usage */}
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2><FlaskConical size={24} /> Potion Usage</h2>
        </div>
        <SortableTable
          columns={potionColumns}
          data={potionStats}
          keyExtractor={(r) => r.name}
          searchPlaceholder="Search potions..."
          searchAccessor={(r) => r.name}
          exportFilename="potion_usage.csv"
          emptyMessage="No potion data"
        />
      </div>
    </>
  );
};
