import { NextRequest, NextResponse } from "next/server"
import { readCollection, ok } from "@/lib/mockDb"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get("startDate") || ""
  const endDate = searchParams.get("endDate") || ""

  const bookings = readCollection<any>("bookings")
  const filtered = bookings.filter((b) => b.date >= startDate && b.date <= endDate)

  return NextResponse.json(ok(filtered))
}
