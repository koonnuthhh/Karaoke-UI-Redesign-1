import { type NextRequest, NextResponse } from "next/server"

interface SlipVerificationResult {
  success: boolean
  amount: number
  timestamp: string
  transactionId: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const slip = formData.get("slip") as File
    const bookingId = formData.get("bookingId") as string
    const expectedAmount = Number.parseFloat(formData.get("expectedAmount") as string)

    if (!slip || !bookingId || !expectedAmount) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    // Validate file type
    if (!slip.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "Invalid file type. Please upload an image." },
        { status: 400 },
      )
    }

    // Convert file to base64 for API call
    const bytes = await slip.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString("base64")

    // In production, replace with actual slip verification API
    // Example: Thai QR Payment slip verification service
    // const verificationResponse = await fetch('https://api.slipverify.com/verify', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.SLIP_VERIFY_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     image: base64Image,
    //     expectedAmount: expectedAmount
    //   })
    // });

    // Mock verification logic for demo
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate API delay

    // Mock successful verification (90% success rate for demo)
    const isVerified = Math.random() > 0.1

    if (isVerified) {
      const result: SlipVerificationResult = {
        success: true,
        amount: expectedAmount,
        timestamp: new Date().toISOString(),
        transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        message: "Payment verified successfully",
      }

      // In production, update booking status in database
      // await updateBookingStatus(bookingId, 'confirmed', result.transactionId);

      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Could not verify payment. Please check your slip and try again.",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Slip verification error:", error)
    return NextResponse.json({ success: false, message: "Internal server error during verification" }, { status: 500 })
  }
}
