import React from "react";
import { Skull, ShieldAlert, MapPin } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import type { ComputedDeathStats } from "../utils/statsEngine";
import { SortableTable } from "./SortableTable";
import type { ColumnDef } from "./SortableTable";

interface DeathPanelProps {
  deathStats: ComputedDeathStats;
}

const COLORS = ["#cc3333", "#e05555", "#ff8c42", "#f0c330", "#4db8ff", "#33cc66"];


export const DeathPanel: React.FC<DeathPanelProps> = ({ deathStats }) => {
  if (!deathStats.hasDeathData && deathStats.totalDeaths === 0) {
    return (
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2><Skull size={24} /> Death Analysis</h2>
        </div>
        <div className="empty-state">
          <Skull size={48} />
          <h3>No Death Data</h3>
          <p>Either all your runs are wins or data isn't available.</p>
        </div>
      </div>
    );
  }

  const killColumns: ColumnDef<(typeof deathStats.killedBy)[0]>[] = [
    { key: "encounter", label: "Encounter", accessor: (r) => r.encounter },
    {
      key: "type", label: "Type", accessor: (r) => r.encounterType,
      render: (r) => (
        <span className={`badge ${r.encounterType === "elite" ? "neutral" : r.encounterType === "boss" ? "negative" : ""}`}>
          {r.encounterType}
        </span>
      ),
    },
    { key: "count", label: "Deaths", accessor: (r) => r.count, numeric: true },
  ];

  // Piechart data for death type breakdown
  const pieData = deathStats.deathsByType.map((d) => ({
    name: d.type.charAt(0).toUpperCase() + d.type.slice(1),
    value: d.count,
  }));

  // Act death bar chart
  const actChartData = deathStats.deathsByAct.map((d) => ({
    ...d,
    fill: d.act.includes("Hive") ? "#cc3333" : d.act.includes("Glory") ? "#f0c330" : "#4db8ff",
  }));

  // Floor range bar chart
  const floorChartData = deathStats.deathsByFloorRange;

  return (
    <>
      {/* Killed By Table */}
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2 style={{ color: "var(--accent-secondary)" }}>
            <Skull size={24} color="var(--accent-secondary)" /> What's Killing You
          </h2>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>
          {deathStats.totalDeaths} total deaths (excluding abandoned runs)
        </p>

        <div className="death-grid">
          {/* Pie chart: death by type */}
          <div className="death-chart-cell">
            <h4>Deaths by Encounter Type</h4>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-color)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar chart: deaths by act */}
          {actChartData.length > 0 && (
            <div className="death-chart-cell">
              <h4><MapPin size={14} /> Deaths by Act</h4>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={actChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <XAxis dataKey="act" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--text-secondary)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border-color)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Floor range chart */}
        {floorChartData.length > 0 && (
          <div>
            <h4 style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              <ShieldAlert size={14} /> Deaths by Floor Range
            </h4>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={floorChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <XAxis dataKey="range" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-color)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="var(--accent-tertiary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <SortableTable
          columns={killColumns}
          data={deathStats.killedBy}
          keyExtractor={(r) => r.encounter}
          searchPlaceholder="Search encounters..."
          searchAccessor={(r) => r.encounter}
          exportFilename="death_analysis.csv"
          emptyMessage="No death data"
        />
      </div>
    </>
  );
};
