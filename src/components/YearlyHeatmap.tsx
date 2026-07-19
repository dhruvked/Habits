"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface StatData {
  date_str: string;
  count: number;
}

export default function YearlyHeatmap() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  const year = new Date().getFullYear();

  useEffect(() => {
    fetch(`/api/stats/yearly?year=${year}`)
      .then(res => res.json())
      .then((data: StatData[]) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, number> = {};
        data.forEach(d => {
          map[d.date_str] = parseInt(d.count as any);
        });
        setStats(map);
        setLoading(false);
      });
  }, [year]);

  // Generate days
  const startDate = new Date(`${year}-01-01T12:00:00`);
  
  // Find the first Sunday on or before Jan 1
  const startDay = new Date(startDate);
  startDay.setDate(startDay.getDate() - startDay.getDay());

  const days = [];
  // 53 weeks (371 days)
  for (let i = 0; i < 371; i++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  // Get max completions for color scaling
  const maxCompletions = Math.max(1, ...Object.values(stats));

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <h2 className="heatmap-title">{year} in Review</h2>
        <span className="heatmap-subtitle">Your global consistency</span>
      </div>
      
      <div className="heatmap-scroll">
        <div className="heatmap-grid">
          {days.map((d) => {
            const ymd = toYMD(d);
            const inYear = d.getFullYear() === year;
            const count = stats[ymd] || 0;
            
            // Heatmap intensity calculation
            const ratio = count / maxCompletions;
            // Floor to 0.2 minimum opacity if > 0
            const opacity = count > 0 ? Math.max(0.2, ratio) : 1;
            
            return (
              <motion.div
                key={ymd}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: inYear ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className={`heatmap-cell ${!inYear ? "out-of-range" : ""}`}
                style={{ 
                  backgroundColor: inYear ? (count > 0 ? "var(--ink)" : "var(--border)") : "transparent",
                  opacity: inYear && count > 0 ? opacity : 1
                }}
                title={inYear ? `${ymd}: ${count} habit${count === 1 ? '' : 's'}` : undefined}
              />
            );
          })}
        </div>
        <div className="heatmap-months-labels">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
        </div>
      </div>
    </div>
  );
}
