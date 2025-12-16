import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const credential = req.headers.get("credential")

    if (!credential) {
      return NextResponse.json(
        { success: false, message: "No credential provided" },
        { status: 400 }
      )
    }

    // Validate that the credential matches the expected one
    const expectedCredential = process.env.ADMIN_CREDENTIAL

    if (credential === expectedCredential) {
      return NextResponse.json({
        success: true,
        message: "Credential is valid",
      })
    }

    return NextResponse.json(
      { success: false, message: "Invalid credential" },
      { status: 401 }
    )
  } catch (error) {
    console.error("Credential validation error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
