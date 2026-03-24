import { type NextRequest, NextResponse } from "next/server"

interface ApplyPromoRequest {
  data: {
    code: string
    total_price: number
  }
}

interface DiscountResponse {
  success: boolean
  data?: {
    original_price: number
    discount_amount: number
    final_price: number
    type?: string
    message?: string
    promotion_id?: string
  }
  error?: {
    message: string
  }
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ApplyPromoRequest = await request.json()
    const { code, total_price } = body.data || {}

    if (!code || !code.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Promotion code is required" },
        },
        { status: 400 }
      )
    }

    if (!total_price || total_price <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Valid total price is required" },
        },
        { status: 400 }
      )
    }

    // Call backend API to apply the promotion code
    const backendUrl = `${process.env.API_PATH}/user/promotions/apply`
    const trimmedCode = code.toUpperCase().trim()
    
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "apikey": `${process.env.API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          code: trimmedCode,
          total_price,
        },
      }),
    })

    const text = await response.text()
    
    let result: DiscountResponse
    
    try {
      result = JSON.parse(text)
    } catch {
      // If response is not JSON, return error with the text
      console.error("Failed to parse response as JSON:", text)
      return NextResponse.json(
        {
          success: false,
          error: {
            message: text || "Invalid response from promotion service",
          },
        },
        { status: response.status }
      )
    }

    // Check result.success first, regardless of HTTP status
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Promotion code is invalid",
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
            message: result.error?.message || result.message || "Failed to apply promotion code",
          },
        },
        { status: response.status }
      )
    }

    // If result has the discount data, return it
    if (result.success && result.data) {
      console.log("Returning success with discount data")
      
      // Pass through the type field to determine percentage display
      const responseData: any = {
        original_price: result.data.original_price,
        discount_amount: result.data.discount_amount,
        final_price: result.data.final_price,
        message: result.data.message || "Promotion applied successfully",
      }
      
      // Include type if provided by backend
      if (result.data.type) {
        responseData.type = result.data.type
      }
      
      // Include promotion_id if provided by backend
      if (result.data.promotion_id) {
        responseData.promotion_id = result.data.promotion_id
      }
      
      return NextResponse.json({
        success: true,
        data: responseData,
      })
    }

    console.error("Unexpected response structure:", { success: result.success, hasData: !!result.data, result })
    return NextResponse.json(
      {
        success: false,
        error: { message: "Invalid promotion response" },
      },
      { status: 500 }
    )
  } catch (error: any) {
    console.error("Promotion Apply Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Failed to apply promotion code" },
      },
      { status: 500 }
    )
  }
}
