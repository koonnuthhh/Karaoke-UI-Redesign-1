import { NextRequest, NextResponse } from "next/server"
import { readCollection, writeCollection, ok, fail } from "@/lib/mockDb"
import { checkPromotionConditions } from "@/lib/promotion-conditions"
import { hasOverlappingBooking } from "@/lib/booking-overlap"
import type { Promotion } from "@/types"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const input = body.data || body

  const bookings = readCollection<any>("bookings")
  const index = bookings.findIndex((b) => b.booking_id === id)

  if (index === -1) {
    return NextResponse.json(fail("Booking not found"), { status: 404 })
  }

  // Editing room/date/start_time/end_time: make sure the resulting slot doesn't
  // collide with another non-cancelled booking in that room (excluding itself).
  const isChangingSlot = ["room_id", "date", "start_time", "end_time"].some((key) => key in input)
  if (isChangingSlot) {
    const existing = bookings[index]
    const roomId = input.room_id ?? existing.room_id
    const date = input.date ?? existing.date
    const startTime = input.start_time ?? existing.start_time
    const endTime = input.end_time ?? existing.end_time

    if (hasOverlappingBooking(roomId, date, startTime, endTime, id)) {
      return NextResponse.json(fail("This time slot overlaps with an existing booking"), { status: 400 })
    }
  }

  // Finalizing a booking with a promotion attached: re-check the promo's conditions
  // against this booking's actual date/start_time before committing, so a code that
  // stopped qualifying between "apply" and slip verification can't still get the discount.
  const isFinalizing = input.status === "booked" || input.booking_status === "booked"
  if (isFinalizing && input.promotion_id) {
    const promotions = readCollection<Promotion>("promotions")
    const promotion = promotions.find((p) => p.id === input.promotion_id)

    if (!promotion) {
      return NextResponse.json(fail("Promotion not found"), { status: 400 })
    }

    const existing = bookings[index]
    const check = checkPromotionConditions(promotion, {
      date: existing.date,
      time: existing.start_time,
      roomId: existing.room_id,
    })

    if (!check.valid) {
      return NextResponse.json(fail(check.message || "Promotion is not valid for this booking"), { status: 400 })
    }
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
