import { readCollection } from "@/lib/mockDb"

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + (minutes || 0)
}

/**
 * Checks whether room_id/date/start_time/end_time would overlap an existing,
 * non-cancelled booking in that room on that date. Pass excludeBookingId when
 * checking an edit, so the booking doesn't collide with its own current slot.
 */
export function hasOverlappingBooking(
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): boolean {
  const bookings = readCollection<any>("bookings")
  const newStart = toMinutes(startTime)
  const newEnd = toMinutes(endTime)

  return bookings.some((booking) => {
    if (booking.room_id !== roomId) return false
    if (booking.date !== date) return false
    if (booking.status === "cancelled") return false
    if (excludeBookingId && booking.booking_id === excludeBookingId) return false

    const existingStart = toMinutes(booking.start_time)
    const existingEnd = toMinutes(booking.end_time)
    return newStart < existingEnd && newEnd > existingStart
  })
}
