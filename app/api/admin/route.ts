import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const username = req.headers.get("username")
  const password = req.headers.get("password")

  if (username === "admin" && password === "karaoke2024") {
    return NextResponse.json({ success: true, credential : process.env.ADMIN_CREDENTIAL })
  }

  return NextResponse.json(
    { success: false, message: "Invalid credentials" },
    { status: 401 }
  )
}