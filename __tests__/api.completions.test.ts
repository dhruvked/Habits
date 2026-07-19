/**
 * API route tests for GET /api/completions and POST /api/completions.
 * The @/lib/db module is mocked — no real database is used.
 */

jest.mock("@/lib/db", () => ({ sql: jest.fn() }));

import { sql } from "@/lib/db";
import { GET, POST } from "@/app/api/completions/route";

const mockSql = sql as jest.Mock;

// ── GET /api/completions ──────────────────────────────────────────────────────

describe("GET /api/completions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 if month param is missing", async () => {
    const req = new Request("http://localhost/api/completions");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/month/i);
  });

  it("returns completions for the given month", async () => {
    const completions = [
      { habit_id: 1, date: "2026-07-01" },
      { habit_id: 1, date: "2026-07-02" },
      { habit_id: 2, date: "2026-07-01" },
    ];
    mockSql.mockResolvedValueOnce(completions);

    const req = new Request("http://localhost/api/completions?month=2026-07");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(3);
    expect(body[0]).toHaveProperty("habit_id");
    expect(body[0]).toHaveProperty("date");
  });

  it("returns an empty array when no completions exist", async () => {
    mockSql.mockResolvedValueOnce([]);
    const req = new Request("http://localhost/api/completions?month=2026-08");
    const res = await GET(req);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

// ── POST /api/completions ─────────────────────────────────────────────────────

describe("POST /api/completions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("inserts a completion when completed=true", async () => {
    mockSql.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/completions", {
      method: "POST",
      body: JSON.stringify({ habit_id: 1, date: "2026-07-18", completed: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("deletes a completion when completed=false", async () => {
    mockSql.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/completions", {
      method: "POST",
      body: JSON.stringify({ habit_id: 1, date: "2026-07-18", completed: false }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("returns ok: true for both insert and delete", async () => {
    mockSql.mockResolvedValue([]);

    for (const completed of [true, false]) {
      const req = new Request("http://localhost/api/completions", {
        method: "POST",
        body: JSON.stringify({ habit_id: 2, date: "2026-07-10", completed }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const body = await res.json();
      expect(body.ok).toBe(true);
    }
  });
});
