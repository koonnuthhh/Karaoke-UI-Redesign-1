import { type NextRequest, NextResponse } from "next/server"
import type { BookingRequest } from "../../../types"
import { siteConfig } from "config/site-config";
import { timeStamp } from "console";
import { Phone } from "lucide-react";

export async function POST(request: NextRequest) {
  try {
    const booking: BookingRequest = await request.json()

    // Validate booking data
    if (!booking.roomId || !booking.date) {
      return NextResponse.json({ success: false, message: "Missing required booking information" }, { status: 400 })
    }

    // const USER = await fetch(`${process.env.API_PATH}/user/`, {
    //   method: 'POST',
    //   headers: {
    //     apikey: `${process.env.API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     timestamp: new Date().toISOString(),
    //     data: {
    //       username: booking.customerName,
    //       email: booking.customerEmail,
    //       phone: booking.customerPhone,
    //       is_guest: true,
    //     }
    //   })
    // })
    // const user = await USER.json()

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
    // console.log("booking: ", booking)
    const response = await fetch(`${process.env.API_PATH}/booking`, {
      method: 'POST',
      headers: {
        apikey: `${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        data: {
          // user_id: user.data.user_id,
          username: booking.customerName,
          phone: booking.customerPhone,
          room_id: booking.roomId,
          start_time: booking.timeSlots[0],
          end_time: booking.timeSlots[1],
          status: "pending",
          date: booking.date,
          price: booking.totalPrice,
          ...(booking.bookedByAdminId && { booked_by_admin_id: booking.bookedByAdminId }),
          ...(booking.bookedByAdminName && { booked_by_admin_name: booking.bookedByAdminName }),
        }
      })
    });
    const result = await response.json();
    // console.log("Booking API Response:", result);
    return NextResponse.json(result)

  } catch (error) {
    console.error("Booking API Error:", error)
    return NextResponse.json({ success: false, message: `Failed to create booking : ${error}` }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const bookingstatus = await request.json()
    const { booking_id, booking_status, ...editableFields } = bookingstatus

    // Forward any editable fields as-is (room_id, username, phone, start_time, end_time,
    // price, promotion_id, ...) alongside the status mapping, so admin edits aren't
    // silently dropped by an allowlist here.
    const data: any = { ...editableFields }
    if (booking_status) {
      data.status = booking_status
    }

    const response = await fetch(`${process.env.API_PATH}/booking/${booking_id}`, {
      method: 'PUT',
      headers: {
        apikey: `${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        data
      })
    });
    const result = await response.json();

    return NextResponse.json(result)

  } catch (error) {
    console.error("Booking API Error:", error)
    return NextResponse.json({ success: false, message: `Failed to Update booking : ${error}` }, { status: 500 })
  }
}
