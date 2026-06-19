import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: "startDate and endDate query parameters are required" },
        { status: 400 }
      )
    }

    // Fetch rooms data
    const roomsResponse = await fetch(
      `${process.env.API_PATH}/admin/rooms`,
      {
        method: "GET",
        headers: {
          apikey: `${process.env.API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    )

    const roomsData = roomsResponse.ok ? await roomsResponse.json() : {}
    const rooms = roomsData.data || []
    const roomMap = new Map(rooms.map((room: any) => [room.room_id, room.room_name]))

    // Call the backend API for bookings
    const response = await fetch(
      `${process.env.API_PATH}/booking/range?startDate=${startDate}&endDate=${endDate}`,
      {
        method: "GET",
        headers: {
          apikey: `${process.env.API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      console.error("Backend API error:", response.status, response.statusText)
      return NextResponse.json(
        { message: "Failed to fetch bookings for given date range" },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Enrich bookings with room names
    if (data.data && Array.isArray(data.data)) {
      data.data = data.data.map((booking: any) => ({
        ...booking,
        room_name: roomMap.get(booking.room_id) || "Unknown Room",
      }))
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("Booking Range API Error:", error)
    return NextResponse.json(
      { message: "Failed to fetch bookings for given date range" },
      { status: 500 }
    )
  }
}
