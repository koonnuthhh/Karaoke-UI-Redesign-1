import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Call backend API to get all active promotions
    const response = await fetch(`${process.env.API_PATH}/promotions`, {
      method: "GET",
      headers: {
        "apikey": `${process.env.API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: result.error?.message || result.message || "Failed to fetch promotions",
          },
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
    })
  } catch (error: any) {
    console.error("Promotions Fetch Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Failed to fetch promotions" },
      },
      { status: 500 }
    )
  }
}
