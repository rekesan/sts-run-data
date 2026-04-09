import React from "react";
import { Layers } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Label,
  ReferenceLine,
} from "recharts";
import type { CardStats } from "../utils/parser";
import { SortableTable } from "./SortableTable";
import type { ColumnDef } from "./SortableTable";

interface CardPanelProps {
  cardStats: CardStats[];
  overallWinrate: number;
}

const formatPercent = (val: number) => (val * 100).toFixed(1) + "%";

// Custom dot renderer to label outliers on the scatter plot
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderCustomDot = (
  props: any,
  outlierNames: Set<string>,
) => {
  const { cx, cy, payload } = props as {
    cx: number;
    cy: number;
    payload: CardStats;
  };
  const isOutlier = outlierNames.has(payload.cardName);

  return (
    <g key={payload.cardName}>
      <circle
        cx={cx}
        cy={cy}
        r={isOutlier ? 6 : 4}
        fill={isOutlier ? "var(--accent-primary)" : "var(--accent-tertiary)"}
        opacity={isOutlier ? 0.95 : 0.6}
        stroke={isOutlier ? "var(--accent-primary)" : "none"}
        strokeWidth={isOutlier ? 2 : 0}
      />
      {isOutlier && (
        <text
          x={cx + 8}
          y={cy - 8}
          fill="var(--text-primary)"
          fontSize={11}
          fontWeight={600}
        >
          {payload.cardName}
        </text>
      )}
    </g>
  );
};

export const CardPanel: React.FC<CardPanelProps> = ({
  cardStats,
  overallWinrate,
}) => {
  const scatterData = cardStats.filter((c) => c.timesPicked > 0);

  // Find outlier card names: top 5 by pick rate, top 5 by win rate
  const outlierNames = new Set<string>();
  [...scatterData]
    .sort((a, b) => b.pickRate - a.pickRate)
    .slice(0, 5)
    .forEach((c) => outlierNames.add(c.cardName));
  [...scatterData]
    .sort((a, b) => b.winRateWhenPicked - a.winRateWhenPicked)
    .slice(0, 5)
    .forEach((c) => outlierNames.add(c.cardName));
  // Also add worst 3 by win rate for interest
  [...scatterData]
    .sort((a, b) => a.winRateWhenPicked - b.winRateWhenPicked)
    .slice(0, 3)
    .forEach((c) => outlierNames.add(c.cardName));

  const mostPickedColumns: ColumnDef<CardStats>[] = [
    {
      key: "cardName",
      label: "Card Name",
      accessor: (c) => c.cardName,
    },
    {
      key: "ratio",
      label: "Picks / Offers",
      accessor: (c) => c.timesPicked,
      numeric: true,
      render: (c) => `${c.timesPicked} / ${c.timesOffered}`,
    },
    {
      key: "pickRate",
      label: "Pick Rate",
      accessor: (c) => c.pickRate,
      numeric: true,
      render: (c) => (
        <span className="badge positive">{formatPercent(c.pickRate)}</span>
      ),
    },
    {
      key: "winRate",
      label: "Win Rate",
      accessor: (c) => c.winRateWhenPicked,
      numeric: true,
      render: (c) =>
        c.timesPicked > 0 ? (
          <span
            className={`badge ${c.winRateWhenPicked >= overallWinrate ? "positive" : "negative"}`}
          >
            {formatPercent(c.winRateWhenPicked)}
          </span>
        ) : (
          <span className="badge">—</span>
        ),
    },
  ];

  const leastPickedData = [...cardStats].sort(
    (a, b) => a.pickRate - b.pickRate,
  );

  const leastPickedColumns: ColumnDef<CardStats>[] = [
    {
      key: "cardName",
      label: "Card Name",
      accessor: (c) => c.cardName,
    },
    {
      key: "ratio",
      label: "Picks / Offers",
      accessor: (c) => c.timesPicked,
      numeric: true,
      render: (c) => `${c.timesPicked} / ${c.timesOffered}`,
    },
    {
      key: "pickRate",
      label: "Pick Rate",
      accessor: (c) => c.pickRate,
      numeric: true,
      render: (c) => (
        <span className="badge negative">{formatPercent(c.pickRate)}</span>
      ),
    },
    {
      key: "winRate",
      label: "Win Rate",
      accessor: (c) => c.winRateWhenPicked,
      numeric: true,
      render: (c) =>
        c.timesPicked > 0 ? (
          <span
            className={`badge ${c.winRateWhenPicked >= overallWinrate ? "positive" : "negative"}`}
          >
            {formatPercent(c.winRateWhenPicked)}
          </span>
        ) : (
          <span className="badge">—</span>
        ),
    },
  ];

  return (
    <>
      {/* Scatter Plot */}
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2>
            <Layers size={24} /> Card Pick Rate vs Win Rate
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>
          Cards offered ≥ min count and picked at least once. Outliers are
          labeled.
        </p>
        <div className="chart-container" style={{ height: 500 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 30, left: 30 }}
            >
              <XAxis
                type="number"
                dataKey="pickRate"
                name="Pick Rate"
                domain={[0, 1]}
                tickFormatter={formatPercent}
                stroke="var(--text-secondary)"
              >
                <Label
                  value="Pick Rate"
                  offset={-15}
                  position="insideBottom"
                  fill="var(--text-secondary)"
                />
              </XAxis>
              <YAxis
                type="number"
                dataKey="winRateWhenPicked"
                name="Win Rate"
                domain={[0, 1]}
                tickFormatter={formatPercent}
                stroke="var(--text-secondary)"
              >
                <Label
                  value="Win Rate When Picked"
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: "middle" }}
                  fill="var(--text-secondary)"
                />
              </YAxis>
              <ZAxis
                type="number"
                dataKey="timesPicked"
                range={[40, 400]}
                name="Times Picked"
              />
              <ReferenceLine
                y={overallWinrate}
                stroke="var(--accent-primary)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dat = payload[0].payload as CardStats;
                    return (
                      <div className="chart-tooltip">
                        <strong className="tooltip-title">
                          {dat.cardName}
                        </strong>
                        <p>
                          Offers: {dat.timesOffered} | Picks: {dat.timesPicked}
                        </p>
                        <p>Pick Rate: {formatPercent(dat.pickRate)}</p>
                        <p>
                          Win Rate: {formatPercent(dat.winRateWhenPicked)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                name="Cards"
                data={scatterData}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) =>
                  renderCustomDot(props, outlierNames)
                }
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most Picked */}
      <div className="glass-panel">
        <div className="panel-header">
          <h2>Most Picked Cards</h2>
        </div>
        <SortableTable
          columns={mostPickedColumns}
          data={cardStats}
          keyExtractor={(c) => c.cardName}
          searchPlaceholder="Search cards..."
          searchAccessor={(c) => c.cardName}
          exportFilename="most_picked_cards.csv"
        />
      </div>

      {/* Least Picked */}
      <div className="glass-panel">
        <div className="panel-header">
          <h2>Least Picked Cards</h2>
        </div>
        <SortableTable
          columns={leastPickedColumns}
          data={leastPickedData}
          keyExtractor={(c) => c.cardName}
          searchPlaceholder="Search cards..."
          searchAccessor={(c) => c.cardName}
          exportFilename="least_picked_cards.csv"
        />
      </div>
    </>
  );
};
