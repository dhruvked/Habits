import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/habits
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const clone = searchParams.get("clone");

  if (!month) {
    return NextResponse.json({ error: "Month parameter is required" }, { status: 400 });
  }

  // 1. Query habits for this month
  let habits = await sql`
    SELECT id, name, position, description, goal_value, month
    FROM habits
    WHERE month = ${month}
    ORDER BY position ASC, id ASC
  `;

  // 2. Auto-clone logic: If empty, clone from most recent previous month
  if (habits.length === 0 && clone !== "false") {
    const [prevMonthRecord] = await sql`
      SELECT DISTINCT month 
      FROM habits 
      WHERE month < ${month} 
      ORDER BY month DESC 
      LIMIT 1
    `;

    if (prevMonthRecord) {
      const prevMonth = prevMonthRecord.month as string;
      const habitsToClone = await sql`
        SELECT name, position, description, goal_value
        FROM habits
        WHERE month = ${prevMonth}
        ORDER BY position ASC, id ASC
      `;

      if (habitsToClone.length > 0) {
        // Bulk insert cloned habits for the current month
        for (const h of habitsToClone) {
          await sql`
            INSERT INTO habits (name, position, description, goal_value, month)
            VALUES (${h.name}, ${h.position}, ${h.description}, ${h.goal_value}, ${month})
          `;
        }

        // Query again after cloning
        habits = await sql`
          SELECT id, name, position, description, goal_value, month
          FROM habits
          WHERE month = ${month}
          ORDER BY position ASC, id ASC
        `;
      }
    }
  }

  return NextResponse.json(habits);
}

// POST /api/habits
export async function POST(req: Request) {
  const { name, month } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  if (!month) {
    return NextResponse.json({ error: "Month required" }, { status: 400 });
  }

  const [maxPos] = await sql`
    SELECT COALESCE(MAX(position), -1) AS max 
    FROM habits 
    WHERE month = ${month}
  `;
  const position = (maxPos.max as number) + 1;

  const [habit] = await sql`
    INSERT INTO habits (name, position, description, goal_value, month)
    VALUES (${name.trim().toUpperCase()}, ${position}, '', null, ${month})
    RETURNING id, name, position, description, goal_value, month
  `;
  return NextResponse.json(habit, { status: 201 });
}
