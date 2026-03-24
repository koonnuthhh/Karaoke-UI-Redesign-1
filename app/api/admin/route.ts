import { NextResponse } from "next/server"
import { siteConfig } from "@/config/site-config"

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

// POST - Create admin
export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Check if body is already wrapped with "data" property
    const requestBody = body.data ? body : { data: body }
    
    const res = await fetch(`${siteConfig.api.baseURL}/admin`, {
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
    console.error("Error creating admin:", error)
    return NextResponse.json(
      { success: false, message: "Failed to create admin" },
      { status: 500 }
    )
  }
}

// PUT - Update admin
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const url = new URL(req.url)
    
    // Extract ID from path /api/admin/[id] or query parameter ?id=
    const pathParts = url.pathname.split('/')
    let id = pathParts[pathParts.length - 1]
    
    if (!id || id === 'api' || id === 'admin') {
      id = url.searchParams.get("id")
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      )
    }

    // Extract the actual data and admin_id from request
    const updateData = body.data || body
    const adminId = updateData.admin_id
    
    // Create clean request body with only the necessary fields
    const requestBody = {
      data: {
        ...updateData,
        admin_id: adminId
      }
    }

    const res = await fetch(`${siteConfig.api.baseURL}/admin/${id}`, {
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
    console.error("Error updating admin:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update admin" },
      { status: 500 }
    )
  }
}

// DELETE - Delete admin
export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const url = new URL(req.url)
    
    // Extract ID from path /api/admin/[id] or query parameter ?id=
    const pathParts = url.pathname.split('/')
    console.log("DELETE route.ts - Full URL:", req.url)
    console.log("DELETE route.ts - Pathname:", url.pathname)
    console.log("DELETE route.ts - Path parts:", pathParts)
    let id = pathParts[pathParts.length - 1]
    console.log("DELETE route.ts - ID from last part:", id)
    
    if (!id || id === 'api' || id === 'admin') {
      id = url.searchParams.get("id")
      console.log("DELETE route.ts - ID from query params:", id)
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      )
    }

    // Extract admin_id from request body and send only that
    const adminId = body.data?.admin_id
    const requestBody = {
      data: {
        admin_id: adminId
      }
    }

    const res = await fetch(`${siteConfig.api.baseURL}/admin/${id}`, {
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