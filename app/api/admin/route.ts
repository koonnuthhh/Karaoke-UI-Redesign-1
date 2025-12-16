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
    const res = await fetch(`${siteConfig.api.baseURL}/admin`, {
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
    const { id } = body
    const res = await fetch(`${siteConfig.api.baseURL}/admin/:${id}`, {
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
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    const res = await fetch(`${siteConfig.api.baseURL}/admin/${id}`, {
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
    console.error("Error deleting admin:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete admin" },
      { status: 500 }
    )
  }
}