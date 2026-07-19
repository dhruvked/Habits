/**
 * API route tests for GET /api/habits/[id], PATCH /api/habits/[id], DELETE /api/habits/[id].
 * The @/lib/db module is mocked — no real database is used.
 */

jest.mock("@/lib/db", () => ({ sql: jest.fn() }));

import { sql } from "@/lib/db";
import { GET, PATCH, DELETE } from "@/app/api/habits/[id]/route";

const mockSql = sql as jest.Mock;

// Helper: build the params argument Next.js passes to route handlers
const params = (id: string) => ({ params: Promise.resolve({ id }) });

// ── GET /api/habits/[id] ──────────────────────────────────────────────────────

describe("GET /api/habits/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 404 when habit does not exist", async () => {
    mockSql.mockResolvedValueOnce([]);
    const req = new Request("http://localhost/api/habits/99");
    const res = await GET(req, params("99"));
    expect(res.status).toBe(404);
  });

  it("returns the habit when it exists", async () => {
    const habit = { id: 1, name: "Gym", position: 0, description: "Go to the gym", goal_value: 20 };
    mockSql.mockResolvedValueOnce([habit]);
    const req = new Request("http://localhost/api/habits/1");
    const res = await GET(req, params("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Gym");
    expect(body.goal_value).toBe(20);
  });
});

// ── PATCH /api/habits/[id] ────────────────────────────────────────────────────

describe("PATCH /api/habits/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates the habit name", async () => {
    const updated = { id: 1, name: "Running", position: 0, description: "", goal_value: null };
    mockSql.mockResolvedValueOnce([updated]);

    const req = new Request("http://localhost/api/habits/1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Running" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, params("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Running");
  });

  it("sets goal_value to null when empty string is passed", async () => {
    const updated = { id: 1, name: "Gym", position: 0, description: "", goal_value: null };
    mockSql.mockResolvedValueOnce([updated]);

    const req = new Request("http://localhost/api/habits/1", {
      method: "PATCH",
      body: JSON.stringify({ goal_value: "" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, params("1"));
    const body = await res.json();
    expect(body.goal_value).toBeNull();
  });

  it("sets goal_value to null when 0 is passed", async () => {
    const updated = { id: 1, name: "Gym", position: 0, description: "", goal_value: null };
    mockSql.mockResolvedValueOnce([updated]);

    const req = new Request("http://localhost/api/habits/1", {
      method: "PATCH",
      body: JSON.stringify({ goal_value: 0 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, params("1"));
    const body = await res.json();
    expect(body.goal_value).toBeNull();
  });

  it("sets goal_value to a valid integer", async () => {
    const updated = { id: 1, name: "Gym", position: 0, description: "", goal_value: 15 };
    mockSql.mockResolvedValueOnce([updated]);

    const req = new Request("http://localhost/api/habits/1", {
      method: "PATCH",
      body: JSON.stringify({ goal_value: 15 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, params("1"));
    const body = await res.json();
    expect(body.goal_value).toBe(15);
  });

  it("updates description", async () => {
    const updated = { id: 1, name: "Gym", position: 0, description: "Three times a week", goal_value: null };
    mockSql.mockResolvedValueOnce([updated]);

    const req = new Request("http://localhost/api/habits/1", {
      method: "PATCH",
      body: JSON.stringify({ description: "Three times a week" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, params("1"));
    const body = await res.json();
    expect(body.description).toBe("Three times a week");
  });

  it("returns 404 when habit does not exist", async () => {
    mockSql.mockResolvedValueOnce([]);
    const req = new Request("http://localhost/api/habits/999", {
      method: "PATCH",
      body: JSON.stringify({ name: "Ghost" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, params("999"));
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/habits/[id] ───────────────────────────────────────────────────

describe("DELETE /api/habits/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns ok: true on success", async () => {
    mockSql.mockResolvedValueOnce([]);
    const req = new Request("http://localhost/api/habits/1", { method: "DELETE" });
    const res = await DELETE(req, params("1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("calls sql DELETE with the correct id", async () => {
    mockSql.mockResolvedValueOnce([]);
    const req = new Request("http://localhost/api/habits/42", { method: "DELETE" });
    await DELETE(req, params("42"));
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});
