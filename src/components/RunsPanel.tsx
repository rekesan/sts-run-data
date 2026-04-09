import React from "react";
import { History, Clock, Award, Swords } from "lucide-react";
import type { RunData } from "../utils/parser";
import { SortableTable } from "./SortableTable";
import type { ColumnDef } from "./SortableTable";

interface RunsPanelProps {
  runs: RunData[];
}

export const RunsPanel: React.FC<RunsPanelProps> = ({ runs }) => {
  // Compute summary stats
  const avgRunTime =
    runs.length > 0
      ? runs.reduce((sum, r) => sum + r.runTime, 0) / runs.length
      : 0;

  const wins = runs.filter((r) => r.win);
  const losses = runs.filter((r) => !r.win);

  const avgFloorWins =
    wins.length > 0
      ? wins.reduce((sum, r) => sum + r.maxFloorReached, 0) / wins.length
      : 0;
  const avgFloorLosses =
    losses.length > 0
      ? losses.reduce((sum, r) => sum + r.maxFloorReached, 0) / losses.length
      : 0;

  const columns: ColumnDef<RunData>[] = [
    {
      key: "filename",
      label: "Run",
      accessor: (r) => r.filename,
      render: (r) => (
        <span className="run-filename" title={r.filename}>
          {r.filename.length > 20
            ? r.filename.substring(0, 20) + "…"
            : r.filename}
        </span>
      ),
      width: "150px",
    },
    {
      key: "character",
      label: "Character",
      accessor: (r) => r.character,
    },
    {
      key: "ascension",
      label: "Asc",
      accessor: (r) => r.ascension ?? -1,
      numeric: true,
      render: (r) => (r.ascension !== null ? `A${r.ascension}` : "—"),
      width: "60px",
    },
    {
      key: "win",
      label: "Result",
      accessor: (r) => (r.win ? 1 : 0),
      render: (r) => (
        <span className={`badge ${r.win ? "positive" : "negative"}`}>
          {r.win ? "Win" : "Loss"}
        </span>
      ),
      width: "70px",
    },
    {
      key: "maxFloor",
      label: "Floor",
      accessor: (r) => r.maxFloorReached,
      numeric: true,
      render: (r) => (r.maxFloorReached > 0 ? String(r.maxFloorReached) : "—"),
      width: "70px",
    },
    {
      key: "deckSize",
      label: "Deck",
      accessor: (r) => r.deckSize,
      numeric: true,
      render: (r) => (r.deckSize > 0 ? String(r.deckSize) : "—"),
      width: "60px",
    },
    {
      key: "runTime",
      label: "Time",
      accessor: (r) => r.runTime,
      numeric: true,
      render: (r) => `${r.runTime.toFixed(1)}m`,
      width: "70px",
    },
    {
      key: "relicCount",
      label: "Relics",
      accessor: (r) => r.relics.length,
      numeric: true,
      width: "70px",
    },
  ];

  const expandedContent = (run: RunData) => (
    <div className="run-expanded">
      <div className="run-detail-section">
        <h4>
          <Award size={14} /> Relics ({run.relics.length})
        </h4>
        <div className="tag-list">
          {run.relics.map((relic) => (
            <span key={relic} className="tag relic-tag">
              {relic}
            </span>
          ))}
          {run.relics.length === 0 && (
            <span className="text-muted">No relic data</span>
          )}
        </div>
      </div>
      {run.finalDeck.length > 0 && (
        <div className="run-detail-section">
          <h4>
            <Swords size={14} /> Final Deck ({run.finalDeck.length})
          </h4>
          <div className="tag-list">
            {run.finalDeck.map((card, i) => (
              <span key={`${card}-${i}`} className="tag card-tag">
                {card}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="glass-panel full-width">
      <div className="panel-header">
        <h2>
          <History size={24} /> Run History
        </h2>
      </div>

      <div className="stat-overview four-col">
        <div className="stat-card mini">
          <h4>Total Runs</h4>
          <div className="value">{runs.length}</div>
        </div>
        <div className="stat-card mini">
          <h4>
            <Clock size={14} /> Avg Time
          </h4>
          <div className="value">{avgRunTime.toFixed(1)}m</div>
        </div>
        <div className="stat-card mini">
          <h4>Avg Floor (Wins)</h4>
          <div className="value">{avgFloorWins > 0 ? avgFloorWins.toFixed(1) : "—"}</div>
        </div>
        <div className="stat-card mini">
          <h4>Avg Floor (Losses)</h4>
          <div className="value">{avgFloorLosses > 0 ? avgFloorLosses.toFixed(1) : "—"}</div>
        </div>
      </div>

      <SortableTable
        columns={columns}
        data={runs}
        keyExtractor={(r) => r.filename}
        searchPlaceholder="Search runs..."
        searchAccessor={(r) =>
          `${r.filename} ${r.character} ${r.win ? "win" : "loss"}`
        }
        maxHeight="600px"
        exportFilename="run_history.csv"
        expandedContent={expandedContent}
      />
    </div>
  );
};
