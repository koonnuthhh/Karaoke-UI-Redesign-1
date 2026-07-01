import { NextRequest, NextResponse } from "next/server"
import { readCollection, ok } from "@/lib/mockDb"

export async function GET(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  const bookings = readCollection<any>("bookings")
  const filtered = bookings.filter((b) => b.date === date)

  return NextResponse.json(ok(filtered))
}
