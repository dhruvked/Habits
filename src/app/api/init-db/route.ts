import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  await sql`
    CREATE TABLE IF NOT EXISTS habits (
      id        SERIAL PRIMARY KEY,
      name      TEXT NOT NULL,
      position  INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS completions (
      id         SERIAL PRIMARY KEY,
      habit_id   INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date       DATE NOT NULL,
      UNIQUE (habit_id, date)
    )
  `;

  return NextResponse.json({ ok: true });
}
