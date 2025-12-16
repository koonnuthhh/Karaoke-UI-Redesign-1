import { NextRequest, NextResponse } from "next/server"
import { siteConfig } from "@/config/site-config"

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${siteConfig.api.baseURL}/admin/promotions`, {
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
    console.error("Error fetching promotions:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch promotions" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${siteConfig.api.baseURL}/admin/promotions`, {
      method: "POST",
      headers: {
        apikey: `${process.env.API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating promotion:", error)
    return NextResponse.json(
      { success: false, message: "Failed to create promotion" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body
    const res = await fetch(`${siteConfig.api.baseURL}/admin/promotions/${id}`, {
      method: "PUT",
      headers: {
        apikey: `${process.env.API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating promotion:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update promotion" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    const res = await fetch(`${siteConfig.api.baseURL}/admin/promotions/${id}`, {
      method: "DELETE",
      headers: {
        apikey: `${process.env.API_KEY}`,
        "Content-Type": "application/json"
      }
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error deleting promotion:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete promotion" },
      { status: 500 }
    )
  }
}
