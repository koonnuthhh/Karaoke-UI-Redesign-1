import { type NextRequest, NextResponse } from "next/server"
import type { BookingRequest } from "../../../types"
import { siteConfig } from "config/site-config";
import { timeStamp } from "console";

export async function POST(request: NextRequest) {
  try {
    const booking: BookingRequest = await request.json()

    // Validate booking data
    if (!booking.roomId || !booking.date) {
      return NextResponse.json({ success: false, message: "Missing required booking information" }, { status: 400 })
    }

    const USER = await fetch(`${process.env.API_PATH}/user/`, {
      method: 'POST',
      headers: {
        apikey: `${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        data: {
          username: booking.customerName,
          email: booking.customerEmail,
          phone: booking.customerPhone,
          is_guest: true,
        }
      })
    })
    const user = await USER.json()

    // console.log("data: ", JSON.stringify({
    //     timestamp: new Date().toISOString(),
    //     data: {
    //       username: booking.customerName,
    //       email: booking.customerEmail,
    //       phone: booking.customerPhone,
    //       password: null,
    //       is_guest: true,
    //     }
    //   }))

    const response = await fetch(`${process.env.API_PATH}/booking`, {
      method: 'POST',
      headers: {
        apikey: `${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        data: {
          user_id: user.data.user_id,
          room_id: booking.roomId,
          start_time: booking.timeSlots[0],
          end_time: booking.timeSlots[1],
          status: "pending",
          date: booking.date
        }
      })
    });
    const result = await response.json();

    return NextResponse.json(result)

  } catch (error) {
    console.error("Booking API Error:", error)
    return NextResponse.json({ success: false, message: `Failed to create booking : ${error}` }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const bookingstatus = await request.json()
    // console.log("bookingstatus.booking_status: ",bookingstatus.booking_status)
    // console.log("bookingstatus.booking_id: ",bookingstatus.booking_id)

    const response = await fetch(`${process.env.API_PATH}/booking/${bookingstatus.booking_id}`, {
      method: 'PUT',
      headers: {
        apikey: `${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        data: {
          status: bookingstatus.booking_status,
        }
      })
    });
    const result = await response.json();

    return NextResponse.json(result)

  } catch (error) {
    console.error("Booking API Error:", error)
    return NextResponse.json({ success: false, message: `Failed to Update booking : ${error}` }, { status: 500 })
  }
}
