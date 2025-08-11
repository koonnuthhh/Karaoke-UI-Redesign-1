import { type NextRequest, NextResponse } from "next/server"
import type { BookingRequest } from "../../../types"
import { siteConfig } from "config/site-config";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("userId")
    const admincredential = request.headers.get("credential")
    //console.log(userId)
    if (admincredential !== process.env.ADMIN_CREDENTIAL) {
      return NextResponse.json(
        { success: false, message: "Invalid admin credential" },
        { status: 401 }
      )
    }
    const response = await fetch(`${process.env.API_PATH}/user/${userId}`, {
      method: 'GET',
      headers: {
        apikey: `${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
    });
    const result = await response.json();

    return NextResponse.json(result)

  } catch (error) {
    console.error("Booking API Error:", error)
    return NextResponse.json({ success: false, message: `Failed to get user data : ${error}` }, { status: 500 })
  }
}