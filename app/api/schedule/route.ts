import { type NextRequest, NextResponse } from "next/server"
import { siteConfig } from "../../../config/site-config"
import { generateTimeSlots } from "../../../lib/time-utils"
import { ApiKeyConfig } from "config/apiKey.config"
import { Room, TimeSlot } from "types"

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  const total = h * 60 + m

  // แปลงเวลาปิดจาก siteConfig เป็นนาที
  const closeTimeMinutes = (() => {
    const [ch, cm] = siteConfig.schedule.closeTime.split(":").map(Number)
    return ch * 60 + cm
  })()

  // ถ้าเวลาน้อยกว่าหรือเท่ากับเวลาปิด แปลว่าเป็นของวันถัดไป → บวก 1440 นาที
  if (total <= closeTimeMinutes) return total + 1440

  return total
}
function getBookingRange(booking: any) {
  const start = timeToMinutes(booking.start_time?.slice(0, 5))
  let end = timeToMinutes(booking.end_time?.slice(0, 5))

  // If end is less than start, assume it's next day
  if (end <= start) end += 1440 // +24 hours
  //console.log("Booking range:", start, end)
  return { start, end }
}

const APIKEY = ApiKeyConfig.API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    const responseroomdata = await fetch(
      `${process.env.API_PATH}/admin/rooms`,
      {
        method: "GET",
        headers: {
          APIKEY: APIKEY,
          "Content-Type": "application/json",
        },
      },
    )
    const rawResponseroomdata = await responseroomdata.json()
    //console.log("rawResponseroomdata : ", rawResponseroomdata)
    const roomData = rawResponseroomdata.data || []
    console.log("Fetched Rooms:", roomData.length)
    //console.log("Fetched RoomID:", roomData.room_id)
    const responsebooked = await fetch(
      `${process.env.API_PATH}/booking/date/${date}`,
      {
        method: "GET",
        headers: {
          APIKEY: APIKEY,
          "Content-Type": "application/json",
        },
      },
    )

    const rawResponsebooked = await responsebooked.json()
    const rawData = rawResponsebooked.data || []
    console.log("Fetched bookings:", rawData.length)
    //console.log(rawData)


    const timeSlots = generateTimeSlots(
      siteConfig.schedule.openTime,
      siteConfig.schedule.closeTime,
      siteConfig.schedule.slotDuration,
    )

    const bookings = roomData.flatMap((room : Room) =>
      timeSlots.map((time, index) => {
        const nextSlot = timeSlots[index + 1]
        const endTime = nextSlot || siteConfig.schedule.closeTime

        const slotStart = timeToMinutes(time)
        let slotEnd = timeToMinutes(endTime)
        if (slotEnd <= slotStart) slotEnd += 1440 // Handle overnight slots too

        const realBooking = rawData.find((b: any) => {
          //console.log("b-id:", b.room_id, "room.id:", room.id, "date:", date, "time:", time)
          // Calculate date+1
          const datePlusOne = new Date(date)
          datePlusOne.setDate(datePlusOne.getDate() + 1)
          const nextDate = datePlusOne.toISOString().split("T")[0]

          // Skip if room ID doesn't match
          if (b.room_id !== room.room_id) return false

          //Skip if the status is cancelled
          if (b.status === "cancelled") return false

          // Skip if booking is not from current date or next date
          //console.log("Booking date:", b.date, "Current date:", date, "Next date:", nextDate);

          if (b.date !== date && b.date !== nextDate) {
            console.log("Skipping booking due to mismatched date:", b.date);
            return false;
          }

          // If it's from nextDate (e.g., 2025-08-02),
          // only allow it if time is after closeTime
          const { start: bookingStart, end: bookingEnd } = getBookingRange(b)
          if (
            b.date === nextDate &&
            slotStart <= timeToMinutes(siteConfig.schedule.closeTime)
          ) {
            //console.log("Booking start:", bookingStart, "Slot end:", slotEnd);
            return false
          }


          // console.log("Booking start:", bookingStart, "Slot end:", slotEnd);
          // console.log("Booking end:", bookingEnd, "Slot start:", slotStart);
          return bookingStart < slotEnd && bookingEnd > slotStart;
        })

        const status = realBooking?.status ?? "available"

        return {
          id: realBooking?.booking_id || `${room.room_id}-${date}-${time}`,
          roomId: room.room_id,
          roomName: room.room_name,
          date,
          bookingStart: realBooking?.start_time,
          bookingEnd: realBooking?.end_time,
          startTime: time,
          status: status,
          customerName: undefined,
          customerID: realBooking?.user_id,
          price: realBooking?.price ?? room.price_per_half_hour,
          duration: siteConfig.schedule.slotDuration,
        } as TimeSlot
      }),
    )

    const formatted = {
      date,
      timeSlots,
      rooms: roomData,
      bookings,
    }
    //console.log("Formatted schedule data:", formatted)
    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Schedule API Error:", error)
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 })
  }
}
