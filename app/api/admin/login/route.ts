import { NextResponse } from "next/server"
import type { AdminUser } from "@/types"

/**
 * POST /api/admin/login
 * Admin login endpoint
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { data } = body

    if (!data || !data.username || !data.password) {
      return NextResponse.json(
        { success: false, error: { message: "Username and password required" } },
        { status: 400 }
      )
    }

    const { username, password } = data

    // TODO: Replace with actual backend authentication
    // This is a placeholder - integrate with your actual admin authentication backend
    
    // Example: Call your actual backend API
    const backendURL = process.env.API_PATH || process.env.NEXT_PUBLIC_API_PATH || "http://localhost:3000"
    
    try {
      const response = await fetch(`${backendURL}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "",
        },
        body: JSON.stringify({
          data: {
            username,
            password,
          },
        }),
      })

      const responseData = await response.json()

      if (!response.ok || !responseData.success) {
        return NextResponse.json(
          {
            success: false,
            error: responseData.error || { message: "Invalid username or password" },
          },
          { status: 401 }
        )
      }

      // Return success with admin user data
      return NextResponse.json({
        success: true,
        data: {
          admin_id: responseData.data.admin_id,
          username: responseData.data.username,
          email: responseData.data.email,
          role: responseData.data.role,
          login_time: new Date().toISOString(),
        },
      })
    } catch (backendError) {
      console.error("Backend login error:", backendError)
      
      // Fallback for demo/default credentials
      if (username === "admin" && password === "karaoke2024") {
        const adminUser: AdminUser = {
          admin_id: "demo-admin-001",
          username: "admin",
          email: "admin@alurfia.com",
          role: "admin",
          login_time: new Date().toISOString(),
        }
        
        return NextResponse.json({
          success: true,
          data: adminUser,
        })
      }

      return NextResponse.json(
        { success: false, error: { message: "Login service unavailable" } },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error("Login endpoint error:", error)
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    )
  }
}
