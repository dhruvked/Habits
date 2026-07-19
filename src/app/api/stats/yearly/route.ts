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
    const completionRows = await sql`
      SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str, COUNT(*) as count, TO_CHAR(date, 'YYYY-MM') as month_key
      FROM completions
      WHERE date >= ${startDate} AND date <= ${endDate}
      GROUP BY date
    `;

    // Count total habits per month
    const habitRows = await sql`
      SELECT month as month_key, COUNT(*) as total
      FROM habits
      WHERE month LIKE ${year + '-%'}
      GROUP BY month
    `;

    const totalsByMonth: Record<string, number> = {};
    for (const row of habitRows) {
      totalsByMonth[row.month_key] = parseInt(row.total, 10);
    }

    const result = completionRows.map((row) => ({
      date_str: row.date_str,
      count: parseInt(row.count, 10),
      total: totalsByMonth[row.month_key] || 1
    }));

    return NextResponse.json({
      completions: result,
      totalsByMonth
    });
  } catch (error) {
    console.error("Failed to fetch yearly stats:", error);
    return NextResponse.json({ error: "Failed to fetch yearly stats" }, { status: 500 });
  }
}
