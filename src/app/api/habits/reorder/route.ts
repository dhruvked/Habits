import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { orders } = await req.json();
    if (!Array.isArray(orders)) {
      return NextResponse.json({ error: "orders array required" }, { status: 400 });
    }

    // Run updates in parallel
    await Promise.all(
      orders.map((item: { id: number; position: number }) =>
        sql`UPDATE habits SET position = ${item.position} WHERE id = ${item.id}`
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
