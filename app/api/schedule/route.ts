import { type NextRequest, NextResponse } from "next/server"
import { siteConfig } from "../../../config/site-config"
import { generateTimeSlots } from "../../../lib/time-utils"

// Mock data - replace with actual API calls
const generateMockSchedule = (date: string) => {
  const timeSlots = generateTimeSlots(
    siteConfig.schedule.openTime,
    siteConfig.schedule.closeTime,
    siteConfig.schedule.slotDuration,
  )

  const bookings = siteConfig.rooms.flatMap((room) =>
    timeSlots.map((time, index) => {
      const nextSlot = timeSlots[index + 1]
      const endTime = nextSlot || "03:30"
      const randomstatus = Math.random()
      return {
        id: `${room.id}-${date}-${time}`,
        roomId: room.id,
        date,
        startTime: time,
        endTime,
        isAvailable: randomstatus >= 0.2,
        isBooked: randomstatus < 0.2,
        customerName: Math.random() > 0.8 ? "John Doe" : undefined,
        price: room.hourlyRate / 2, // Half price for 30-minute slots
        duration: siteConfig.schedule.slotDuration,
      }
    }),
  )

  return {
    date,
    timeSlots,
    rooms: siteConfig.rooms,
    bookings,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    const mockData = generateMockSchedule(date)

    return NextResponse.json(mockData)
  } catch (error) {
    console.error("Schedule API Error:", error)
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 })
  }
}
