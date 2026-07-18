"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/* ─── Types ───────────────────────────────────────────── */
interface Habit {
  id: number;
  name: string;
  position: number;
}

interface Completion {
  habit_id: number;
  date: string; // "YYYY-MM-DD"
}

/* ─── Helpers ─────────────────────────────────────────── */
function toYMD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function dayLabel(year: number, month: number, day: number) {
  return new Date(year, month, day).toLocaleDateString("en", { weekday: "short" }).slice(0, 2);
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

/* ─── Component ───────────────────────────────────────── */
export default function HabitTracker() {
  const today = new Date();
  const todayYMD = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const days = daysInMonth(year, month);
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  /* ── Init DB on first load ── */
  useEffect(() => {
    fetch("/api/init-db").catch(() => {});
  }, []);

  /* ── Fetch habits ── */
  const fetchHabits = useCallback(async () => {
    const res = await fetch("/api/habits");
    setHabits(await res.json());
  }, []);

  /* ── Fetch completions for current month ── */
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

  /* ── Focus add input when shown ── */
  useEffect(() => {
    if (addingHabit) addInputRef.current?.focus();
  }, [addingHabit]);

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus();
  }, [editingId]);

  /* ── Toggle completion ── */
  const toggleDay = async (habitId: number, day: number) => {
    const date = toYMD(year, month, day);
    const key = `${habitId}:${date}`;
    const completed = !completions.has(key);

    // Optimistic update
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
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const habit = await res.json();
    setHabits((prev) => [...prev, habit]);
    setNewHabitName("");
    setAddingHabit(false);
  };

  /* ── Rename habit ── */
  const submitRename = async (id: number) => {
    const name = editingName.trim();
    setEditingId(null);
    if (!name) return;
    await fetch(`/api/habits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, name } : h)));
  };

  /* ── Delete habit ── */
  const deleteHabit = async (id: number) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
  };

  /* ── Month navigation ── */
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  /* ── Stats ── */
  const totalPossible = habits.length * days;
  const totalDone = completions.size;
  const pct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  const todayDone = habits.filter((h) => completions.has(`${h.id}:${todayYMD}`)).length;

  /* ── Week separator helper ── */
  const isWeekEnd = (day: number) => {
    const dow = new Date(year, month, day).getDay();
    return dow === 0; // Sunday
  };

  return (
    <div>
      {/* Header */}
      <header className="site-header">
        <div className="container">
          <div className="site-header-inner">
            <span className="site-logo">habits.</span>

            {/* Month Nav */}
            <nav className="month-nav" aria-label="Month navigation">
              <button className="nav-btn" onClick={prevMonth} aria-label="Previous month">←</button>
              <span className="month-nav-label">
                {MONTH_NAMES[month]} {year}
              </span>
              <button className="nav-btn" onClick={nextMonth} aria-label="Next month">→</button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container">
        {loading ? (
          <div className="loading-state">loading your habits…</div>
        ) : (
          <>
            {/* Tracker */}
            <div className="tracker">
              <table className="tracker-table" aria-label="Habit tracker">
                <thead>
                  <tr>
                    <th className="col-habit">Habit</th>
                    {Array.from({ length: days }, (_, i) => {
                      const day = i + 1;
                      const ymd = toYMD(year, month, day);
                      const isToday = ymd === todayYMD;
                      return (
                        <th
                          key={day}
                          className={`${isWeekEnd(day) ? "week-separator" : ""} ${isToday ? "today-header" : ""}`}
                          title={`${MONTH_NAMES[month]} ${day}`}
                        >
                          {day}
                          <br />
                          <span style={{ fontSize: "0.55rem", opacity: 0.7 }}>
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
                        {/* Habit Name */}
                        <td className="habit-name-cell">
                          {editingId === habit.id ? (
                            <input
                              ref={editInputRef}
                              className="habit-name-input"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => submitRename(habit.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitRename(habit.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                          ) : (
                            <span
                              className="habit-name-text"
                              onClick={() => {
                                setEditingId(habit.id);
                                setEditingName(habit.name);
                              }}
                              title={`Click to rename: ${habit.name}`}
                            >
                              {habit.name}
                            </span>
                          )}
                          <button
                            className="delete-btn"
                            onClick={() => deleteHabit(habit.id)}
                            aria-label={`Delete ${habit.name}`}
                            title="Delete habit"
                          >
                            ×
                          </button>
                        </td>

                        {/* Day cells */}
                        {Array.from({ length: days }, (_, i) => {
                          const day = i + 1;
                          const ymd = toYMD(year, month, day);
                          const done = completions.has(`${habit.id}:${ymd}`);
                          const isFuture = ymd > todayYMD;
                          const isToday = ymd === todayYMD;

                          return (
                            <td key={day} className={`day-cell ${isWeekEnd(day) ? "week-separator" : ""}`}>
                              <button
                                className={`day-cell-btn ${done ? "completed" : ""} ${isFuture ? "future-cell" : ""} ${isToday ? "today-cell" : ""}`}
                                onClick={() => !isFuture && toggleDay(habit.id, day)}
                                aria-label={`${habit.name} on ${MONTH_NAMES[month]} ${day}: ${done ? "done" : "not done"}`}
                                aria-pressed={done}
                                disabled={isFuture}
                              >
                                <span className="day-dot" />
                              </button>
                            </td>
                          );
                        })}

                        {/* Progress */}
                        <td className="progress-cell">
                          <span className="progress-fraction">
                            {habitDone}/{days}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Add habit input row */}
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
                            if (e.key === "Enter") submitAddHabit();
                            if (e.key === "Escape") {
                              setAddingHabit(false);
                              setNewHabitName("");
                            }
                          }}
                        />
                      </td>
                    </tr>
                  )}

                  {/* Add habit button row */}
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

            {/* Stats footer */}
            {habits.length > 0 && (
              <div className="stats-row" role="complementary" aria-label="Monthly statistics">
                <div className="stat-item">
                  <span className="stat-value">{pct}%</span>
                  <span className="stat-label">Month completion</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{todayDone}/{habits.length}</span>
                  <span className="stat-label">Today&apos;s habits</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{totalDone}</span>
                  <span className="stat-label">Total check-ins</span>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
