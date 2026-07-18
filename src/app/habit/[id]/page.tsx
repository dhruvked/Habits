"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Habit {
  id: number;
  name: string;
  description: string;
  goal_value: number;
}

export default function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalValue, setGoalValue] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Apply DB migrations first
    fetch("/api/init-db")
      .then(() => fetch(`/api/habits/${id}`))
      .then((res) => {
        if (!res.ok) throw new Error("Habit not found");
        return res.json();
      })
      .then((data: Habit) => {
        setName(data.name);
        setDescription(data.description || "");
        setGoalValue(data.goal_value || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Habit name is required");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          goal_value: goalValue,
        }),
      });

      if (!res.ok) throw new Error("Failed to save habit details");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this habit? All check-ins will be permanently deleted.")) {
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete habit");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-state">loading habit details…</div>;
  }

  return (
    <div className="detail-page-container">
      <header className="site-header">
        <div className="container">
          <div className="site-header-inner">
            <Link href="/" className="site-logo">
              habits.
            </Link>
            <Link href="/" className="back-link">
              ← back to tracker
            </Link>
          </div>
        </div>
      </header>

      <main className="container detail-content">
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSave} className="detail-form">
          <div className="form-group">
            <label className="form-label" htmlFor="habit-name">Habit Name</label>
            <input
              id="habit-name"
              type="text"
              className="detail-input-header"
              placeholder="Habit name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="habit-goal">
              Monthly Goal Target <span className="label-helper">(days)</span>
            </label>
            <div className="goal-input-wrapper">
              <input
                id="habit-goal"
                type="number"
                min="1"
                max="31"
                className="detail-input-goal"
                placeholder="Every day"
                value={goalValue !== null ? goalValue : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setGoalValue(null);
                  } else {
                    const num = parseInt(val) || 0;
                    if (num < 1) {
                      setGoalValue(null);
                    } else {
                      setGoalValue(Math.min(31, num));
                    }
                  }
                }}
              />
              <span className="goal-helper-text">
                {goalValue !== null && goalValue > 0
                  ? `Goal: Complete ${goalValue} times this month`
                  : "Every day"}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="habit-desc">Description & Notes</label>
            <textarea
              id="habit-desc"
              className="detail-textarea"
              placeholder="Why are you building this habit? What are the rules?…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="save-btn"
              disabled={saving}
            >
              {saving ? "saving…" : "save changes"}
            </button>
            <Link href="/" className="cancel-link">
              cancel
            </Link>
            
            <button
              type="button"
              className="delete-habit-btn"
              onClick={handleDelete}
              disabled={saving}
            >
              delete habit
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
