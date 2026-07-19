"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface YearlyStat {
  date_str: string;
  count: string;
}

export default function YearlyHeatmap() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const year = new Date().getFullYear();

  useEffect(() => {
    fetch(`/api/stats/yearly?year=${year}`)
      .then((res) => res.json())
      .then((data: YearlyStat[]) => {
        const map: Record<string, number> = {};
        if (Array.isArray(data)) {
          data.forEach((d) => {
            map[d.date_str] = parseInt(d.count, 10);
          });
        }
        setStats(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  // Generate all days in the year
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const days: { date: Date; dateStr: string }[] = [];
  let current = new Date(startDate);
  
  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    days.push({
      date: new Date(current),
      dateStr: `${y}-${m}-${d}`,
    });
    current.setDate(current.getDate() + 1);
  }

  // Calculate leading empty days (if Jan 1 is not Sunday)
  const firstDayOfWeek = startDate.getDay(); // 0 = Sunday
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  // Determine intensity based on max completions
  const maxCompletions = Object.values(stats).reduce((a, b) => Math.max(a, b), 1);

  const getIntensity = (count: number) => {
    if (count === 0) return 0;
    const ratio = count / maxCompletions;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  return (
    <div className="heatmap-container">
      <h3 className="heatmap-title">{year} Consistency</h3>
      
      {loading ? (
        <div className="heatmap-loading">Loading stats...</div>
      ) : (
        <div className="heatmap-scroll-wrapper">
          <div className="heatmap-grid">
            {emptyDays.map((i) => (
              <div key={`empty-${i}`} className="heatmap-cell empty" />
            ))}
            
            {days.map(({ dateStr }) => {
              const count = stats[dateStr] || 0;
              const intensity = getIntensity(count);
              
              return (
                <div
                  key={dateStr}
                  className={`heatmap-cell intensity-${intensity}`}
                  title={`${dateStr}: ${count} habits completed`}
                />
              );
            })}
          </div>
          
          <div className="heatmap-legend">
            <span>Less</span>
            <div className="heatmap-cell intensity-0" />
            <div className="heatmap-cell intensity-1" />
            <div className="heatmap-cell intensity-2" />
            <div className="heatmap-cell intensity-3" />
            <div className="heatmap-cell intensity-4" />
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  );
}
