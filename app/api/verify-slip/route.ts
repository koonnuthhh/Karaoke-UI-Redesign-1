import { type NextRequest, NextResponse } from "next/server"

interface SlipVerificationResult {
  success: boolean
  amount: number
  timestamp: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const qrData = await request.json()
    const slip = qrData.decodedQR
    const bookingId = qrData.bookingId
    const expectedAmount = qrData.expectedAmount

    if (!slip || !bookingId || !expectedAmount) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    // In production, replace with actual slip verification API
    // Example: Thai QR Payment slip verification service
    const verificationResponse = await fetch(`${process.env.SLIP_VERIFY_API_URL}/api/verify-slip/qr-code/info`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLIP_VERIFY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payload: {
          qrCode: slip, // this should be the decoded string from QR
          // checkCondition: {
          //   // checkDuplicate : true
          //   checkReceiver: [{
          //     accountType: "01002",
          //     accountNameTH: "กฤตภาส เฉลิมพงษ์"
          //   }],
          //   checkAmount: {
          //     type: "eq", // eq, gte, lte
          //     amount: expectedAmount
          //   },
          // }
        }
      }),
    })

    const verificationData = await verificationResponse.json()
    //console.log("verificationData: ", verificationData)

    let isVerified
    // console.log("verificationData.code === 200000: ",verificationData.code === "200000")
    // console.log("verificationData.data.amount === expectedAmount: ",verificationData.data.amount === expectedAmount)
    // console.log("verificationData.code === 200000 && verificationData.data.amount === expectedAmount: ", verificationData.code === "200000" && verificationData.data.amount === expectedAmount)

    // const verificationData.data.dateTime
    if(verificationData.code === "200000" && verificationData.data.amount === expectedAmount){
      isVerified = true
    } else {
      isVerified = false
    }
    

    if (isVerified) {
      const result: SlipVerificationResult = {
        success: true,
        amount: expectedAmount,
        timestamp: new Date().toISOString(),
        message: "Payment verified successfully",
      }

      // In production, update booking status in database
      // await updateBookingStatus(bookingId, 'confirmed', result.transactionId);

      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Could not verify payment. Please wait 1-2 minutes and try again.",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Slip verification error:", error)
    return NextResponse.json({ success: false, message: "Internal server error during verification" }, { status: 500 })
  }
}
