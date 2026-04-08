import React, { useState } from 'react';
import type { AnalysisResult } from '../utils/parser';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Trophy, TrendingDown, Layers, Activity } from 'lucide-react';

interface DashboardProps {
  data: AnalysisResult;
  onReset: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const [activeTab, setActiveTab] = useState<'relics' | 'cards'>('relics');

  const formatPercent = (val: number) => (val * 100).toFixed(1) + '%';
  const overallWinrateStr = formatPercent(data.overallWinrate);

  return (
    <div className="dashboard-grid">
      <div className="glass-panel full-width">
        <div className="panel-header">
          <h2><Activity size={24} /> Overview</h2>
          <button className="reset-btn" onClick={onReset}>New Analysis</button>
        </div>
        <div className="stat-overview">
          <div className="stat-card">
            <h4>Overall Winrate</h4>
            <div className="value">{overallWinrateStr}</div>
          </div>
          <div className="stat-card">
            <h4>Relics Tracked</h4>
            <div className="value">{data.relicStats.length}</div>
          </div>
          <div className="stat-card">
            <h4>Cards Tracked</h4>
            <div className="value">{data.cardStats.length}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel full-width" style={{ paddingBottom: 0, borderBottom: 'none', background: 'transparent', boxShadow: 'none' }}>
        <div className="tabs">
          <div className={`tab ${activeTab === 'relics' ? 'active' : ''}`} onClick={() => setActiveTab('relics')}>Relic Analysis</div>
          <div className={`tab ${activeTab === 'cards' ? 'active' : ''}`} onClick={() => setActiveTab('cards')}>Card Analysis</div>
        </div>
      </div>

      {activeTab === 'relics' && (
        <>
          <div className="glass-panel">
            <div className="panel-header">
              <h2><Trophy size={24} /> Top Powerful Relics</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Relics with winrates &gt; {overallWinrateStr} (min 5 runs)</p>
            <div className="data-table-container custom-scrollbar">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Relic Name</th>
                    <th className="number">Count</th>
                    <th className="number">Winrate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.powerfulRelics.slice(0, 50).map(r => (
                    <tr key={r.relic}>
                      <td>{r.relic}</td>
                      <td className="number">{r.count}</td>
                      <td className="number">
                        <span className="badge positive">{formatPercent(r.winrate)}</span>
                      </td>
                    </tr>
                  ))}
                  {data.powerfulRelics.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign: 'center' }}>No data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel danger">
            <div className="panel-header">
              <h2 style={{ color: 'var(--accent-secondary)' }}><TrendingDown size={24} color="var(--accent-secondary)" /> Top Trap Relics</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Relics with winrates &lt; {overallWinrateStr} (min 5 runs)</p>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trapRelics.slice(0, 15)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 1]} tickFormatter={(val) => (val * 100).toFixed(0) + '%'} stroke="var(--text-secondary)" />
                  <YAxis dataKey="relic" type="category" width={100} stroke="var(--text-secondary)" />
                  <Tooltip 
                    formatter={(val: unknown) => [formatPercent(val as number), 'Winrate']} 
                    contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="winrate" fill="var(--accent-secondary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {activeTab === 'cards' && (
        <>
          <div className="glass-panel full-width">
            <div className="panel-header">
              <h2><Layers size={24} /> Card Pick Rate vs Win Rate</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Shows cards offered at least 5 times and picked at least once.</p>
            <div className="chart-container" style={{ height: 500 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <XAxis type="number" dataKey="pickRate" name="Pick Rate" domain={[0, 1]} tickFormatter={formatPercent} stroke="var(--text-secondary)" />
                  <YAxis type="number" dataKey="winRateWhenPicked" name="Win Rate" domain={[0, 1]} tickFormatter={formatPercent} stroke="var(--text-secondary)" />
                  <ZAxis type="number" dataKey="timesPicked" range={[50, 400]} name="Times Picked" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    formatter={(value: unknown, name: unknown) => {
                      if (name === 'Pick Rate' || name === 'Win Rate') return formatPercent(Number(value));
                      return Number(value);
                    }}
                    labelFormatter={() => ''}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const dat = payload[0].payload;
                        return (
                          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '5px' }}>{dat.cardName}</strong>
                            <p style={{ margin: 0 }}>Offers: {dat.timesOffered} | Picks: {dat.timesPicked}</p>
                            <p style={{ margin: 0 }}>Pick Rate: {formatPercent(dat.pickRate)}</p>
                            <p style={{ margin: 0 }}>Win Rate: {formatPercent(dat.winRateWhenPicked)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Cards" data={data.cardStats.filter(c => c.timesPicked > 0)} fill="var(--accent-tertiary)" opacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="glass-panel">
            <div className="panel-header">
              <h2>Most Picked Cards</h2>
            </div>
            <div className="data-table-container custom-scrollbar">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Card Name</th>
                    <th className="number">Picks/Offers</th>
                    <th className="number">Pick Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cardStats.slice(0, 15).map(c => (
                    <tr key={c.cardName}>
                      <td>{c.cardName}</td>
                      <td className="number">{c.timesPicked} / {c.timesOffered}</td>
                      <td className="number">
                        <span className="badge positive">{formatPercent(c.pickRate)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel">
            <div className="panel-header">
              <h2>Least Picked Cards</h2>
            </div>
            <div className="data-table-container custom-scrollbar">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Card Name</th>
                    <th className="number">Picks/Offers</th>
                    <th className="number">Pick Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.cardStats].sort((a,b) => a.pickRate - b.pickRate).slice(0, 15).map(c => (
                    <tr key={c.cardName}>
                      <td>{c.cardName}</td>
                      <td className="number">{c.timesPicked} / {c.timesOffered}</td>
                      <td className="number">
                        <span className="badge negative">{formatPercent(c.pickRate)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
