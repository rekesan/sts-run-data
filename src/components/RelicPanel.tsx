import React from "react";
import { Trophy, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { RelicStats } from "../utils/parser";
import { SortableTable } from "./SortableTable";
import type { ColumnDef } from "./SortableTable";

interface RelicPanelProps {
  powerfulRelics: RelicStats[];
  trapRelics: RelicStats[];
  overallWinrate: number;
}

const formatPercent = (val: number) => (val * 100).toFixed(1) + "%";
const formatDelta = (val: number) => {
  const pct = (val * 100).toFixed(1);
  return val >= 0 ? `+${pct}%` : `${pct}%`;
};

export const RelicPanel: React.FC<RelicPanelProps> = ({
  powerfulRelics,
  trapRelics,
  overallWinrate,
}) => {
  const powerfulColumns: ColumnDef<RelicStats>[] = [
    {
      key: "relic",
      label: "Relic Name",
      accessor: (r) => r.relic,
    },
    {
      key: "count",
      label: "Count",
      accessor: (r) => r.count,
      numeric: true,
    },
    {
      key: "winrate",
      label: "Winrate",
      accessor: (r) => r.winrate,
      numeric: true,
      render: (r) => (
        <span className="badge positive">{formatPercent(r.winrate)}</span>
      ),
    },
    {
      key: "delta",
      label: "Δ Baseline",
      accessor: (r) => r.delta,
      numeric: true,
      render: (r) => (
        <span className={`badge ${r.delta >= 0 ? "positive" : "negative"}`}>
          {formatDelta(r.delta)}
        </span>
      ),
    },
  ];

  const trapColumns: ColumnDef<RelicStats>[] = [
    {
      key: "relic",
      label: "Relic Name",
      accessor: (r) => r.relic,
    },
    {
      key: "count",
      label: "Count",
      accessor: (r) => r.count,
      numeric: true,
    },
    {
      key: "winrate",
      label: "Winrate",
      accessor: (r) => r.winrate,
      numeric: true,
      render: (r) => (
        <span className="badge negative">{formatPercent(r.winrate)}</span>
      ),
    },
    {
      key: "delta",
      label: "Δ Baseline",
      accessor: (r) => r.delta,
      numeric: true,
      render: (r) => (
        <span className="badge negative">{formatDelta(r.delta)}</span>
      ),
    },
  ];

  // Chart data: top 15 powerful relics
  const powerfulChartData = powerfulRelics.slice(0, 15).map((r) => ({
    ...r,
    winratePct: r.winrate * 100,
  }));

  // Chart data: top 15 trap relics
  const trapChartData = trapRelics.slice(0, 15).map((r) => ({
    ...r,
    winratePct: r.winrate * 100,
  }));

  return (
    <>
      {/* Powerful Relics */}
      <div className="glass-panel">
        <div className="panel-header">
          <h2>
            <Trophy size={24} /> Top Powerful Relics
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>
          Relics with winrates &gt; {formatPercent(overallWinrate)} baseline
          (showing delta from overall)
        </p>

        {powerfulChartData.length > 0 && (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={powerfulChartData}
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
                  dataKey="relic"
                  type="category"
                  width={140}
                  stroke="var(--text-secondary)"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    formatPercent((val as number) / 100),
                    "Winrate",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-color)",
                    borderRadius: "8px",
                  }}
                />
                <ReferenceLine
                  x={overallWinrate * 100}
                  stroke="var(--text-secondary)"
                  strokeDasharray="3 3"
                  label={{
                    value: "Baseline",
                    fill: "var(--text-secondary)",
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="winratePct"
                  fill="var(--accent-success)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <SortableTable
          columns={powerfulColumns}
          data={powerfulRelics}
          keyExtractor={(r) => r.relic}
          searchPlaceholder="Search relics..."
          searchAccessor={(r) => r.relic}
          exportFilename="powerful_relics.csv"
          emptyMessage="No powerful relics found with current filters"
        />
      </div>

      {/* Trap Relics */}
      <div className="glass-panel danger">
        <div className="panel-header">
          <h2 style={{ color: "var(--accent-secondary)" }}>
            <TrendingDown size={24} color="var(--accent-secondary)" /> Top Trap
            Relics
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>
          Relics with winrates &lt; {formatPercent(overallWinrate)} baseline
        </p>

        {trapChartData.length > 0 && (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trapChartData}
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
                  dataKey="relic"
                  type="category"
                  width={140}
                  stroke="var(--text-secondary)"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    formatPercent((val as number) / 100),
                    "Winrate",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-color)",
                    borderRadius: "8px",
                  }}
                />
                <ReferenceLine
                  x={overallWinrate * 100}
                  stroke="var(--text-secondary)"
                  strokeDasharray="3 3"
                  label={{
                    value: "Baseline",
                    fill: "var(--text-secondary)",
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="winratePct"
                  fill="var(--accent-secondary)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <SortableTable
          columns={trapColumns}
          data={trapRelics}
          keyExtractor={(r) => r.relic}
          searchPlaceholder="Search relics..."
          searchAccessor={(r) => r.relic}
          exportFilename="trap_relics.csv"
          emptyMessage="No trap relics found with current filters"
        />
      </div>
    </>
  );
};
