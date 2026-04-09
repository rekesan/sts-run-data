import React from "react";
import { Skull } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { BossStats, BossCharacterStats } from "../utils/statsEngine";
import { SortableTable } from "./SortableTable";
import type { ColumnDef } from "./SortableTable";

interface BossPanelProps {
  bossStats: BossStats[];
  bossCharacterStats: BossCharacterStats[];
  hasBossData: boolean;
}

const formatPercent = (val: number) => (val * 100).toFixed(1) + "%";

export const BossPanel: React.FC<BossPanelProps> = ({
  bossStats,
  bossCharacterStats,
  hasBossData,
}) => {
  if (!hasBossData) {
    return (
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2>
            <Skull size={24} /> Boss Analysis
          </h2>
        </div>
        <div className="empty-state">
          <Skull size={48} />
          <h3>No Boss Data Available</h3>
          <p>
            Boss encounter data was not found in your run files. This feature
            requires STS2 run files that include boss fight information.
          </p>
        </div>
      </div>
    );
  }

  const bossColumns: ColumnDef<BossStats>[] = [
    {
      key: "name",
      label: "Boss",
      accessor: (b) => b.name,
    },
    {
      key: "encountered",
      label: "Encountered",
      accessor: (b) => b.encountered,
      numeric: true,
    },
    {
      key: "defeated",
      label: "Defeated",
      accessor: (b) => b.defeated,
      numeric: true,
    },
    {
      key: "winrate",
      label: "Win Rate",
      accessor: (b) => b.winrate,
      numeric: true,
      render: (b) => {
        const level =
          b.winrate >= 0.7
            ? "positive"
            : b.winrate >= 0.4
              ? "neutral"
              : "negative";
        return <span className={`badge ${level}`}>{formatPercent(b.winrate)}</span>;
      },
    },
  ];

  const bossCharColumns: ColumnDef<BossCharacterStats>[] = [
    {
      key: "bossName",
      label: "Boss",
      accessor: (b) => b.bossName,
    },
    {
      key: "character",
      label: "Character",
      accessor: (b) => b.character,
    },
    {
      key: "encountered",
      label: "Encountered",
      accessor: (b) => b.encountered,
      numeric: true,
    },
    {
      key: "winrate",
      label: "Win Rate",
      accessor: (b) => b.winrate,
      numeric: true,
      render: (b) => {
        const level =
          b.winrate >= 0.7
            ? "positive"
            : b.winrate >= 0.4
              ? "neutral"
              : "negative";
        return <span className={`badge ${level}`}>{formatPercent(b.winrate)}</span>;
      },
    },
  ];

  // Chart data for boss difficulty (sorted worst to best)
  const chartData = [...bossStats]
    .sort((a, b) => a.winrate - b.winrate)
    .slice(0, 15)
    .map((b) => ({
      ...b,
      winratePct: b.winrate * 100,
    }));

  return (
    <>
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2>
            <Skull size={24} /> Boss Difficulty Ranking
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>
          Bosses ranked by defeat rate — lowest win rate = hardest boss
        </p>

        {chartData.length > 0 && (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(val) => val + "%"}
                  stroke="var(--text-secondary)"
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={140}
                  stroke="var(--text-secondary)"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    formatPercent((val as number) / 100),
                    "Defeat Rate",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-color)",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="winratePct"
                  fill="var(--accent-tertiary)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <SortableTable
          columns={bossColumns}
          data={bossStats}
          keyExtractor={(b) => b.name}
          searchPlaceholder="Search bosses..."
          searchAccessor={(b) => b.name}
          exportFilename="boss_stats.csv"
          emptyMessage="No bosses found with enough encounters"
        />
      </div>

      {bossCharacterStats.length > 0 && (
        <div className="glass-panel full-width">
          <div className="panel-header">
            <h2>Boss × Character Matchups</h2>
          </div>
          <p style={{ color: "var(--text-secondary)" }}>
            How each character performs against each boss
          </p>
          <SortableTable
            columns={bossCharColumns}
            data={bossCharacterStats}
            keyExtractor={(b) => `${b.bossName}-${b.character}`}
            searchPlaceholder="Search..."
            searchAccessor={(b) => `${b.bossName} ${b.character}`}
            exportFilename="boss_character_matchups.csv"
          />
        </div>
      )}
    </>
  );
};
