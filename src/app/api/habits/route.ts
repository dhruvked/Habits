import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/habits
export async function GET() {
  const habits = await sql`
    SELECT id, name, position, description, goal_value
    FROM habits
    ORDER BY position ASC, id ASC
  `;
  return NextResponse.json(habits);
}

// POST /api/habits
export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const [maxPos] = await sql`SELECT COALESCE(MAX(position), -1) AS max FROM habits`;
  const position = (maxPos.max as number) + 1;

  const [habit] = await sql`
    INSERT INTO habits (name, position, description, goal_value)
    VALUES (${name.trim()}, ${position}, '', 0)
    RETURNING id, name, position, description, goal_value
  `;
  return NextResponse.json(habit, { status: 201 });
}
