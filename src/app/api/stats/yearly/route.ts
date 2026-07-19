import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  if (!year) {
    return NextResponse.json({ error: "Missing year parameter" }, { status: 400 });
  }

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  try {
    // Group completions by date and count them
    // This gives us an aggregate of how many habits were completed on each day
    const rows = await sql`
      SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str, COUNT(*) as count
      FROM completions
      WHERE date >= ${startDate} AND date <= ${endDate}
      GROUP BY date
      ORDER BY date
    `;

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch yearly stats:", error);
    return NextResponse.json({ error: "Failed to fetch yearly stats" }, { status: 500 });
  }
}
