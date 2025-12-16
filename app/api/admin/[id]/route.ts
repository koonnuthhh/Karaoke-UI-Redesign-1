import { NextRequest, NextResponse } from "next/server"
import { siteConfig } from "@/config/site-config"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    const res = await fetch(`${siteConfig.api.baseURL}/admin/${id}`, {
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
    console.error("Error fetching admin:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch admin" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const id = params.id

    const res = await fetch(`${siteConfig.api.baseURL}/admin/${id}`, {
      method: "PUT",
      headers: {
        apikey: `${process.env.API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
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
    console.error("Error updating admin:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update admin" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const id = params.id

    const res = await fetch(`${siteConfig.api.baseURL}/admin/${id}`, {
      method: "DELETE",
      headers: {
        apikey: `${process.env.API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      if (!res.ok) {
        return NextResponse.json(
          { success: false, message: text || "Failed to delete admin" },
          { status: res.status }
        )
      }
      return NextResponse.json({ success: true })
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error deleting admin:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete admin" },
      { status: 500 }
    )
  }
}
