import { type NextRequest, NextResponse } from "next/server"
import type { TimeSlot, Room } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    // Fetch rooms data
    const roomsResponse = await fetch(`${process.env.API_PATH}/admin/rooms`, {
      method: "GET",
      headers: {
        apikey: `${process.env.API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    const roomsData = await roomsResponse.json()
    const rooms: Room[] = roomsData.data || []
    const roomMap = new Map(rooms.map((room: Room) => [room.room_id, room]))

    // Fetch bookings for the specified date
    const bookingsResponse = await fetch(
      `${process.env.API_PATH}/booking/date/${date}`,
      {
        method: "GET",
        headers: {
          apikey: `${process.env.API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    )

    const bookingsData = await bookingsResponse.json()
    const rawBookings = bookingsData.data || []

    // Filter out cancelled bookings and enrich with room info
    const bookings: TimeSlot[] = rawBookings
      .filter((booking: any) => booking.status !== "cancelled")
      .map((booking: any) => {
        const room = roomMap.get(booking.room_id)
        return {
          id: booking.booking_id,
          roomId: booking.room_id,
          roomName: room?.room_name || "Unknown Room",
          date: booking.date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          status: booking.status,
          customerName: booking.username,
          customerPhone: booking.phone,
          customerID: booking.user_id,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          price: booking.price || room?.price_per_half_hour || 0,
          duration: calculateDuration(booking.start_time, booking.end_time),
        } as TimeSlot
      })
      .sort((a: TimeSlot, b: TimeSlot) => {
        // Sort by start time
        const timeA = a.startTime ? parseInt(a.startTime.replace(":", "")) : 0
        const timeB = b.startTime ? parseInt(b.startTime.replace(":", "")) : 0
        return timeA - timeB
      })

    return NextResponse.json({
      date,
      bookings,
      total: bookings.length,
    })
  } catch (error) {
    console.error("Admin Bookings API Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    )
  }
}

function calculateDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0

  const [startHour, startMin] = startTime.split(":").map(Number)
  const [endHour, endMin] = endTime.split(":").map(Number)

  let start = startHour * 60 + startMin
  let end = endHour * 60 + endMin

  // Handle overnight bookings
  if (end <= start) {
    end += 24 * 60 // Add 24 hours
  }

  return end - start
}
