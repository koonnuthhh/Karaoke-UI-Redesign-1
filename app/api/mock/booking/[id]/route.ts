import { NextRequest, NextResponse } from "next/server"
import { readCollection, writeCollection, ok, fail } from "@/lib/mockDb"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const input = body.data || body

  const bookings = readCollection<any>("bookings")
  const index = bookings.findIndex((b) => b.booking_id === id)

  if (index === -1) {
    return NextResponse.json(fail("Booking not found"), { status: 404 })
  }

  bookings[index] = {
    ...bookings[index],
    ...input,
    booking_id: id,
    updated_at: new Date().toISOString(),
  }
  writeCollection("bookings", bookings)

  return NextResponse.json(ok(bookings[index]))
}
