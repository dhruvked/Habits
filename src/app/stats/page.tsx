"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface CompletionData {
  date_str: string;
  count: number;
  total: number;
}

export default function AnalyticsDashboard() {
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

  // Generate Year Days
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

  // Monthly Score Logic
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const passedDaysThisMonth = now.getDate();
  const totalHabitsThisMonth = totalsByMonth[currentMonthKey] || 0;
  
  let currentMonthCompletions = 0;
  Object.entries(stats).forEach(([dateStr, data]) => {
    if (dateStr.startsWith(currentMonthKey)) {
      currentMonthCompletions += data.count;
    }
  });

  const totalPossibleThisMonth = totalHabitsThisMonth * passedDaysThisMonth;
  const monthlyScore = totalPossibleThisMonth > 0 ? Math.round((currentMonthCompletions / totalPossibleThisMonth) * 100) : 0;

  // 7-Day Sparkline Logic
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const sy = d.getFullYear();
    const sm = String(d.getMonth() + 1).padStart(2, '0');
    const sd = String(d.getDate()).padStart(2, '0');
    const sDateStr = `${sy}-${sm}-${sd}`;
    
    const sCount = stats[sDateStr]?.count || 0;
    const sTotal = stats[sDateStr]?.total || totalsByMonth[`${sy}-${sm}`] || 1;
    return sTotal > 0 ? (sCount / sTotal) * 100 : 0;
  });

  // SVG Line Chart calculations
  const sparkWidth = 300;
  const sparkHeight = 100;
  const stepX = sparkWidth / (last7Days.length - 1);
  
  const points = last7Days.map((pct, i) => {
    const x = i * stepX;
    // Map 0-100% to height (inverted because SVG y goes down)
    const y = sparkHeight - (pct / 100) * sparkHeight;
    return `${x},${y}`;
  }).join(" ");

  if (loading) {
    return <div className="loading-state">loading analytics…</div>;
  }

  return (
    <motion.div 
      className="analytics-page-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <header className="site-header">
        <div className="container">
          <div className="site-header-inner">
            <Link href="/" className="site-logo">habits.</Link>
            <Link href="/" className="back-link">← back to tracker</Link>
          </div>
        </div>
      </header>

      <main className="container analytics-content">
        <h1 className="analytics-title">{year} Overview</h1>

        <div className="analytics-top-widgets">
          
          {/* Consistency Donut Chart */}
          <div className="widget donut-widget">
            <h3 className="widget-label">Monthly Score</h3>
            <div className="svg-donut-container">
              <svg width="140" height="140" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="var(--surface-hover)"
                  strokeWidth="8"
                />
                {/* Animated Progress Ring */}
                <motion.circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="314" // 2 * PI * 50
                  strokeDashoffset="314"
                  initial={{ strokeDashoffset: 314 }}
                  animate={{ strokeDashoffset: 314 - (314 * monthlyScore) / 100 }}
                  transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="donut-text">
                <span className="donut-number">{monthlyScore}%</span>
              </div>
            </div>
          </div>

          {/* 7-Day Momentum Line Chart */}
          <div className="widget line-chart-widget">
            <h3 className="widget-label">7-Day Momentum</h3>
            <div className="svg-line-container">
              <svg width="100%" height="100%" viewBox={`-10 -10 ${sparkWidth + 20} ${sparkHeight + 20}`} preserveAspectRatio="none">
                {/* Grid line */}
                <line x1="0" y1={sparkHeight} x2={sparkWidth} y2={sparkHeight} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                
                {/* Animated Path */}
                <motion.polyline
                  points={points}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: "easeInOut", delay: 0.4 }}
                />

                {/* Dots on points */}
                {last7Days.map((pct, i) => {
                  const x = i * stepX;
                  const y = sparkHeight - (pct / 100) * sparkHeight;
                  return (
                    <motion.circle
                      key={`dot-${i}`}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="var(--surface)"
                      stroke="var(--ink)"
                      strokeWidth="2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 + (i * 0.1), type: "spring" }}
                    />
                  );
                })}
              </svg>
            </div>
          </div>

        </div>

        {/* Yearly Heatmap Grid */}
        <div className="widget heatmap-widget">
          <h3 className="widget-label">Yearly Heatmap</h3>
          <div className="heatmap-grid" style={{ marginTop: '1rem' }}>
            {emptyDays.map((i) => (
              <div key={`empty-${i}`} className="heatmap-cell empty" />
            ))}
            
            {days.map(({ dateStr, monthKey }, index) => {
              const count = stats[dateStr]?.count || 0;
              const total = stats[dateStr]?.total || totalsByMonth[monthKey] || 1;
              const intensity = getIntensity(count, total);
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
              
              return (
                <motion.div
                  key={dateStr}
                  className={`heatmap-cell intensity-${intensity}`}
                  title={`${dateStr}: ${count}/${total} habits (${percent}%)`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.001 * index }}
                />
              );
            })}
          </div>
        </div>
      </main>
    </motion.div>
  );
}
