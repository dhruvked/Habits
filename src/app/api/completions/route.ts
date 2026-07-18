import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/completions?month=YYYY-MM
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // e.g. "2026-07"

  if (!month) {
    return NextResponse.json({ error: "month param required" }, { status: 400 });
  }

  const completions = await sql`
    SELECT habit_id, date::text
    FROM completions
    WHERE to_char(date, 'YYYY-MM') = ${month}
  `;
  return NextResponse.json(completions);
}

// POST /api/completions  { habit_id, date, completed }
export async function POST(req: Request) {
  const { habit_id, date, completed } = await req.json();

  if (completed) {
    await sql`
      INSERT INTO completions (habit_id, date)
      VALUES (${habit_id}, ${date})
      ON CONFLICT (habit_id, date) DO NOTHING
    `;
  } else {
    await sql`
      DELETE FROM completions
      WHERE habit_id = ${habit_id} AND date = ${date}
    `;
  }

  return NextResponse.json({ ok: true });
}
