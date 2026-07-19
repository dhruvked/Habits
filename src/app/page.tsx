"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, Reorder, useDragControls, AnimatePresence } from "framer-motion";
import YearlyHeatmap from "./components/YearlyHeatmap";

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
  const [draggedHabitId, setDraggedHabitId] = useState<number | null>(null);

  /* ── Month Dropdown State ── */
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [dropdownYear, setDropdownYear] = useState(year);


  /* ── Drag-to-Scroll Refs ── */
  const trackerRef = useRef<HTMLDivElement>(null);
  const isDraggingTracker = useRef(false);
  const startX = useRef(0);
  const scrollLeftTracker = useRef(0);

  /* ── Add Habit Ref ── */
  const isAddingHabitRef = useRef(false);

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



  /* ── Persist Reorder ── */
  const saveReorder = (newHabits: Habit[]) => {
    const ordered = newHabits.map((h, i) => ({ ...h, position: i }));
    fetch("/api/habits/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders: ordered.map((h) => ({ id: h.id, position: h.position })) }),
    }).catch(() => {});
  };

  /* ── Drag & Drop Reordering (mouse-event based, not HTML5 DnD) ── */
  const handleGripMouseDown = (e: React.MouseEvent, habitId: number) => {
    e.preventDefault(); // prevent text selection during drag

    setDraggedHabitId(habitId);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvt: MouseEvent) => {
      // Hit-test each habit row to find where we're hovering
      const rows = document.querySelectorAll<HTMLElement>("[data-habit-id]");
      let targetIndex = rows.length - 1;
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        if (moveEvt.clientY < rect.top + rect.height / 2) {
          targetIndex = i;
          break;
        }
      }

      setHabits((prev) => {
        const fromIdx = prev.findIndex((h) => h.id === habitId);
        if (fromIdx === -1 || fromIdx === targetIndex) return prev;
        const next = [...prev];
        const [item] = next.splice(fromIdx, 1);
        next.splice(targetIndex, 0, item);
        return next;
      });
    };

    const onMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      setDraggedHabitId(null);

      // Persist new positions
      setHabits((prev) => {
        const ordered = prev.map((h, i) => ({ ...h, position: i }));
        fetch("/api/habits/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders: ordered.map((h) => ({ id: h.id, position: h.position })) }),
        }).catch(() => {});
        return ordered;
      });
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
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
    if (!name || isAddingHabitRef.current) return;
    
    isAddingHabitRef.current = true;
    
    const tempId = -Date.now();
    const tempClientId = tempId.toString();
    const optimisticHabit: Habit & { clientId?: string } = {
      id: tempId,
      name,
      goal_value: undefined,
      position: habits.length,
      clientId: tempClientId
    };

    setHabits((prev) => [...prev, optimisticHabit]);
    setNewHabitName(""); // Optimistic clear for immediate feedback

    try {
      const res   = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, month: monthKey }),
      });
      if (res.ok) {
        const realHabit = await res.json();
        realHabit.clientId = tempClientId;
        setHabits((prev) => prev.map(h => (h.id === tempId ? realHabit : h)));
      } else {
        setHabits((prev) => prev.filter(h => h.id !== tempId));
        setNewHabitName(name); 
      }
    } finally {
      isAddingHabitRef.current = false;
    }
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

  /* ── Drag-to-Scroll Handlers ── */
  const onTrackerMouseDown = (e: React.MouseEvent) => {
    if (!trackerRef.current) return;
    isDraggingTracker.current = true;
    trackerRef.current.classList.add("tracker-grabbing");
    startX.current = e.pageX - trackerRef.current.offsetLeft;
    scrollLeftTracker.current = trackerRef.current.scrollLeft;
  };

  const onTrackerMouseLeave = () => {
    isDraggingTracker.current = false;
    if (trackerRef.current) {
      trackerRef.current.classList.remove("tracker-grabbing");
    }
  };

  const onTrackerMouseUp = () => {
    isDraggingTracker.current = false;
    if (trackerRef.current) {
      trackerRef.current.classList.remove("tracker-grabbing");
    }
  };

  const onTrackerMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTracker.current || !trackerRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // scrolling speed multiplier
    trackerRef.current.scrollLeft = scrollLeftTracker.current - walk;
  };

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
                <div className="month-dropdown-container">
                  <nav 
                    className="month-nav" 
                    aria-label="Month navigation"
                    onClick={() => {
                      setDropdownYear(year);
                      setIsMonthDropdownOpen(!isMonthDropdownOpen);
                    }}
                  >
                    <button 
                      className="nav-btn" 
                      onClick={(e) => { e.stopPropagation(); prevMonth(); }} 
                      aria-label="Previous month"
                    >
                      ←
                    </button>
                    <span className="month-nav-label">
                      {MONTH_NAMES[month]} {year}
                    </span>
                    <button 
                      className="nav-btn" 
                      onClick={(e) => { e.stopPropagation(); nextMonth(); }} 
                      aria-label="Next month"
                    >
                      →
                    </button>
                  </nav>

                  {isMonthDropdownOpen && (
                    <>
                      <div className="dropdown-overlay" onClick={() => setIsMonthDropdownOpen(false)} />
                      <div className="month-dropdown-popover" onClick={(e) => e.stopPropagation()}>
                        <div className="dropdown-year-header">
                          <button onClick={() => setDropdownYear(y => y - 1)}>←</button>
                          <span>{dropdownYear}</span>
                          <button onClick={() => setDropdownYear(y => y + 1)}>→</button>
                        </div>
                        <div className="dropdown-months-grid">
                          {MONTH_NAMES.map((mName, i) => (
                            <button
                              key={i}
                              className={`dropdown-month-btn ${i === month && dropdownYear === year ? "active" : ""}`}
                              onClick={() => {
                                setYear(dropdownYear);
                                setMonth(i);
                                setMobileYMD(toYMD(dropdownYear, i, 1));
                                setIsMonthDropdownOpen(false);
                              }}
                            >
                              {mName.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
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
          <div 
            className="tracker"
            ref={trackerRef}
            onMouseDown={onTrackerMouseDown}
            onMouseLeave={onTrackerMouseLeave}
            onMouseUp={onTrackerMouseUp}
            onMouseMove={onTrackerMouseMove}
          >
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
                          <div className={isToday ? "today-pill" : ""}>
                            {day}
                            <br />
                            <span style={{ fontSize: "0.52rem", opacity: isToday ? 0.9 : 0.65 }}>
                              {dayLabel(year, month, day)}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="col-progress">Done</th>
                  </tr>
                </thead>

                <Reorder.Group 
                  as="tbody" 
                  values={habits} 
                  onReorder={setHabits}
                >
                  <AnimatePresence initial={false}>
                    {habits.map((habit: any) => (
                      <HabitRow
                        key={habit.clientId || habit.id}
                        habit={habit}
                        days={days}
                        year={year}
                        month={month}
                        todayYMD={todayYMD}
                        completions={completions}
                        toggleDay={toggleDay}
                        isWeekEnd={isWeekEnd}
                        onDragEnd={() => saveReorder(habits)}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Add habit — ghost row */}
                  <motion.tr layout className="ghost-habit-row">
                    <td className="habit-name-cell col-habit" style={{ paddingLeft: "1.5rem" }}>
                      <input
                        className="ghost-habit-input"
                        placeholder="+ add a habit…"
                        value={newHabitName}
                        onChange={(e) => setNewHabitName(e.target.value)}
                        onBlur={submitAddHabit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            submitAddHabit();
                            e.currentTarget.blur();
                          }
                          if (e.key === "Escape") {
                            setNewHabitName("");
                            e.currentTarget.blur();
                          }
                        }}
                      />
                    </td>
                    <td colSpan={days + 1} />
                  </motion.tr>
                </Reorder.Group>
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
                        e.currentTarget.blur();
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
          
          {/* Yearly Analytics Heatmap */}
          <YearlyHeatmap 
            liveCompletions={completions} 
            liveTotalHabits={habits.length} 
            currentMonthKey={monthKey} 
          />
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

/* ── Habit Row Component ── */
interface HabitRowProps {
  habit: Habit;
  days: number;
  year: number;
  month: number;
  todayYMD: string;
  completions: Set<string>;
  toggleDay: (habitId: number, day: number) => void;
  isWeekEnd: (day: number, y?: number, m?: number) => boolean;
  onDragEnd: () => void;
}

function HabitRow({
  habit,
  days,
  year,
  month,
  todayYMD,
  completions,
  toggleDay,
  isWeekEnd,
  onDragEnd
}: HabitRowProps) {
  const controls = useDragControls();
  const [isDragging, setIsDragging] = React.useState(false);

  const habitDone = Array.from({ length: days }, (_, i) =>
    completions.has(`${habit.id}:${toYMD(year, month, i + 1)}`)
  ).filter(Boolean).length;

  const goal = habit.goal_value || days;

  return (
    <Reorder.Item
      as="tr"
      value={habit}
      id={((habit as any).clientId || habit.id).toString()}
      initial={{ opacity: 0, y: -15, scaleY: 0.9 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, scaleY: 0.5, backgroundColor: "var(--delete-red, #ff000020)" }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => {
        setIsDragging(true);
        document.body.style.cursor = "grabbing";
      }}
      onDragEnd={() => {
        setIsDragging(false);
        document.body.style.cursor = "";
        onDragEnd();
      }}
      className={isDragging ? "dragging" : ""}
    >
      <td 
        className="habit-name-cell col-habit"
        onPointerDown={(e) => controls.start(e)}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span className="drag-handle" title="Drag to reorder">
            ⋮⋮
          </span>
          <Link
            href={`/habit/${habit.id}`}
            className="habit-name-text"
            title={`Click to view details: ${habit.name}`}
            onClick={(e) => {
              if (isDragging) e.preventDefault();
            }}
          >
            {habit.name}
          </Link>
        </div>
      </td>

      {Array.from({ length: days }, (_, i) => {
        const day      = i + 1;
        const ymd      = toYMD(year, month, day);
        const done     = completions.has(`${habit.id}:${ymd}`);
        const isFuture = ymd > todayYMD;
        const isToday  = ymd === todayYMD;

        return (
          <td
            key={day}
            className={["day-cell", isWeekEnd(day, year, month) ? "week-separator" : ""].join(" ")}
          >
            <motion.button
              disabled={habit.id < 0}
              className={[
                "day-cell-btn",
                done      ? "completed"   : "",
                isFuture  ? "future-cell" : "",
                isToday   ? "today-cell"  : "",
              ].join(" ")}
              onClick={() => !isFuture && toggleDay(habit.id, day)}
              aria-label={`${habit.name} — ${day}: ${done ? "done" : "not done"}`}
              aria-pressed={done}
              whileTap={!isFuture && habit.id >= 0 ? { scale: 0.4 } : undefined}
              animate={{
                scale: done ? [1.15, 1] : 1
              }}
              transition={{ type: "spring", stiffness: 400, damping: 12 }}
            >
              <motion.span 
                className="day-dot" 
                initial={false}
                animate={{
                  scale: done ? [2.5, 1.25] : [0.3, 1]
                }}
                transition={{ type: "spring", stiffness: 300, damping: 10, mass: 0.8 }}
              />
            </motion.button>
          </td>
        );
      })}

      <td className="progress-cell col-progress">
        <div className="progress-pill">
          {habit.goal_value && habit.goal_value > 0 ? (
            <span className={habitDone >= habit.goal_value ? "goal-achieved" : ""}>
              {habitDone}/{habit.goal_value}
            </span>
          ) : (
            <span>{habitDone}/{days}</span>
          )}
        </div>
      </td>
    </Reorder.Item>
  );
}
