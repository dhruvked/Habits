"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

/* ─── Types ───────────────────────────────────────────── */
interface Habit {
  id: number;
  name: string;
  position: number;
  description?: string;
  goal_value?: number;
}

interface Completion {
  habit_id: number;
  date: string;
}

/* ─── Helpers ─────────────────────────────────────────── */
function toYMD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function dayLabel(year: number, month: number, day: number) {
  return new Date(year, month, day)
    .toLocaleDateString("en", { weekday: "short" })
    .slice(0, 2);
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/* ─── Component ───────────────────────────────────────── */
export default function HabitTracker() {
  const today = new Date();
  const todayYMD = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, setYear]             = useState(today.getFullYear());
  const [month, setMonth]           = useState(today.getMonth());
  const [habits, setHabits]         = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(true);
  const [newHabitName, setNewHabitName] = useState("");
  const [dark, setDark]             = useState(false);
  const [mobileYMD, setMobileYMD]   = useState(todayYMD);
  const [cloneHabits, setCloneHabits] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobile, setIsMobile]     = useState(false);

  /* ── Viewport dynamic check ── */
  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const days     = daysInMonth(year, month);
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  /* ── Dark mode — read saved preference ── */
  useEffect(() => {
    const saved = localStorage.getItem("habits-theme");
    if (saved === "dark") setDark(true);
    else if (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)
      setDark(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("habits-theme", dark ? "dark" : "light");
  }, [dark]);

  /* ── Cloning — read saved preference ── */
  useEffect(() => {
    const saved = localStorage.getItem("habits-clone");
    if (saved === "false") setCloneHabits(false);
  }, []);

  const toggleCloning = (val: boolean) => {
    setCloneHabits(val);
    localStorage.setItem("habits-clone", val ? "true" : "false");
  };

  /* ── Init DB ── */
  useEffect(() => { fetch("/api/init-db").catch(() => {}); }, []);

  /* ── Fetch habits ── */
  const fetchHabits = useCallback(async () => {
    const res = await fetch(`/api/habits?month=${monthKey}&clone=${cloneHabits}`);
    setHabits(await res.json());
  }, [monthKey, cloneHabits]);

  /* ── Fetch completions ── */
  const fetchCompletions = useCallback(async () => {
    const res = await fetch(`/api/completions?month=${monthKey}`);
    const data: Completion[] = await res.json();
    setCompletions(new Set(data.map((c) => `${c.habit_id}:${c.date}`)));
  }, [monthKey]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchHabits(), fetchCompletions()]).finally(() =>
      setLoading(false)
    );
  }, [fetchHabits, fetchCompletions]);



  // Auto-scroll today's date column into horizontal view on load or month switch
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        const el = document.getElementById("today-column");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, month, year]);

  const shiftDay = (amount: number) => {
    const d = new Date(mobileYMD);
    d.setDate(d.getDate() + amount);
    const newYMD = toYMD(d.getFullYear(), d.getMonth(), d.getDate());
    setMobileYMD(newYMD);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const formatMobileDate = (ymd: string) => {
    const d = new Date(ymd);
    const dayName = d.toLocaleDateString("en", { weekday: "long" });
    const monthName = d.toLocaleDateString("en", { month: "short" });
    const dateNum = d.getDate();
    
    const tempToday = new Date();
    const tempYesterday = new Date();
    tempYesterday.setDate(tempYesterday.getDate() - 1);
    
    const todayStr = toYMD(tempToday.getFullYear(), tempToday.getMonth(), tempToday.getDate());
    const yesterdayStr = toYMD(tempYesterday.getFullYear(), tempYesterday.getMonth(), tempYesterday.getDate());
    
    if (ymd === todayStr) return `Today, ${monthName} ${dateNum}`;
    if (ymd === yesterdayStr) return `Yesterday, ${monthName} ${dateNum}`;
    return `${dayName}, ${monthName} ${dateNum}`;
  };



  /* ── Toggle completion ── */
  const toggleDay = async (habitId: number, day: number) => {
    const date      = toYMD(year, month, day);
    const key       = `${habitId}:${date}`;
    const completed = !completions.has(key);

    setCompletions((prev) => {
      const next = new Set(prev);
      if (completed) next.add(key); else next.delete(key);
      return next;
    });

    await fetch("/api/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_id: habitId, date, completed }),
    });
  };

  const toggleMobileDay = async (habitId: number, ymd: string) => {
    const key = `${habitId}:${ymd}`;
    const completed = !completions.has(key);

    setCompletions((prev) => {
      const next = new Set(prev);
      if (completed) next.add(key); else next.delete(key);
      return next;
    });

    await fetch("/api/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_id: habitId, date: ymd, completed }),
    });
  };

  /* ── Add habit ── */
  const submitAddHabit = async () => {
    const name = newHabitName.trim();
    if (!name) return;
    const res   = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, month: monthKey }),
    });
    const habit = await res.json();
    setHabits((prev) => [...prev, habit]);
    setNewHabitName("");
  };





  /* ── Month navigation ── */
  const prevMonth = () => {
    let newY = year;
    let newM = month;
    if (month === 0) { newY = year - 1; newM = 11; }
    else { newM = month - 1; }
    setYear(newY);
    setMonth(newM);
    setMobileYMD(toYMD(newY, newM, 1));
  };
  const nextMonth = () => {
    let newY = year;
    let newM = month;
    if (month === 11) { newY = year + 1; newM = 0; }
    else { newM = month + 1; }
    setYear(newY);
    setMonth(newM);
    setMobileYMD(toYMD(newY, newM, 1));
  };



  const getWeekRangeLabel = (w: number) => {
    switch (w) {
      case 1: return "1–7";
      case 2: return "8–14";
      case 3: return "15–21";
      case 4: return "22–28";
      case 5: return `29–${days}`;
      default: return "";
    }
  };

  const isWeekEnd = (day: number) =>
    new Date(year, month, day).getDay() === 0;

  return (
    <div>
      {/* ── Header ── */}
      <header className="site-header">
        <div className="container">
          <div className="site-header-inner">
            <span className="site-logo">habits.</span>

            <div className="header-controls">
              {/* Month nav — desktop only */}
              {!isMobile && (
                <nav className="month-nav" aria-label="Month navigation">
                  <button className="nav-btn" onClick={prevMonth} aria-label="Previous month">←</button>
                  <span className="month-nav-label">{MONTH_NAMES[month]} {year}</span>
                  <button className="nav-btn" onClick={nextMonth} aria-label="Next month">→</button>
                </nav>
              )}

              {/* Settings toggle */}
              <button
                className="theme-btn"
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Open settings"
                title="Settings"
                id="settings-btn"
              >
                ⚙︎
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="container">
        {loading ? (
          <div className="loading-state">loading your habits…</div>
        ) : !isMobile ? (
          <div className="tracker">
              <table className="tracker-table" aria-label="Habit tracker">
                <thead>
                  <tr>
                    <th className="col-habit">Habit</th>
                    {Array.from({ length: days }, (_, i) => {
                      const day  = i + 1;
                      const ymd  = toYMD(year, month, day);
                      const isToday = ymd === todayYMD;
                      return (
                        <th
                          key={day}
                          id={isToday ? "today-column" : undefined}
                          className={[
                            isWeekEnd(day) ? "week-separator" : "",
                            isToday        ? "today-header"   : "",
                          ].join(" ")}
                          title={`${MONTH_NAMES[month]} ${day}`}
                        >
                          {day}
                          <br />
                          <span style={{ fontSize: "0.52rem", opacity: 0.65 }}>
                            {dayLabel(year, month, day)}
                          </span>
                        </th>
                      );
                    })}
                    <th className="col-progress">Done</th>
                  </tr>
                </thead>

                <tbody>
                  {habits.map((habit) => {
                    const habitDone = Array.from({ length: days }, (_, i) =>
                      completions.has(`${habit.id}:${toYMD(year, month, i + 1)}`)
                    ).filter(Boolean).length;

                    return (
                      <tr key={habit.id}>
                        {/* Habit name — sticky link */}
                        <td className="habit-name-cell col-habit">
                          <Link
                            href={`/habit/${habit.id}`}
                            className="habit-name-text"
                            title={`Click to view details: ${habit.name}`}
                          >
                            {habit.name}
                          </Link>
                        </td>

                        {/* Day cells */}
                        {Array.from({ length: days }, (_, i) => {
                          const day      = i + 1;
                          const ymd      = toYMD(year, month, day);
                          const done     = completions.has(`${habit.id}:${ymd}`);
                          const isFuture = ymd > todayYMD;
                          const isToday  = ymd === todayYMD;

                          return (
                            <td
                              key={day}
                              className={[
                                "day-cell",
                                isWeekEnd(day) ? "week-separator" : "",
                              ].join(" ")}
                            >
                              <button
                                className={[
                                  "day-cell-btn",
                                  done      ? "completed"   : "",
                                  isFuture  ? "future-cell" : "",
                                  isToday   ? "today-cell"  : "",
                                ].join(" ")}
                                onClick={() => !isFuture && toggleDay(habit.id, day)}
                                aria-label={`${habit.name} — ${MONTH_NAMES[month]} ${day}: ${done ? "done" : "not done"}`}
                                aria-pressed={done}
                              >
                                <span className="day-dot" />
                              </button>
                            </td>
                          );
                        })}

                        {/* Progress — sticky */}
                        <td className="progress-cell col-progress">
                          {habit.goal_value && habit.goal_value > 0 ? (
                            <span className={habitDone >= habit.goal_value ? "goal-achieved" : ""}>
                              {habitDone}/{habit.goal_value}
                            </span>
                          ) : (
                            <span>{habitDone}/{days}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Add habit — ghost row */}
                  <tr className="ghost-habit-row">
                    <td className="habit-name-cell col-habit">
                      <input
                        className="ghost-habit-input"
                        placeholder="+ add a habit…"
                        value={newHabitName}
                        onChange={(e) => setNewHabitName(e.target.value)}
                        onBlur={submitAddHabit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            submitAddHabit();
                          }
                          if (e.key === "Escape") {
                            setNewHabitName("");
                            e.currentTarget.blur();
                          }
                        }}
                      />
                    </td>
                    {Array.from({ length: days }).map((_, i) => (
                      <td key={i} />
                    ))}
                    <td className="col-progress" />
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            /* Mobile Daily Checklist View */
            <div className="mobile-daily-view">
              <div className="mobile-date-header">
                <button className="nav-btn" onClick={() => shiftDay(-1)} aria-label="Previous day">←</button>
                <span className="mobile-date-title">{formatMobileDate(mobileYMD)}</span>
                <button className="nav-btn" onClick={() => shiftDay(1)} aria-label="Next day">→</button>
              </div>

              <div className="mobile-habit-list" role="list">
                {habits.map((habit) => {
                  const completed = completions.has(`${habit.id}:${mobileYMD}`);
                  return (
                    <button
                      key={habit.id}
                      className={`mobile-habit-item ${completed ? "completed" : ""}`}
                      onClick={() => toggleMobileDay(habit.id, mobileYMD)}
                      aria-label={`${habit.name}: ${completed ? "completed" : "incomplete"}`}
                      aria-pressed={completed}
                    >
                      <span className="mobile-habit-name">{habit.name}</span>
                    </button>
                  );
                })}

                {/* Mobile Ghost Row Input */}
                <div style={{ padding: "1.1rem 0" }}>
                  <input
                    className="ghost-habit-input"
                    placeholder="+ add a habit…"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    onBlur={submitAddHabit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        submitAddHabit();
                      }
                      if (e.key === "Escape") {
                        setNewHabitName("");
                        e.currentTarget.blur();
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
      </main>

      {/* ── Settings Modal ── */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Settings</h2>
              <button className="modal-close" onClick={() => setIsSettingsOpen(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Theme option */}
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Dark Mode</span>
                  <span className="setting-description">Use a dark aesthetic interface</span>
                </div>
                <button
                  className={`toggle-switch ${dark ? "active" : ""}`}
                  onClick={() => setDark(!dark)}
                  aria-label="Toggle dark mode"
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              {/* Cloning option */}
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Clone Habits</span>
                  <span className="setting-description">Carry forward habits when creating a new month</span>
                </div>
                <button
                  className={`toggle-switch ${cloneHabits ? "active" : ""}`}
                  onClick={() => toggleCloning(!cloneHabits)}
                  aria-label="Toggle habit cloning"
                >
                  <span className="toggle-slider" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
