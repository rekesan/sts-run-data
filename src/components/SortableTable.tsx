import React, { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Search, Download } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  key: string;
  label: string;
  accessor: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
  numeric?: boolean;
  sortable?: boolean;
  width?: string;
}

interface SortableTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  searchPlaceholder?: string;
  searchAccessor?: (row: T) => string;
  maxHeight?: string;
  emptyMessage?: string;
  exportFilename?: string;
  expandedContent?: (row: T) => React.ReactNode;
}

type SortDirection = "asc" | "desc";

// ─── Component ──────────────────────────────────────────────────────

export function SortableTable<T>({
  columns,
  data,
  keyExtractor,
  searchPlaceholder = "Search...",
  searchAccessor,
  maxHeight = "400px",
  emptyMessage = "No data available",
  exportFilename,
  expandedContent,
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) => {
      if (searchAccessor) {
        return searchAccessor(row).toLowerCase().includes(q);
      }
      // Search all string columns
      return columns.some((col) => {
        const val = col.accessor(row);
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [data, search, searchAccessor, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = col.accessor(a);
      const bVal = col.accessor(b);
      let cmp: number;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir, columns]);

  const handleExport = () => {
    if (!exportFilename) return;
    const headers = columns.map((c) => c.label).join(",");
    const rows = sortedData.map((row) =>
      columns
        .map((c) => {
          const val = c.accessor(row);
          // Escape commas and quotes in CSV
          const str = String(val);
          return str.includes(",") || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(","),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sortable-table-wrapper">
      <div className="table-controls">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-controls-right">
          <span className="result-count">
            {filteredData.length} result{filteredData.length !== 1 ? "s" : ""}
          </span>
          {exportFilename && (
            <button className="export-btn" onClick={handleExport} title="Export CSV">
              <Download size={14} />
              CSV
            </button>
          )}
        </div>
      </div>

      <div
        className="data-table-container custom-scrollbar"
        style={{ maxHeight }}
      >
        <table className="data-table">
          <thead>
            <tr>
              {expandedContent && <th style={{ width: "32px" }}></th>}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.numeric ? "number" : ""} ${col.sortable !== false ? "sortable" : ""}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() =>
                    col.sortable !== false && handleSort(col.key)
                  }
                >
                  <span className="th-content">
                    {col.label}
                    {col.sortable !== false && sortKey === col.key && (
                      <span className="sort-indicator">
                        {sortDir === "asc" ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (expandedContent ? 1 : 0)}
                  style={{ textAlign: "center" }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => {
                const key = keyExtractor(row);
                const isExpanded = expandedRows.has(key);
                return (
                  <React.Fragment key={key}>
                    <tr
                      className={expandedContent ? "expandable-row" : ""}
                      onClick={() => expandedContent && toggleExpand(key)}
                    >
                      {expandedContent && (
                        <td className="expand-cell">
                          <span
                            className={`expand-icon ${isExpanded ? "expanded" : ""}`}
                          >
                            <ChevronDown size={14} />
                          </span>
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={col.numeric ? "number" : ""}
                        >
                          {col.render ? col.render(row) : col.accessor(row)}
                        </td>
                      ))}
                    </tr>
                    {expandedContent && isExpanded && (
                      <tr className="expanded-row">
                        <td colSpan={columns.length + 1}>
                          <div className="expanded-content">
                            {expandedContent(row)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
