import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  if (!year || !/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  try {
    const data = await sql`
      SELECT 
        TO_CHAR(date, 'YYYY-MM-DD') as date_str,
        COUNT(*) as count
      FROM completions
      WHERE date >= ${startDate} AND date <= ${endDate}
      GROUP BY date
      ORDER BY date
    `;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching yearly stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
