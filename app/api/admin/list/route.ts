import { NextRequest, NextResponse } from "next/server"
import { siteConfig } from "@/config/site-config"

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${siteConfig.api.baseURL}/admin`, {
      method: "GET",
      headers: {
        apikey: `${process.env.API_KEY}`,
        "Content-Type": "application/json"
      }
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { success: false, message: text || "Invalid response from server" },
        { status: res.status }
      )
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching admins:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch admins" },
      { status: 500 }
    )
  }
}
