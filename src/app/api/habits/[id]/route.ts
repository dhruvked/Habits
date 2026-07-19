import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/habits/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [habit] = await sql`
    SELECT id, name, position, description, goal_value
    FROM habits
    WHERE id = ${Number(id)}
  `;
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(habit);
}

// PATCH /api/habits/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  
  const hasName = body.name !== undefined;
  const hasDescription = body.description !== undefined;
  const hasGoalValue = body.goal_value !== undefined;

  const name = hasName ? (body.name?.trim().toUpperCase() || null) : null;
  const description = hasDescription ? (body.description !== null ? String(body.description).trim() : "") : null;
  const goal_value = hasGoalValue ? (body.goal_value === "" || body.goal_value === null || Number(body.goal_value) === 0 ? null : Number(body.goal_value)) : null;

  const [habit] = await sql`
    UPDATE habits
    SET 
      name = CASE WHEN ${hasName}::boolean THEN ${name} ELSE name END,
      description = CASE WHEN ${hasDescription}::boolean THEN ${description} ELSE description END,
      goal_value = CASE WHEN ${hasGoalValue}::boolean THEN ${goal_value}::integer ELSE goal_value END
    WHERE id = ${Number(id)}
    RETURNING id, name, position, description, goal_value
  `;
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(habit);
}

// DELETE /api/habits/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await sql`DELETE FROM habits WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
