"use client";

import React, { useEffect, useState } from "react";

interface YearlyHeatmapProps {
  liveCompletions?: Set<string>;
  liveTotalHabits?: number;
  currentMonthKey?: string;
}

interface CompletionData {
  date_str: string;
  count: number;
  total: number;
}

export default function YearlyHeatmap({ liveCompletions = new Set(), liveTotalHabits = 0, currentMonthKey = "" }: YearlyHeatmapProps) {
  const [stats, setStats] = useState<Record<string, { count: number; total: number }>>({});
  const [totalsByMonth, setTotalsByMonth] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const year = new Date().getFullYear();

  useEffect(() => {
    fetch(`/api/stats/yearly?year=${year}`)
      .then((res) => res.json())
      .then((data: { completions: CompletionData[]; totalsByMonth: Record<string, number> }) => {
        const map: Record<string, { count: number; total: number }> = {};
        if (data && Array.isArray(data.completions)) {
          data.completions.forEach((d) => {
            map[d.date_str] = { count: d.count, total: d.total };
          });
        }
        setStats(map);
        if (data && data.totalsByMonth) {
          setTotalsByMonth(data.totalsByMonth);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  // Generate all days in the year
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const days: { date: Date; dateStr: string; monthKey: string }[] = [];
  let current = new Date(startDate);
  
  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    days.push({
      date: new Date(current),
      dateStr: `${y}-${m}-${d}`,
      monthKey: `${y}-${m}`
    });
    current.setDate(current.getDate() + 1);
  }

  // Calculate leading empty days (if Jan 1 is not Sunday)
  const firstDayOfWeek = startDate.getDay(); // 0 = Sunday
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const getIntensity = (count: number, total: number) => {
    if (count === 0 || total === 0) return 0;
    const ratio = count / total;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  return (
    <div className="heatmap-container">
      {loading ? (
        <div className="heatmap-loading">Loading stats...</div>
      ) : (
        <div className="heatmap-layout">
          <div className="heatmap-grid">
            {emptyDays.map((i) => (
              <div key={`empty-${i}`} className="heatmap-cell empty" />
            ))}
          
          {days.map(({ dateStr, monthKey }) => {
            // Override with live data if it's the current active month on the dashboard
            let count = 0;
            let total = 0;

            if (monthKey === currentMonthKey) {
              // Count how many keys in the live Set end with this dateStr
              let liveCount = 0;
              liveCompletions.forEach((key) => {
                if (key.endsWith(dateStr)) liveCount++;
              });
              count = liveCount;
              total = liveTotalHabits;
            } else {
              count = stats[dateStr]?.count || 0;
              total = stats[dateStr]?.total || totalsByMonth[monthKey] || 1; 
            }

            const intensity = getIntensity(count, total);
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            
            return (
              <div
                key={dateStr}
                className={`heatmap-cell intensity-${intensity}`}
                title={`${dateStr}: ${count}/${total} habits (${percent}%)`}
              />
            );
          })}
          </div>
          
          {/* Sparkline */}
          <div className="sparkline-container" title="Last 7 Days Momentum">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const sy = d.getFullYear();
              const sm = String(d.getMonth() + 1).padStart(2, '0');
              const sd = String(d.getDate()).padStart(2, '0');
              const sDateStr = `${sy}-${sm}-${sd}`;
              
              let sCount = 0;
              let sTotal = 0;
              if (`${sy}-${sm}` === currentMonthKey) {
                let liveCount = 0;
                liveCompletions.forEach((key) => {
                  if (key.endsWith(sDateStr)) liveCount++;
                });
                sCount = liveCount;
                sTotal = liveTotalHabits;
              } else {
                sCount = stats[sDateStr]?.count || 0;
                sTotal = stats[sDateStr]?.total || totalsByMonth[`${sy}-${sm}`] || 1;
              }
              
              const pct = sTotal > 0 ? (sCount / sTotal) * 100 : 0;
              return (
                <div
                  key={`spark-${i}`}
                  className={`sparkline-bar ${sCount === 0 ? 'empty' : ''}`}
                  style={{ height: `${Math.max(15, pct)}%` }}
                  title={`${sDateStr}: ${sCount}/${sTotal}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
