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

  // Migration: Add new columns if they do not exist
  await sql`ALTER TABLE habits ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`;
  await sql`ALTER TABLE habits ADD COLUMN IF NOT EXISTS goal_value INTEGER DEFAULT 0`;

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
