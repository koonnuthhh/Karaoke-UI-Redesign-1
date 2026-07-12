import { NextRequest, NextResponse } from "next/server"
import { readCollection, writeCollection, genId, ok, fail } from "@/lib/mockDb"
import { hasOverlappingBooking } from "@/lib/booking-overlap"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const input = body.data || body

  if (hasOverlappingBooking(input.room_id, input.date, input.start_time, input.end_time)) {
    return NextResponse.json(fail("Booking time overlaps with an existing booking"), { status: 400 })
  }

  const bookings = readCollection<any>("bookings")
  const now = new Date().toISOString()
  const newBooking = {
    booking_id: genId("booking"),
    room_id: input.room_id,
    user_id: input.user_id || null,
    username: input.username,
    phone: input.phone,
    date: input.date,
    start_time: input.start_time,
    end_time: input.end_time,
    status: input.status || "pending",
    price: input.price,
    created_at: now,
    updated_at: now,
  }

  bookings.push(newBooking)
  writeCollection("bookings", bookings)

  return NextResponse.json(ok(newBooking))
}
