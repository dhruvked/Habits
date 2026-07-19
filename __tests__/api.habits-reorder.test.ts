/**
 * API route tests for POST /api/habits/reorder.
 * The @/lib/db module is mocked — no real database is used.
 */

jest.mock("@/lib/db", () => ({ sql: jest.fn() }));

import { sql } from "@/lib/db";
import { POST } from "@/app/api/habits/reorder/route";

const mockSql = sql as jest.Mock;

describe("POST /api/habits/reorder", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 if orders is not an array", async () => {
    const req = new Request("http://localhost/api/habits/reorder", {
      method: "POST",
      body: JSON.stringify({ orders: "not an array" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/orders array required/i);
  });

  it("updates positions for a list of habits", async () => {
    mockSql.mockResolvedValue([]);

    const req = new Request("http://localhost/api/habits/reorder", {
      method: "POST",
      body: JSON.stringify({
        orders: [
          { id: 1, position: 0 },
          { id: 2, position: 1 },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it("returns 500 when database query throws an error", async () => {
    mockSql.mockRejectedValueOnce(new Error("Database connection lost"));

    const req = new Request("http://localhost/api/habits/reorder", {
      method: "POST",
      body: JSON.stringify({
        orders: [{ id: 1, position: 0 }],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Database connection lost");
  });
});
