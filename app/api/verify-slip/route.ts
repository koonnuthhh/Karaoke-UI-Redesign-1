import { NextResponse } from "next/server";

interface SlipVerificationResult {
  success: boolean;
  amount: number;
  timestamp: string;
  message: string;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const bookingId = formData.get("bookingId")?.toString();
    const expectedAmount = Number(formData.get("expectedAmount"));
    const slipFile = formData.get("slipFile");

    if (!(slipFile instanceof File)) {
      // It's not a file
      return NextResponse.json({ success: false, message: "Slip file is not a valid file" }, { status: 400 });
    }


    if (!slipFile || !bookingId || !expectedAmount) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Optional: wait 45 seconds
    await new Promise((r) => setTimeout(r, 45000));

    // Send slip image to verification API
    const uploadForm = new FormData();
    uploadForm.append("file", slipFile as File);

    const verificationResponse = await fetch(
      `${process.env.SLIP_VERIFY_API_URL}/api/verify-slip/qr-image/info`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SLIP_VERIFY_SECRET_KEY}`,
        },
        body: uploadForm,
      }
    );

    const verificationData = await verificationResponse.json();
    // Optional: log file details for debugging
    // console.log("Slip file type:", slipFile.type);
    // console.log("Slip file size (bytes):", slipFile.size);
    // console.log(verificationData)
    const dateTime = new Date(verificationData.data.dateTime);
    const now = new Date();

    const isWithinTodayOrTomorrow =dateTime >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && dateTime < new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);


    const isVerified =
      verificationData.code === "200000" &&
      Number(verificationData.data.amount) === expectedAmount &&
isWithinTodayOrTomorrow

    if (isVerified) {
      const result: SlipVerificationResult = {
        success: true,
        amount: expectedAmount,
        timestamp: new Date().toISOString(),
        message: "Payment verified successfully",
      };
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Could not verify payment. Please wait 1-2 minutes and try again.",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Slip verification error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error during verification" },
      { status: 500 }
    );
  }
}