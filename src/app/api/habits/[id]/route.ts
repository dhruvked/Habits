import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// PATCH /api/habits/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const [habit] = await sql`
    UPDATE habits SET name = ${name.trim()}
    WHERE id = ${Number(id)}
    RETURNING id, name, position
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
