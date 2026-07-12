import { type NextRequest, NextResponse } from "next/server"

interface ValidatePromoRequest {
  data: {
    code: string
    roomId?: string
    date?: string
    time?: string
    endTime?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidatePromoRequest = await request.json()
    const { code, roomId, date, time, endTime } = body.data || {}

    if (!code || !code.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Promotion code is required" },
        },
        { status: 400 }
      )
    }

    // Call backend API to validate the promotion code
    const requestData: any = {
      code: code.toUpperCase().trim(),
    }

    // Include roomId if provided (for room-specific promotions)
    if (roomId) {
      requestData.roomId = roomId
    }

    // Check promotion validity against the date/time being booked, not right now
    if (date) {
      requestData.date = date
    }
    if (time) {
      requestData.time = time
    }
    if (endTime) {
      requestData.endTime = endTime
    }

    const response = await fetch(`${process.env.API_PATH}/user/promotions/validate`, {
      method: "POST",
      headers: {
        "apikey": `${process.env.API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: requestData,
      }),
    })

    const result = await response.json()

    // Check result.success first, regardless of HTTP status
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: result.error?.message || "Promotion code is invalid",
          },
        },
        { status: 400 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: result.error?.message || result.message || "Failed to validate promotion code",
          },
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        message: result.data?.message || "Promotion code is valid",
      },
    })
  } catch (error: any) {
    console.error("Promotion Validate Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Failed to validate promotion code" },
      },
      { status: 500 }
    )
  }
}
