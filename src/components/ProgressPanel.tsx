import React from "react";
import { TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from "recharts";
import type { WinRatePoint } from "../utils/statsEngine";

interface ProgressPanelProps {
  winRateData: WinRatePoint[];
  overallWinrate: number;
}

const formatPercent = (val: number) => (val * 100).toFixed(1) + "%";

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  winRateData,
  overallWinrate,
}) => {
  if (winRateData.length === 0) {
    return (
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2><TrendingUp size={24} /> Progress Over Time</h2>
        </div>
        <div className="empty-state">
          <TrendingUp size={48} />
          <h3>Not enough data</h3>
          <p>Need at least a few runs to show progress.</p>
        </div>
      </div>
    );
  }

  // Individual run markers (dots colored by win/loss)
  const chartData = winRateData.map((p) => ({
    ...p,
    rollingPct: p.rollingWinrate * 100,
    winMark: p.win ? p.rollingWinrate * 100 : undefined,
    lossMark: !p.win ? p.rollingWinrate * 100 : undefined,
  }));

  return (
    <div className="glass-panel full-width">
      <div className="panel-header">
        <h2><TrendingUp size={24} /> Win Rate Over Time</h2>
      </div>
      <p style={{ color: "var(--text-secondary)" }}>
        Rolling 10-run window. Green dots = wins, red dots = losses. Dashed line = overall average ({formatPercent(overallWinrate)}).
      </p>

      <div className="chart-container" style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis
              dataKey="runIndex"
              stroke="var(--text-secondary)"
              label={{ value: "Run #", position: "insideBottom", offset: -5, fill: "var(--text-secondary)" }}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => v + "%"}
              stroke="var(--text-secondary)"
              label={{ value: "Win Rate", angle: -90, position: "insideLeft", style: { textAnchor: "middle" }, fill: "var(--text-secondary)" }}
            />
            <ReferenceLine
              y={overallWinrate * 100}
              stroke="var(--accent-primary)"
              strokeDasharray="5 5"
              strokeOpacity={0.6}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border-color)",
                borderRadius: "8px",
              }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as typeof chartData[0];
                  return (
                    <div className="chart-tooltip">
                      <strong className="tooltip-title">Run #{d.runIndex}</strong>
                      <p>{d.character} — {d.win ? "Win ✓" : "Loss ✗"}</p>
                      <p>Rolling WR: {formatPercent(d.rollingWinrate)}</p>
                      <p>{d.date}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="rollingPct"
              stroke="var(--accent-tertiary)"
              strokeWidth={2}
              dot={({ cx, cy, payload }) => {
                const d = payload as typeof chartData[0];
                return (
                  <circle
                    key={d.runIndex}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={d.win ? "var(--accent-success)" : "var(--accent-secondary)"}
                    stroke="var(--bg-primary)"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 6, stroke: "var(--accent-primary)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
