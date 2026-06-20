import { NextRequest, NextResponse } from "next/server"
import { siteConfig } from "@/config/site-config"

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${siteConfig.api.baseURL}/admin/rooms`, {
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
    console.error("Error fetching rooms:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch rooms" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Check if body is already wrapped with "data" property (from our makeAdminRequest)
    // If so, pass it as is. Otherwise, wrap it.
    const requestBody = body.data ? body : { data: body }
    
    const res = await fetch(`${siteConfig.api.baseURL}/admin/rooms`, {
      method: "POST",
      headers: {
        apikey: `${process.env.API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
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
    console.error("Error creating room:", error)
    return NextResponse.json(
      { success: false, message: "Failed to create room" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const url = new URL(req.url)
    
    // Extract ID from path /api/admin/rooms/[id] or query parameter ?id=
    const pathParts = url.pathname.split('/')
    let id = pathParts[pathParts.length - 1]
    
    if (!id || id === 'api' || id === 'admin' || id === 'rooms') {
      id = url.searchParams.get("id")
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      )
    }

    // Check if body is already wrapped with "data" property
    const requestBody = body.data ? body : { data: body }

    const res = await fetch(`${siteConfig.api.baseURL}/admin/rooms/${id}`, {
      method: "PUT",
      headers: {
        apikey: `${process.env.API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
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
    console.error("Error updating room:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update room" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const url = new URL(req.url)
    
    // Extract ID from path /api/admin/rooms/[id] or query parameter ?id=
    const pathParts = url.pathname.split('/')
    let id = pathParts[pathParts.length - 1]
    
    if (!id || id === 'api' || id === 'admin' || id === 'rooms') {
      id = url.searchParams.get("id")
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      )
    }

    // Check if body is already wrapped with "data" property
    const requestBody = body.data ? body : { data: body }

    const res = await fetch(`${siteConfig.api.baseURL}/admin/rooms/${id}`, {
      method: "DELETE",
      headers: {
        apikey: `${process.env.API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      if (!res.ok) {
        return NextResponse.json(
          { success: false, message: text || "Failed to delete room" },
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
    console.error("Error deleting room:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete room" },
      { status: 500 }
    )
  }
}
