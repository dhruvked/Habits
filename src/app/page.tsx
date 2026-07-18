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
  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [dark, setDark]             = useState(false);


  const addInputRef  = useRef<HTMLInputElement>(null);

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

  /* ── Init DB ── */
  useEffect(() => { fetch("/api/init-db").catch(() => {}); }, []);

  /* ── Fetch habits ── */
  const fetchHabits = useCallback(async () => {
    const res = await fetch("/api/habits");
    setHabits(await res.json());
  }, []);

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

  /* ── Focus helpers ── */
  useEffect(() => { if (addingHabit)    addInputRef.current?.focus();  }, [addingHabit]);

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

  /* ── Add habit ── */
  const submitAddHabit = async () => {
    const name = newHabitName.trim();
    if (!name) { setAddingHabit(false); return; }
    const res   = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const habit = await res.json();
    setHabits((prev) => [...prev, habit]);
    setNewHabitName("");
    setAddingHabit(false);
  };





  /* ── Month navigation ── */
  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
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
              {/* Month nav */}
              <nav className="month-nav" aria-label="Month navigation">
                <button className="nav-btn" onClick={prevMonth} aria-label="Previous month">←</button>
                <span className="month-nav-label">{MONTH_NAMES[month]} {year}</span>
                <button className="nav-btn" onClick={nextMonth} aria-label="Next month">→</button>
              </nav>

              {/* Dark mode toggle */}
              <button
                className="theme-btn"
                onClick={() => setDark((d) => !d)}
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
                title={dark ? "Light mode" : "Dark mode"}
                id="theme-toggle"
              >
                {dark ? "☀︎" : "☽"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="container">
        {loading ? (
          <div className="loading-state">loading your habits…</div>
        ) : (
          <>
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

                        {/* Progress */}
                        <td className="progress-cell">
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

                  {/* Add habit — input row */}
                  {addingHabit && (
                    <tr className="add-habit-input-row">
                      <td colSpan={days + 2}>
                        <input
                          ref={addInputRef}
                          className="add-habit-input"
                          placeholder="new habit…"
                          value={newHabitName}
                          onChange={(e) => setNewHabitName(e.target.value)}
                          onBlur={submitAddHabit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")  submitAddHabit();
                            if (e.key === "Escape") { setAddingHabit(false); setNewHabitName(""); }
                          }}
                        />
                      </td>
                    </tr>
                  )}

                  {/* Add habit — button row */}
                  {!addingHabit && (
                    <tr className="add-habit-row">
                      <td colSpan={days + 2}>
                        <button
                          className="add-habit-btn"
                          onClick={() => setAddingHabit(true)}
                          id="add-habit-btn"
                        >
                          <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span>
                          add habit
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>


          </>
        )}
      </main>
    </div>
  );
}
