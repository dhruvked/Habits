/**
 * API route tests for GET /api/habits and POST /api/habits.
 * The @/lib/db module is mocked — no real database is used.
 */

// Mock the database module before any imports
jest.mock("@/lib/db", () => ({ sql: jest.fn() }));

import { sql } from "@/lib/db";
import { GET, POST } from "@/app/api/habits/route";

const mockSql = sql as jest.Mock;

// Helper: create a mock sql function that returns a sequence of results
function sqlSequence(...results: unknown[][]) {
  let call = 0;
  return jest.fn(async () => results[Math.min(call++, results.length - 1)]);
}

// ── GET /api/habits ───────────────────────────────────────────────────────────

describe("GET /api/habits", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 if month param is missing", async () => {
    const req = new Request("http://localhost/api/habits");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/month/i);
  });

  it("returns habits for the given month", async () => {
    const habits = [
      { id: 1, name: "Exercise", position: 0, description: "", goal_value: null, month: "2026-07" },
    ];
    mockSql.mockResolvedValueOnce(habits);

    const req = new Request("http://localhost/api/habits?month=2026-07");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Exercise");
  });

  it("auto-clones from previous month when current month is empty", async () => {
    const prevHabits = [
      { name: "Meditate", position: 0, description: "", goal_value: null },
    ];
    const clonedHabits = [
      { id: 2, name: "Meditate", position: 0, description: "", goal_value: null, month: "2026-08" },
    ];

    mockSql
      .mockResolvedValueOnce([])                          // 1st: empty habits for Aug
      .mockResolvedValueOnce([{ month: "2026-07" }])      // 2nd: find prev month
      .mockResolvedValueOnce(prevHabits)                  // 3rd: fetch prev month habits
      .mockResolvedValueOnce([])                          // 4th: INSERT (clone)
      .mockResolvedValueOnce(clonedHabits);               // 5th: re-fetch after clone

    const req = new Request("http://localhost/api/habits?month=2026-08&clone=true");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].name).toBe("Meditate");
  });

  it("skips cloning when clone=false", async () => {
    mockSql.mockResolvedValueOnce([]); // empty habits, no clone

    const req = new Request("http://localhost/api/habits?month=2026-09&clone=false");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);
    // sql was only called once (the initial query), no clone queries
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("returns empty array when no previous month exists and clone=true", async () => {
    mockSql
      .mockResolvedValueOnce([])    // empty habits
      .mockResolvedValueOnce([]);   // no previous month found

    const req = new Request("http://localhost/api/habits?month=2026-01&clone=true");
    const res = await GET(req);
    const body = await res.json();
    expect(body).toHaveLength(0);
  });
});

// ── POST /api/habits ──────────────────────────────────────────────────────────

describe("POST /api/habits", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 if name is missing", async () => {
    const req = new Request("http://localhost/api/habits", {
      method: "POST",
      body: JSON.stringify({ month: "2026-07" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/name/i);
  });

  it("returns 400 if month is missing", async () => {
    const req = new Request("http://localhost/api/habits", {
      method: "POST",
      body: JSON.stringify({ name: "Gym" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/month/i);
  });

  it("creates and returns a new habit", async () => {
    const newHabit = { id: 5, name: "Gym", position: 0, description: "", goal_value: null, month: "2026-07" };
    mockSql
      .mockResolvedValueOnce([{ max: -1 }])   // maxPos query
      .mockResolvedValueOnce([newHabit]);      // INSERT RETURNING

    const req = new Request("http://localhost/api/habits", {
      method: "POST",
      body: JSON.stringify({ name: "Gym", month: "2026-07" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Gym");
    expect(body.position).toBe(0);
  });

  it("trims whitespace from the habit name", async () => {
    const newHabit = { id: 6, name: "Read", position: 1, description: "", goal_value: null, month: "2026-07" };
    mockSql
      .mockResolvedValueOnce([{ max: 0 }])
      .mockResolvedValueOnce([newHabit]);

    const req = new Request("http://localhost/api/habits", {
      method: "POST",
      body: JSON.stringify({ name: "  Read  ", month: "2026-07" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.name).toBe("Read");
  });

  it("returns 400 for a whitespace-only name", async () => {
    const req = new Request("http://localhost/api/habits", {
      method: "POST",
      body: JSON.stringify({ name: "   ", month: "2026-07" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
